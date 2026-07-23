import { revalidatePath } from 'next/cache';
import { routing } from '@/i18n/routing';

/**
 * Invalidate a memorial page for every locale variant. Server actions used to
 * call revalidatePath(`/memorial/${slug}`), but the real routes live under
 * /[locale]/memorial/[slug] (unprefixed French URLs are rewritten to /fr/…
 * internally), so the ISR cache (revalidate = 60) was often NOT invalidated —
 * owners saw their edits (chapters, currency, photos…) appear only after the
 * 60s window. Hit the unprefixed path plus every locale prefix.
 */
export function revalidateMemorialPages(slug: string) {
  revalidatePath(`/memorial/${slug}`);
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/memorial/${slug}`);
  }
}
