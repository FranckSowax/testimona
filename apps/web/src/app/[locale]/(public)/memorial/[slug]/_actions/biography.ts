'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { canManageMemorial } from '@/lib/memorial/access';

export interface ChapterActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export interface ChapterMedia {
  url: string;
  type: 'image' | 'video';
}

const MAX_CHAPTER_MEDIA = 10;
const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_MIME = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_MEDIA_BYTES = 60 * 1024 * 1024; // 60 MB (covers short clips)

/**
 * Upload chapter photos/videos to the memorial-photos bucket under a
 * chapters/<chapterId>/ prefix and return the persisted { url, type } list.
 * Invalid or oversized files are skipped rather than failing the whole submit.
 */
async function uploadChapterMedia(
  chapterId: string,
  files: File[],
): Promise<ChapterMedia[]> {
  const adminDb = getSupabaseAdminClient();
  const out: ChapterMedia[] = [];
  for (const file of files.slice(0, MAX_CHAPTER_MEDIA)) {
    if (!(file instanceof File) || file.size === 0 || file.size > MAX_MEDIA_BYTES) continue;
    const isImage = IMAGE_MIME.includes(file.type);
    const isVideo = VIDEO_MIME.includes(file.type);
    if (!isImage && !isVideo) continue;
    const ext =
      file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') ||
      (isImage ? 'jpg' : 'mp4');
    const path = `chapters/${chapterId}/${randomUUID()}.${ext}`;
    const { error } = await adminDb.storage
      .from('memorial-photos')
      .upload(path, file, { contentType: file.type, upsert: true });
    if (error) continue;
    const { data } = adminDb.storage.from('memorial-photos').getPublicUrl(path);
    out.push({ url: data.publicUrl, type: isImage ? 'image' : 'video' });
  }
  return out;
}

function readMediaFiles(formData: FormData): File[] {
  return formData.getAll('media').filter((f): f is File => f instanceof File);
}

interface BiographyRow {
  id: string;
}

interface ChapterPositionRow {
  position: number;
}

/**
 * Resolves the memorial manager (auth-gated). Returns null if the current
 * user is not authenticated OR can't manage memorialId (owner or accepted
 * co-owner, G3). Used by every chapter-mutating action below.
 */
async function ensureOwner(memorialId: string): Promise<string | null> {
  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  if (!(await canManageMemorial(memorialId, userData.user.id))) return null;
  return userData.user.id;
}

/**
 * IDOR guard: verify that `chapterId` belongs to `memorialId`'s biography.
 * ensureOwner() only proves the caller owns the memorial they CLAIMED — without
 * this check, an owner of any memorial could pass their own memorialId together
 * with a chapter id from someone else's biography and mutate it through the
 * admin client. Returns the biography id on success, null otherwise.
 */
async function ensureChapterInMemorial(
  memorialId: string,
  chapterId: string,
): Promise<string | null> {
  const adminDb = getSupabaseAdminClient();
  const { data: bio } = await adminDb
    .from('Biography')
    .select('id')
    .eq('memorialId', memorialId)
    .maybeSingle<BiographyRow>();
  if (!bio) return null;
  const { data: chapter } = await adminDb
    .from('Chapter')
    .select('id')
    .eq('id', chapterId)
    .eq('biographyId', bio.id)
    .maybeSingle<{ id: string }>();
  return chapter ? bio.id : null;
}

async function ensureBiography(memorialId: string): Promise<string | null> {
  const adminDb = getSupabaseAdminClient();
  const { data: existing } = await adminDb
    .from('Biography')
    .select('id')
    .eq('memorialId', memorialId)
    .maybeSingle<BiographyRow>();
  if (existing) return existing.id;

  // Defensive: explicit id even though the V11 migration adds a default.
  const newId = randomUUID();
  const { error } = await adminDb
    .from('Biography')
    .insert({ id: newId, memorialId });
  if (error) return null;
  return newId;
}

/**
 * Create a new biography chapter for the current owner. Auto-creates
 * the parent Biography row if it doesn't exist yet.
 */
export async function createChapterAction(
  _prev: ChapterActionState | null,
  formData: FormData,
): Promise<ChapterActionState> {
  const memorialId = String(formData.get('memorialId') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim().slice(0, 200);
  const content = String(formData.get('content') ?? '').trim().slice(0, 5000);

  if (!memorialId) return { error: 'memorialId requis.' };
  if (!title)
    return { error: 'Validation', fieldErrors: { title: 'Titre requis.' } };

  const userId = await ensureOwner(memorialId);
  if (!userId) return { error: 'Action réservée au propriétaire du mémorial.' };

  const biographyId = await ensureBiography(memorialId);
  if (!biographyId) return { error: 'Échec création biographie.' };

  const adminDb = getSupabaseAdminClient();
  const { data: lastPos } = await adminDb
    .from('Chapter')
    .select('position')
    .eq('biographyId', biographyId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle<ChapterPositionRow>();
  const nextPosition = (lastPos?.position ?? -1) + 1;

  const chapterId = randomUUID();
  const media = await uploadChapterMedia(chapterId, readMediaFiles(formData));

  const { error } = await adminDb.from('Chapter').insert({
    id: chapterId,
    biographyId,
    title,
    content,
    position: nextPosition,
    media,
  });
  if (error) return { error: error.message };

  if (slug) revalidatePath(`/memorial/${slug}`);
  return { ok: true };
}

/**
 * Edit a chapter's title or content in place.
 */
export async function updateChapterAction(
  _prev: ChapterActionState | null,
  formData: FormData,
): Promise<ChapterActionState> {
  const id = String(formData.get('id') ?? '').trim();
  const memorialId = String(formData.get('memorialId') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  const title = String(formData.get('title') ?? '').trim().slice(0, 200);
  const content = String(formData.get('content') ?? '').trim().slice(0, 5000);

  if (!id) return { error: 'id requis.' };
  if (!memorialId) return { error: 'memorialId requis.' };
  if (!title)
    return { error: 'Validation', fieldErrors: { title: 'Titre requis.' } };

  const userId = await ensureOwner(memorialId);
  if (!userId) return { error: 'Action réservée au propriétaire du mémorial.' };

  if (!(await ensureChapterInMemorial(memorialId, id)))
    return { error: 'Chapitre introuvable dans ce mémorial.' };

  const adminDb = getSupabaseAdminClient();

  const newFiles = readMediaFiles(formData);
  const update: { title: string; content: string; media?: ChapterMedia[] } = {
    title,
    content,
  };

  // `existingMedia` (JSON) is the set of already-uploaded items the editor
  // chose to KEEP — its presence means the client is managing the full media
  // list (view/remove existing + add new). Without it, we fall back to
  // appending new uploads to whatever the chapter already has.
  const existingRaw = formData.get('existingMedia');
  let kept: ChapterMedia[] | null = null;
  if (typeof existingRaw === 'string') {
    try {
      const parsed = JSON.parse(existingRaw) as unknown;
      if (Array.isArray(parsed)) {
        kept = parsed
          .filter(
            (m): m is ChapterMedia =>
              !!m &&
              typeof (m as ChapterMedia).url === 'string' &&
              // Only http(s) URLs — the kept list feeds <img>/<video> src, so
              // reject data:/javascript:/other schemes outright.
              /^https?:\/\//i.test((m as ChapterMedia).url) &&
              ((m as ChapterMedia).type === 'image' ||
                (m as ChapterMedia).type === 'video'),
          )
          .map((m) => ({ url: m.url, type: m.type }));
      }
    } catch {
      kept = null;
    }
  }

  if (kept !== null || newFiles.length > 0) {
    const base =
      kept ??
      (
        await adminDb
          .from('Chapter')
          .select('media')
          .eq('id', id)
          .maybeSingle<{ media: ChapterMedia[] | null }>()
      ).data?.media ??
      [];
    const uploaded = newFiles.length > 0 ? await uploadChapterMedia(id, newFiles) : [];
    update.media = [...base, ...uploaded].slice(0, MAX_CHAPTER_MEDIA);
  }

  const { error } = await adminDb.from('Chapter').update(update).eq('id', id);
  if (error) return { error: error.message };

  if (slug) revalidatePath(`/memorial/${slug}`);
  return { ok: true };
}

/**
 * Delete a chapter outright. Adjacent chapters keep their positions,
 * leaving gaps in the order — that's fine, ORDER BY position handles
 * it. A subsequent reorder will compact them on next persist.
 */
export async function deleteChapterAction(
  _prev: ChapterActionState | null,
  formData: FormData,
): Promise<ChapterActionState> {
  const id = String(formData.get('id') ?? '').trim();
  const memorialId = String(formData.get('memorialId') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  if (!id || !memorialId) return { error: 'id et memorialId requis.' };

  const userId = await ensureOwner(memorialId);
  if (!userId) return { error: 'Action réservée au propriétaire du mémorial.' };

  if (!(await ensureChapterInMemorial(memorialId, id)))
    return { error: 'Chapitre introuvable dans ce mémorial.' };

  const adminDb = getSupabaseAdminClient();
  const { error } = await adminDb.from('Chapter').delete().eq('id', id);
  if (error) return { error: error.message };

  if (slug) revalidatePath(`/memorial/${slug}`);
  return { ok: true };
}

/**
 * Persist a new chapter order. Takes an ordered list of chapter ids
 * and rewrites every position 0..n-1 in one batch. Owner-only.
 */
export async function reorderChaptersAction(
  memorialId: string,
  slug: string,
  orderedIds: string[],
): Promise<ChapterActionState> {
  if (!memorialId) return { error: 'memorialId requis.' };
  if (!Array.isArray(orderedIds) || orderedIds.length === 0)
    return { error: 'Liste vide.' };

  const userId = await ensureOwner(memorialId);
  if (!userId) return { error: 'Action réservée au propriétaire du mémorial.' };

  const adminDb = getSupabaseAdminClient();
  // Confirm all ids belong to the same memorial's biography to prevent
  // a malicious payload from reordering some other memorial's chapters.
  const { data: bio } = await adminDb
    .from('Biography')
    .select('id')
    .eq('memorialId', memorialId)
    .maybeSingle<BiographyRow>();
  if (!bio) return { error: 'Biographie introuvable.' };

  const { data: existing } = await adminDb
    .from('Chapter')
    .select('id')
    .eq('biographyId', bio.id)
    .returns<{ id: string }[]>();
  const existingSet = new Set((existing ?? []).map((c) => c.id));
  for (const id of orderedIds) {
    if (!existingSet.has(id))
      return { error: `Chapitre ${id.slice(0, 8)} hors de cette biographie.` };
  }

  // Apply positions one-by-one; payload is small (typical <20 chapters).
  for (let i = 0; i < orderedIds.length; i += 1) {
    const id = orderedIds[i]!;
    const { error } = await adminDb
      .from('Chapter')
      .update({ position: i })
      .eq('id', id);
    if (error) return { error: error.message };
  }

  if (slug) revalidatePath(`/memorial/${slug}`);
  return { ok: true };
}
