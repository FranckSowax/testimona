'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

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
  if (memorial.ownerId !== userData.user.id) return { error: 'forbidden' };

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

  const { data: memorial } = await supabase
    .from('Memorial')
    .select('ownerId')
    .eq('id', photo.memorialId)
    .maybeSingle<{ ownerId: string }>();
  if (!memorial || memorial.ownerId !== userData.user.id) {
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

  const isOwner = userId !== null && userId === memorial.ownerId;
  const status = isOwner ? 'approved' : 'pending';

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

  const { data: memorial } = await adminDb
    .from('Memorial')
    .select('ownerId')
    .eq('id', photo.memorialId)
    .maybeSingle<{ ownerId: string }>();
  if (!memorial || memorial.ownerId !== userData.user.id)
    return { error: 'Modération réservée au propriétaire.' };

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
