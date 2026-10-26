'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';
import { canManageMemorial } from '@/lib/memorial/access';
import { uploadMemorialImage } from '@/lib/memorial/images';
import { revalidateMemorialPages } from '@/lib/revalidate';

export interface MemorialUpdateActionState {
  ok?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

/**
 * V2 Server Action — update Memorial info (PDF p21).
 * Owner or accepted co-owner (G3).
 */
export async function updateMemorialAction(
  _prev: MemorialUpdateActionState | null,
  formData: FormData,
): Promise<MemorialUpdateActionState> {
  const memorialId = String(formData.get('memorialId') ?? '').trim();
  const slug = String(formData.get('slug') ?? '').trim();
  if (!memorialId) return { error: 'memorialId requis.' };

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: 'Non connecté.' };

  if (!(await canManageMemorial(memorialId, userData.user.id))) {
    return { error: 'Action réservée aux administrateurs du mémorial.' };
  }

  const firstname = String(formData.get('firstname') ?? '').trim();
  const lastname = String(formData.get('lastname') ?? '').trim();
  if (!firstname || !lastname) {
    return {
      error: 'Validation',
      fieldErrors: {
        firstname: !firstname ? 'Prénom requis.' : '',
        lastname: !lastname ? 'Nom requis.' : '',
      },
    };
  }

  const birthYear = String(formData.get('birthYear') ?? '').trim();
  const birthMonth = String(formData.get('birthMonth') ?? '01').padStart(2, '0');
  const birthDay = String(formData.get('birthDay') ?? '01').padStart(2, '0');
  const deathYear = String(formData.get('deathYear') ?? '').trim();
  const deathMonth = String(formData.get('deathMonth') ?? '01').padStart(2, '0');
  const deathDay = String(formData.get('deathDay') ?? '01').padStart(2, '0');

  const birthDate = birthYear ? `${birthYear}-${birthMonth}-${birthDay}` : null;
  const deathDate = deathYear ? `${deathYear}-${deathMonth}-${deathDay}` : null;

  const description = String(formData.get('description') ?? '')
    .trim()
    .slice(0, 280);
  const nickname = String(formData.get('nickname') ?? '').trim() || null;
  const musicUrlRaw = String(formData.get('musicUrl') ?? '').trim();
  // http(s) only — the value feeds <audio src> / a YouTube iframe on the
  // public story viewer; reject other schemes.
  const musicUrl =
    musicUrlRaw && /^https?:\/\//i.test(musicUrlRaw) ? musicUrlRaw.slice(0, 500) : null;

  const { error } = await supabase
    .from('Memorial')
    .update({
      firstname,
      lastname,
      nickname,
      birthDate,
      deathDate,
      description: description || null,
      musicUrl,
    })
    .eq('id', memorialId);

  if (error) return { error: error.message };

  // Portrait / cover replacement (client recette: "modifier la photo de profil
  // et la cover"). Second, separate update so the base fields above still save
  // on a DB where migration v23 hasn't run — only this step would then fail.
  const portraitUrl = await uploadMemorialImage(
    memorialId,
    formData.get('portraitPhoto'),
    'portrait',
  );
  const coverUrl = await uploadMemorialImage(memorialId, formData.get('coverPhoto'), 'cover');
  if (portraitUrl || coverUrl) {
    const art: Record<string, string | null> = {};
    if (portraitUrl) art.portraitUrl = portraitUrl;
    if (coverUrl) {
      art.coverUrl = coverUrl;
      // A freshly uploaded cover is the most recent explicit choice — clear the
      // star-picked gallery cover so the upload actually shows.
      art.coverPhotoId = null;
    }
    const { error: artError } = await supabase.from('Memorial').update(art).eq('id', memorialId);
    if (artError) return { error: artError.message };
  }

  if (slug) revalidateMemorialPages(slug);
  revalidatePath('/dashboard');
  return { ok: true };
}
