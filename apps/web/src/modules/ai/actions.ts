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
  // WHY: un appel d'action peut porter n'importe quelle valeur ; on n'étale qu'un objet. Aucun
  // second argument : le fournisseur injectable sert aux tests et ne doit jamais venir du client.
  const fields = typeof input === 'object' && input !== null ? input : {};
  return improveDraft({ ...fields, locale: locale === 'en' ? 'en' : 'fr' });
}
