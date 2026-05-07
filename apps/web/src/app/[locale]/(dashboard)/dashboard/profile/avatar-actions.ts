'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_BYTES = 5 * 1024 * 1024;

export interface AvatarActionState {
  ok?: boolean;
  error?: string;
  url?: string;
}

export async function uploadAvatarAction(
  _prev: AvatarActionState | null,
  formData: FormData,
): Promise<AvatarActionState> {
  const file = formData.get('file');
  if (!(file instanceof File)) return { error: 'no file' };
  if (!ALLOWED_MIME.includes(file.type as (typeof ALLOWED_MIME)[number])) {
    return { error: 'unsupported MIME type' };
  }
  if (file.size > MAX_BYTES) return { error: 'file too large (max 5 MB)' };
  if (file.size === 0) return { error: 'empty file' };

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'auth required' };

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${userData.user.id}/avatar-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, {
      contentType: file.type,
      upsert: true,
      cacheControl: '3600',
    });
  if (uploadError) return { error: uploadError.message };

  const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = publicData.publicUrl;

  const { error: metaError } = await supabase.auth.updateUser({
    data: { avatar_url: url },
  });
  if (metaError) return { error: metaError.message };

  revalidatePath('/dashboard/profile');
  revalidatePath('/', 'layout');
  return { ok: true, url };
}

export async function removeAvatarAction(): Promise<AvatarActionState> {
  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'auth required' };
  const userId = userData.user.id;

  const { data: list } = await supabase.storage.from('avatars').list(userId);
  if (list && list.length > 0) {
    const paths = list.map((f) => `${userId}/${f.name}`);
    await supabase.storage.from('avatars').remove(paths);
  }
  await supabase.auth.updateUser({ data: { avatar_url: null } });
  revalidatePath('/dashboard/profile');
  revalidatePath('/', 'layout');
  return { ok: true };
}
