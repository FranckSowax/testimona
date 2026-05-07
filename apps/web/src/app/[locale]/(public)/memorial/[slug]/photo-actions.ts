'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_BYTES = 10 * 1024 * 1024;

export interface PhotoActionState {
  ok?: boolean;
  error?: string;
  url?: string;
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
