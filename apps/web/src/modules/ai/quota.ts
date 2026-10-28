import 'server-only';
import { consumeAiQuota } from './repo';
import type { AiError } from './types';

const QUOTA_ERRORS: Record<string, AiError> = {
  '42501': 'forbidden',
  '28000': 'unauthenticated',
  // WHY: JWT expiré signalé par PostgREST.
  PGRST301: 'unauthenticated',
};

/**
 * Consomme un appel du quota d'IA du jour pour le dossier (20 par jour, contributeur et plus).
 * Renvoie l'erreur à afficher, ou null quand l'appel est permis.
 * WHY: partagé par l'amélioration des brouillons et la lecture des reçus (même quota).
 *
 * @example
 * const quotaError = await takeAiQuota(dossierId);
 * if (quotaError) return { ok: false, error: quotaError };
 */
export async function takeAiQuota(dossierId: string): Promise<AiError | null> {
  const quota = await consumeAiQuota(dossierId);
  if (quota.error) {
    const mapped = QUOTA_ERRORS[quota.error.code];
    if (!mapped) console.error('[ai] consumeAiQuota failed', { code: quota.error.code });
    return mapped ?? 'failed';
  }
  return quota.data ? null : 'quota';
}
