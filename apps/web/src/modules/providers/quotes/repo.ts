import 'server-only';
import { getSupabaseServer } from '@/lib/supabase/server';
import type { RepoResult } from '@/modules/dossier/repo';

/** Étapes dont la synthèse propose des devis (contrainte de `quote_request.step_id`). */
export const QUOTE_STEPS = ['vigil-setup', 'vigil-catering', 'ceremony-program'] as const;
export type QuoteStep = (typeof QUOTE_STEPS)[number];

/** WHY: au-delà, l'historique d'une étape ne sert plus ; il reste lisible en base. */
const HISTORY_LIMIT = 50;

export interface QuoteRequestRow {
  id: string;
  providerName: string;
  createdBy: string | null;
  createdAt: string;
}

function fail(error: { code?: string; message?: string }) {
  return {
    data: null,
    error: { code: error.code || 'unknown', message: error.message || 'quotes error' },
  };
}

/**
 * Trace une demande de devis et renvoie le numéro WhatsApp du prestataire, par la RPC
 * `request_quote`. Auteur, date et nom du prestataire sont imposés par la base ; 42501 sous le
 * rôle coordinateur, puis TL010 si le prestataire n'est plus contactable.
 * WHY: le numéro n'est plus lisible par `select` (migration 20261029000200) ; il ne sort qu'avec
 * la trace, dans la même transaction.
 *
 * @example
 * const res = await requestQuoteRpc({ dossierId, providerId, stepId: 'vigil-setup', message });
 */
export async function requestQuoteRpc(input: {
  dossierId: string;
  providerId: string;
  stepId: QuoteStep;
  message: string;
}): Promise<RepoResult<{ whatsapp: string }>> {
  const db = await getSupabaseServer();
  const { data, error } = await db.rpc('request_quote', {
    p_dossier_id: input.dossierId,
    p_provider_id: input.providerId,
    p_step_id: input.stepId,
    p_message: input.message,
  });
  if (error) return fail(error);
  if (!data) return fail({ code: 'no_number', message: 'request_quote returned no number' });
  return { data: { whatsapp: data }, error: null };
}

/**
 * Demandes de devis d'une étape (RLS : membres du dossier), les plus récentes d'abord.
 *
 * @example
 * const res = await listQuoteRequests(dossierId, 'vigil-setup');
 */
export async function listQuoteRequests(
  dossierId: string,
  stepId: QuoteStep,
): Promise<RepoResult<QuoteRequestRow[]>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('quote_request')
    .select('id, provider_name, created_by, created_at')
    .eq('dossier_id', dossierId)
    .eq('step_id', stepId)
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT)
    .returns<
      { id: string; provider_name: string; created_by: string | null; created_at: string }[]
    >();
  if (error) {
    console.error('[providers] listQuoteRequests impossible', { code: error.code });
    return fail(error);
  }
  return {
    data: (data ?? []).map((r) => ({
      id: r.id,
      providerName: r.provider_name,
      createdBy: r.created_by,
      createdAt: r.created_at,
    })),
    error: null,
  };
}
