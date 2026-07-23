'use server';

import { randomUUID } from 'node:crypto';
import { MemorialCreateSchema } from '@testimona/shared';
import { revalidatePath } from 'next/cache';
import { getSupabaseServer } from '@/lib/supabase/server';
import { uploadMemorialImage } from '@/lib/memorial/images';

export interface NewMemorialActionState {
  ok?: true;
  slug?: string;
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

  // http(s) only — feeds <audio src> / YouTube iframe on the public page.
  const musicUrlRaw = String(formData.get('musicUrl') ?? '').trim();
  const musicUrl =
    musicUrlRaw && /^https?:\/\//i.test(musicUrlRaw)
      ? musicUrlRaw.slice(0, 500)
      : null;

  // Extra fields collected by the form but not part of MemorialCreateSchema
  // (zod strips unknown keys), read straight from the FormData like musicUrl.
  const str = (k: string, max = 120) =>
    String(formData.get(k) ?? '').trim().slice(0, max) || null;
  const birthCountry = str('birthCountry');
  const birthCity = str('birthCity');
  const deathCountry = str('deathCountry');
  const deathCity = str('deathCity');
  const relationship = str('relationship', 40);

  // The base "Memorial" table was created by Prisma `db push`. Prisma turns
  // literal/`now()` defaults into Postgres column defaults, but NOT its
  // *functional* defaults: `@default(uuid())` (id) and the `@updatedAt`
  // attribute have no DB default at all. Inserting via supabase-js (which
  // bypasses Prisma Client, so those app-side values are never filled) fails
  // with `null value in column "id"/"updatedAt"`. We therefore supply id and
  // both timestamps ourselves. createdAt/donationGoalCents normally DO have DB
  // defaults, but we set them too so a partially-migrated DB can't surprise us.
  const now = new Date().toISOString();
  const memorialId = randomUUID();

  // Portrait (round miniature) + cover (banner) uploaded straight from the
  // creation modal (client recette). Only add the columns when a file was
  // actually provided, so a DB without migration v23 still accepts photo-less
  // creations.
  const portraitUrl = await uploadMemorialImage(
    memorialId,
    formData.get('portraitPhoto'),
    'portrait',
  );
  const coverUrl = await uploadMemorialImage(
    memorialId,
    formData.get('coverPhoto'),
    'cover',
  );
  const art: Record<string, string> = {};
  if (portraitUrl) art.portraitUrl = portraitUrl;
  if (coverUrl) art.coverUrl = coverUrl;

  const { error } = await supabase.from('Memorial').insert({
    id: memorialId,
    ownerId: userData.user.id,
    slug,
    ...art,
    firstname: parsed.data.firstname,
    lastname: parsed.data.lastname,
    nickname: parsed.data.nickname ?? null,
    birthDate: parsed.data.birthDate ?? null,
    deathDate: parsed.data.deathDate ?? null,
    language: parsed.data.language,
    isPublic: parsed.data.isPublic,
    description: parsed.data.description ?? null,
    musicUrl,
    birthCountry,
    birthCity,
    deathCountry,
    deathCity,
    relationship,
    donationGoalCents: 0,
    createdAt: now,
    updatedAt: now,
  });

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  return { ok: true, slug };
}
