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

  const { error } = await adminDb.from('Chapter').insert({
    id: randomUUID(),
    biographyId,
    title,
    content,
    position: nextPosition,
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

  const adminDb = getSupabaseAdminClient();
  const { error } = await adminDb
    .from('Chapter')
    .update({ title, content })
    .eq('id', id);
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
