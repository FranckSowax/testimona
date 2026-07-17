'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { canManageMemorial } from '@/lib/memorial/access';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_BYTES = 10 * 1024 * 1024;

export interface PhotoActionState {
  ok?: boolean;
  error?: string;
  url?: string;
  fieldErrors?: Record<string, string>;
}

export async function uploadMemorialPhotoAction(
  _prev: PhotoActionState | null,
  formData: FormData,
): Promise<PhotoActionState> {
  const memorialId = String(formData.get('memorialId') ?? '');
  const slug = String(formData.get('slug') ?? '');
  const caption = String(formData.get('caption') ?? '').trim().slice(0, 500) || null;
  const file = formData.get('file');

  if (!memorialId) return { error: 'missing memorialId' };
  if (!(file instanceof File)) return { error: 'no file' };
  if (!ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])) {
    return { error: 'unsupported MIME type' };
  }
  if (file.size > MAX_BYTES) return { error: 'file too large (max 10 MB)' };
  if (file.size === 0) return { error: 'empty file' };

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'auth required' };

  const { data: memorial } = await supabase
    .from('Memorial')
    .select('ownerId')
    .eq('id', memorialId)
    .maybeSingle<{ ownerId: string }>();
  if (!memorial) return { error: 'memorial not found' };
  if (!(await canManageMemorial(memorialId, userData.user.id)))
    return { error: 'forbidden' };

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${memorialId}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from('memorial-photos')
    .upload(path, file, { contentType: file.type, cacheControl: '3600' });
  if (uploadError) return { error: uploadError.message };

  const { data: publicData } = supabase.storage.from('memorial-photos').getPublicUrl(path);
  const url = publicData.publicUrl;

  const { count } = await supabase
    .from('Photo')
    .select('id', { count: 'exact', head: true })
    .eq('memorialId', memorialId);

  const { error: insertError } = await supabase.from('Photo').insert({
    id: randomUUID(),
    memorialId,
    url,
    caption,
    position: count ?? 0,
  });
  if (insertError) return { error: insertError.message };

  if (slug) revalidatePath(`/memorial/${slug}`);
  return { ok: true, url };
}

export async function deleteMemorialPhotoAction(
  photoId: string,
  slug: string,
): Promise<PhotoActionState> {
  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'auth required' };

  const { data: photo } = await supabase
    .from('Photo')
    .select('url, memorialId')
    .eq('id', photoId)
    .maybeSingle<{ url: string; memorialId: string }>();
  if (!photo) return { error: 'photo not found' };

  if (!(await canManageMemorial(photo.memorialId, userData.user.id))) {
    return { error: 'forbidden' };
  }

  const marker = '/storage/v1/object/public/memorial-photos/';
  const idx = photo.url.indexOf(marker);
  if (idx >= 0) {
    const objectPath = photo.url.slice(idx + marker.length);
    await supabase.storage.from('memorial-photos').remove([objectPath]);
  }

  const { error: delError } = await supabase.from('Photo').delete().eq('id', photoId);
  if (delError) return { error: delError.message };

  if (slug) revalidatePath(`/memorial/${slug}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Public photo submission — anyone can propose a photo, owner moderates
// ---------------------------------------------------------------------------

/**
 * Open to anonymous visitors. Uploads the file to the same
 * memorial-photos bucket, inserts a Photo row with status='pending'
 * (or 'approved' when the submitter IS the memorial owner). Captures
 * a free-text submitter name + optional email for the owner's
 * moderation queue.
 */
export async function submitPublicPhotoAction(
  _prev: PhotoActionState | null,
  formData: FormData,
): Promise<PhotoActionState> {
  const memorialId = String(formData.get('memorialId') ?? '');
  const slug = String(formData.get('slug') ?? '');
  const caption = String(formData.get('caption') ?? '').trim().slice(0, 500) || null;
  const submitterName = String(formData.get('submitterName') ?? '').trim().slice(0, 80);
  const submitterEmail = String(formData.get('submitterEmail') ?? '').trim().slice(0, 200);
  const file = formData.get('file');

  const fieldErrors: Record<string, string> = {};
  if (!memorialId) fieldErrors.memorialId = 'requis';
  if (!submitterName) fieldErrors.submitterName = 'Prénom + nom requis';
  if (!(file instanceof File)) fieldErrors.file = 'Photo requise';
  else {
    if (!ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number]))
      fieldErrors.file = 'Format non supporté (JPG, PNG ou WebP)';
    if (file.size === 0) fieldErrors.file = 'Fichier vide';
    if (file.size > MAX_BYTES) fieldErrors.file = 'Fichier trop lourd (10 Mo max)';
  }
  if (
    submitterEmail &&
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(submitterEmail)
  )
    fieldErrors.submitterEmail = 'Email invalide';
  if (Object.keys(fieldErrors).length)
    return { error: 'Validation', fieldErrors };

  const photo = file as File;

  // Identify submitter — anon users still allowed (id = null).
  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  // Resolve ownership to decide auto-approve.
  const adminDb = getSupabaseAdminClient();
  const { data: memorial } = await adminDb
    .from('Memorial')
    .select('ownerId, isPublic')
    .eq('id', memorialId)
    .maybeSingle<{ ownerId: string; isPublic: boolean }>();
  if (!memorial) return { error: 'Mémorial introuvable.' };
  if (!memorial.isPublic && !userId)
    return { error: 'Mémorial privé — connexion requise.' };

  // Décision recette p26 (P2) : les photos/vidéos sont publiées
  // immédiatement et revues a posteriori par la famille (qui peut les
  // retirer via le bouton supprimer), au lieu d'une validation préalable.
  const status = 'approved';

  // Upload file via the admin client so anon visitors can write to
  // the bucket without an RLS storage policy gymnastic.
  const ext =
    photo.type === 'image/png'
      ? 'png'
      : photo.type === 'image/webp'
      ? 'webp'
      : 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${memorialId}/${filename}`;

  const { error: uploadError } = await adminDb.storage
    .from('memorial-photos')
    .upload(path, photo, { contentType: photo.type, cacheControl: '3600' });
  if (uploadError) return { error: uploadError.message };

  const { data: publicData } = adminDb.storage
    .from('memorial-photos')
    .getPublicUrl(path);
  const url = publicData.publicUrl;

  // Compute next position over APPROVED photos so pending ones don't
  // mess up the public ordering.
  const { count } = await adminDb
    .from('Photo')
    .select('id', { count: 'exact', head: true })
    .eq('memorialId', memorialId)
    .eq('status', 'approved');

  const { error: insertError } = await adminDb.from('Photo').insert({
    id: randomUUID(),
    memorialId,
    url,
    caption,
    position: count ?? 0,
    status,
    submittedById: userId,
    submittedByName: submitterName,
    submittedByEmail: submitterEmail || null,
  });
  if (insertError) return { error: insertError.message };

  if (slug) revalidatePath(`/memorial/${slug}`);
  return { ok: true, url };
}

/**
 * Owner moderates a pending photo: approve or reject. Rejecting also
 * deletes the storage object so we don't keep junk uploads around.
 */
export async function moderatePhotoAction(
  _prev: PhotoActionState | null,
  formData: FormData,
): Promise<PhotoActionState> {
  const id = String(formData.get('id') ?? '').trim();
  const decision = String(formData.get('decision') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  if (!id) return { error: 'id requis.' };
  if (decision !== 'approved' && decision !== 'rejected')
    return { error: 'Décision invalide.' };

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'Non connecté.' };

  const adminDb = getSupabaseAdminClient();
  const { data: photo } = await adminDb
    .from('Photo')
    .select('memorialId, url')
    .eq('id', id)
    .maybeSingle<{ memorialId: string; url: string }>();
  if (!photo) return { error: 'Photo introuvable.' };

  if (!(await canManageMemorial(photo.memorialId, userData.user.id)))
    return { error: 'Modération réservée aux administrateurs.' };

  if (decision === 'rejected') {
    // Hard-delete + remove storage object.
    const marker = '/storage/v1/object/public/memorial-photos/';
    const idx = photo.url.indexOf(marker);
    if (idx >= 0) {
      const objectPath = photo.url.slice(idx + marker.length);
      await adminDb.storage.from('memorial-photos').remove([objectPath]);
    }
    await adminDb.from('Photo').delete().eq('id', id);
  } else {
    await adminDb
      .from('Photo')
      .update({
        status: 'approved',
        moderatedAt: new Date().toISOString(),
        moderatedById: userData.user.id,
      })
      .eq('id', id);
  }

  if (slug) revalidatePath(`/memorial/${slug}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Photo engagement — like + report (PDF p26). Comments deferred.
// ---------------------------------------------------------------------------

export interface PhotoLikeState {
  ok?: boolean;
  liked?: boolean;
  count?: number;
  error?: string;
}

/** Toggle the current user's like on a photo. Account required. */
export async function togglePhotoLikeAction(
  _prev: PhotoLikeState | null,
  formData: FormData,
): Promise<PhotoLikeState> {
  const photoId = String(formData.get('photoId') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  if (!photoId) return { error: 'photoId requis.' };

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'Connecte-toi pour aimer cette photo.' };
  const userId = userData.user.id;

  const adminDb = getSupabaseAdminClient();
  const { data: existing } = await adminDb
    .from('PhotoLike')
    .select('id')
    .eq('photoId', photoId)
    .eq('userId', userId)
    .maybeSingle<{ id: string }>();

  if (existing) {
    await adminDb.from('PhotoLike').delete().eq('id', existing.id);
  } else {
    const { error } = await adminDb
      .from('PhotoLike')
      .insert({ photoId, userId });
    if (error) return { error: error.message };
  }

  const { count } = await adminDb
    .from('PhotoLike')
    .select('id', { count: 'exact', head: true })
    .eq('photoId', photoId);

  if (slug) revalidatePath(`/memorial/${slug}`);
  return { ok: true, liked: !existing, count: count ?? 0 };
}

export interface PhotoReportState {
  ok?: boolean;
  error?: string;
}

/** Report a photo as inappropriate. Account required. */
export async function reportPhotoAction(
  _prev: PhotoReportState | null,
  formData: FormData,
): Promise<PhotoReportState> {
  const photoId = String(formData.get('photoId') ?? '').trim();
  const reason = String(formData.get('reason') ?? '').trim().slice(0, 500);
  if (!photoId) return { error: 'photoId requis.' };
  if (reason.length === 0) return { error: 'Motif requis.' };

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'Connecte-toi pour signaler cette photo.' };

  const adminDb = getSupabaseAdminClient();
  const { error } = await adminDb.from('PhotoReport').insert({
    photoId,
    reporterId: userData.user.id,
    reason,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export interface PhotoCommentState {
  ok?: boolean;
  error?: string;
}

/** Add a comment under a photo. Account required (T7). */
export async function addPhotoCommentAction(
  _prev: PhotoCommentState | null,
  formData: FormData,
): Promise<PhotoCommentState> {
  const photoId = String(formData.get('photoId') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim().slice(0, 2000);
  if (!photoId) return { error: 'photoId requis.' };
  if (message.length === 0) return { error: 'Message requis.' };

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'Connecte-toi pour commenter.' };

  const meta = userData.user.user_metadata as
    | { full_name?: string; nickname?: string }
    | null;
  const authorName =
    meta?.nickname || meta?.full_name || userData.user.email?.split('@')[0] || 'Anonyme';

  const adminDb = getSupabaseAdminClient();
  const { error } = await adminDb.from('PhotoComment').insert({
    photoId,
    authorId: userData.user.id,
    authorName,
    message,
  });
  if (error) return { error: error.message };

  if (slug) revalidatePath(`/memorial/${slug}`);
  return { ok: true };
}
