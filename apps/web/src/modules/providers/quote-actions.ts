'use server';

import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { localizedPath } from '@/lib/auth/redirect-target';
import { getCurrentUser } from '@/lib/supabase/server';
import { type QuoteError, requestQuote } from './quote-service';

export interface QuoteFormState {
  ok?: boolean;
  /** Lien `wa.me` à ouvrir, présent quand la demande est tracée. */
  href?: string;
  error?: QuoteError;
}

const field = (formData: FormData, name: string) => String(formData.get(name) ?? '');

/**
 * Trace une demande de devis et renvoie le lien WhatsApp.
 * WHY: la synthèse est revalidée pour que l'historique « Devis demandés » montre la demande.
 */
export async function requestQuoteAction(
  _prev: QuoteFormState | null,
  formData: FormData,
): Promise<QuoteFormState> {
  if (!(await getCurrentUser())) return { error: 'unauthenticated' };
  const input = {
    dossierId: field(formData, 'dossierId'),
    providerId: field(formData, 'providerId'),
    stepId: field(formData, 'stepId'),
    message: field(formData, 'message'),
  };
  const res = await requestQuote(input);
  // WHY: `unreachable` peut survenir après l'insertion de la trace (prestataire désactivé entre
  // l'insertion et la lecture) : l'historique doit alors aussi être rafraîchi.
  if (res.ok || res.error === 'unreachable') {
    revalidatePath(
      localizedPath(
        `/dossier/${input.dossierId}/etape/${input.stepId}/synthese`,
        await getLocale(),
      ),
    );
  }
  if (!res.ok) return { error: res.error };
  return { ok: true, href: res.data.href };
}
