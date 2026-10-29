import 'server-only';
import { z } from 'zod';
import { listMembers } from '@/modules/dossier/repo';
import { QUOTE_MESSAGE_MAX, quoteHref } from './quote-message';
import { insertQuoteRequest, listQuoteRequests, QUOTE_STEPS, type QuoteStep } from './quotes/repo';
import { getProvider } from './repo';

export type QuoteError =
  | 'validation'
  | 'forbidden'
  | 'unreachable'
  | 'unauthenticated'
  | 'unknown';

export type QuoteResult<T> = { ok: true; data: T } | { ok: false; error: QuoteError };

/** Ligne de l'historique « Devis demandés ». */
export interface QuoteHistoryItem {
  id: string;
  providerName: string;
  /** Nom affiché de l'auteur, null s'il a quitté le dossier ou n'a pas de nom. */
  author: string | null;
  createdAt: string;
}

const CODES: Record<string, QuoteError> = {
  '42501': 'forbidden',
  '28000': 'unauthenticated',
  '23514': 'validation',
  '22P02': 'validation',
  TL010: 'unreachable',
};

const RequestSchema = z.object({
  dossierId: z.string().uuid(),
  providerId: z.string().uuid(),
  stepId: z.enum(QUOTE_STEPS),
  message: z.string().trim().min(1).max(QUOTE_MESSAGE_MAX),
});

function fromRepo(error: { code: string }, scope: string): { ok: false; error: QuoteError } {
  const mapped = CODES[error.code];
  if (!mapped) console.error(`[providers] ${scope} failed`, { code: error.code });
  return { ok: false, error: mapped ?? 'unknown' };
}

/**
 * Trace une demande de devis puis renvoie le lien `wa.me` vers le prestataire.
 * WHY: le numéro ne quitte le serveur qu'après la trace ; une demande refusée (rôle, prestataire
 * plus contactable) n'ouvre rien.
 *
 * @example
 * const res = await requestQuote({ dossierId, providerId, stepId: 'vigil-setup', message });
 * if (res.ok) window.open(res.data.href);
 */
export async function requestQuote(raw: unknown): Promise<QuoteResult<{ href: string }>> {
  const parsed = RequestSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'validation' };
  const inserted = await insertQuoteRequest(parsed.data);
  if (inserted.error) return fromRepo(inserted.error, 'requestQuote');
  const provider = await getProvider(parsed.data.providerId);
  // WHY: le trigger vient de vérifier le prestataire ; s'il n'est plus lisible (désactivé dans
  // l'intervalle), la demande reste tracée mais aucun numéro n'est donné.
  if (provider.error) {
    if (provider.error.code !== 'no_rows') {
      console.error('[providers] requestQuote provider read failed', { code: provider.error.code });
    }
    return { ok: false, error: 'unreachable' };
  }
  if (!provider.data.whatsapp) return { ok: false, error: 'unreachable' };
  return { ok: true, data: { href: quoteHref(provider.data.whatsapp, parsed.data.message) } };
}

/**
 * Historique « Devis demandés » d'une étape, avec le nom affiché de l'auteur.
 *
 * @example
 * const res = await quotesForStep(dossierId, 'vigil-setup');
 */
export async function quotesForStep(
  dossierId: string,
  stepId: QuoteStep,
): Promise<QuoteResult<QuoteHistoryItem[]>> {
  const res = await listQuoteRequests(dossierId, stepId);
  if (res.error) return fromRepo(res.error, 'quotesForStep');
  if (res.data.length === 0) return { ok: true, data: [] };
  const names = new Map(
    (await listMembers(dossierId)).map((member) => [member.userId, member.displayName]),
  );
  return {
    ok: true,
    data: res.data.map((row) => ({
      id: row.id,
      providerName: row.providerName,
      author: (row.createdBy && names.get(row.createdBy)) || null,
      createdAt: row.createdAt,
    })),
  };
}
