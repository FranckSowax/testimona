import 'server-only';
import { getSupabaseServer } from '@/lib/supabase/server';
import type { RepoResult } from '@/modules/dossier/repo';
import { AI_DAILY_LIMIT } from './config';

/**
 * Consomme un appel du quota quotidien d'IA du dossier (contributeur et plus, vérifié en base).
 * `data` vaut false quand le plafond du jour est atteint.
 *
 * @example
 * const quota = await consumeAiQuota(dossierId);
 */
export async function consumeAiQuota(dossierId: string): Promise<RepoResult<boolean>> {
  const db = await getSupabaseServer();
  const { data, error } = await db.rpc('consume_ai_quota', {
    p_dossier_id: dossierId,
    p_daily_limit: AI_DAILY_LIMIT,
  });
  if (error)
    return { data: null, error: { code: error.code ?? 'unknown', message: error.message } };
  return { data: data === true, error: null };
}
