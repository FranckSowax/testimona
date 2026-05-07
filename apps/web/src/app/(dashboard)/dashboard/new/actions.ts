'use server';

import { MemorialCreateSchema } from '@testimona/shared';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';

export interface NewMemorialActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

export async function createMemorialAction(
  _prev: NewMemorialActionState | null,
  formData: FormData,
): Promise<NewMemorialActionState> {
  const raw = {
    firstname: String(formData.get('firstname') ?? '').trim(),
    lastname: String(formData.get('lastname') ?? '').trim(),
    nickname: formData.get('nickname') ? String(formData.get('nickname')).trim() : undefined,
    birthDate: formData.get('birthDate') || undefined,
    deathDate: formData.get('deathDate') || undefined,
    language: String(formData.get('language') ?? 'fr'),
    isPublic: formData.get('isPublic') === 'on',
    description: formData.get('description')
      ? String(formData.get('description')).trim()
      : undefined,
  };

  const parsed = MemorialCreateSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: 'Validation', fieldErrors };
  }

  const supabase = await getSupabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: 'Vous devez être connecté.' };
  }

  const baseSlug = slugify(`${parsed.data.firstname}-${parsed.data.lastname}`);
  const suffix = Math.random().toString(36).slice(2, 8);
  const slug = baseSlug ? `${baseSlug}-${suffix}` : suffix;

  const { error } = await supabase.from('Memorial').insert({
    ownerId: userData.user.id,
    slug,
    firstname: parsed.data.firstname,
    lastname: parsed.data.lastname,
    nickname: parsed.data.nickname ?? null,
    birthDate: parsed.data.birthDate ?? null,
    deathDate: parsed.data.deathDate ?? null,
    language: parsed.data.language,
    isPublic: parsed.data.isPublic,
    description: parsed.data.description ?? null,
  });

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  redirect(`/memorial/${slug}`);
}
