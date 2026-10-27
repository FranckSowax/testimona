'use server';

import { getLocale } from 'next-intl/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { improveDraft } from './service';
import type { AiResult } from './types';

/**
 * Améliore le brouillon affiché ; le résultat n'est pas enregistré (l'utilisateur relit d'abord).
 * L'entrée vient du navigateur : le service la valide entièrement.
 */
export async function improveDraftAction(input: {
  dossierId: string;
  stepId: string;
  text: string;
}): Promise<AiResult> {
  if (!(await getCurrentUser())) return { ok: false, error: 'unauthenticated' };
  const locale = await getLocale();
  return improveDraft({ ...input, locale: locale === 'en' ? 'en' : 'fr' });
}
