import 'server-only';
import { getSupabaseServer } from '@/lib/supabase/server';
import type { RepoResult } from '../repo';

/**
 * Réponses du parcours d'un dossier (toutes, ou seulement `keys`), avec l'erreur de lecture.
 * WHY: une page qui propose de réécrire une réponse doit savoir si la lecture a échoué, sinon
 * elle présenterait un modèle à la place du texte enregistré.
 */
export async function listAnswersResult(
  dossierId: string,
  keys?: readonly string[],
): Promise<{ data: Record<string, unknown>; error: { code: string } | null }> {
  const db = await getSupabaseServer();
  let query = db.from('journey_answer').select('key, value').eq('dossier_id', dossierId);
  if (keys) query = query.in('key', [...keys]);
  const { data, error } = await query.returns<{ key: string; value: unknown }[]>();
  if (error) console.error('[dossier/answers] listAnswers impossible', { code: error.code });
  return {
    data: Object.fromEntries((data ?? []).map((row) => [row.key, row.value])),
    error: error ? { code: error.code } : null,
  };
}

/**
 * Réponses du parcours d'un dossier, indexées par clé (toutes, ou seulement `keys`).
 * Une erreur de lecture est journalisée (code seulement) et donne un objet vide.
 */
export async function listAnswers(
  dossierId: string,
  keys?: readonly string[],
): Promise<Record<string, unknown>> {
  return (await listAnswersResult(dossierId, keys)).data;
}

/** Crée ou remplace une réponse ; la RLS exige le rôle contributor ou plus. */
export async function upsertAnswer(args: {
  dossierId: string;
  key: string;
  value: unknown;
}): Promise<RepoResult<true>> {
  const db = await getSupabaseServer();
  const { error } = await db
    .from('journey_answer')
    .upsert(
      { dossier_id: args.dossierId, key: args.key, value: args.value },
      { onConflict: 'dossier_id,key' },
    );
  if (error) {
    return {
      data: null,
      error: { code: error.code || 'unknown', message: error.message || 'upsert failed' },
    };
  }
  return { data: true, error: null };
}
