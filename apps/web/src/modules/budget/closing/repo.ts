import 'server-only';
import { getSupabaseServer } from '@/lib/supabase/server';
import type { RepoResult } from '@/modules/dossier/repo';
import type { EntryKind, EntryMethod } from '../ledger/schema';
import type { Closure, ExportRow } from './schema';

/** Taille d'une page de lecture : le plafond par défaut de PostgREST chez Supabase. */
const PAGE = 1000;

/**
 * Au plus 50 000 lignes exportées.
 * WHY: au-delà, l'export est refusé (`too_large`) plutôt que tronqué : un fichier incomplet
 * tromperait la famille.
 */
export const EXPORT_MAX_ROWS = 50_000;

const EXPORT_COLUMNS =
  'id, kind, amount, method, party_name, budget_line_id, note, occurred_on, reverses_id, reverses_kind, pledge_id, created_at';

interface ExportDbRow {
  id: string;
  kind: EntryKind;
  amount: number | string;
  method: EntryMethod | null;
  party_name: string;
  budget_line_id: string | null;
  note: string;
  occurred_on: string;
  reverses_id: string | null;
  reverses_kind: Exclude<EntryKind, 'reversal'> | null;
  pledge_id: string | null;
  created_at: string;
}

const toRow = (r: ExportDbRow): ExportRow => ({
  id: r.id,
  kind: r.kind,
  amount: Number(r.amount),
  method: r.method,
  partyName: r.party_name,
  budgetLineId: r.budget_line_id,
  note: r.note,
  occurredOn: r.occurred_on,
  reversesId: r.reverses_id,
  reversesKind: r.reverses_kind,
  pledgeId: r.pledge_id,
  createdAt: r.created_at,
});

function fail(error: { code?: string; message?: string }) {
  return {
    data: null,
    error: { code: error.code || 'unknown', message: error.message || 'closing error' },
  };
}

/**
 * État de clôture des cotisations (tout membre, RLS) ; ouvertes tant que rien n'est réglé.
 *
 * @example
 * const { data } = await getClosure(dossierId); // { closedAt: '2026-10-28T09:00:00Z' }
 */
export async function getClosure(dossierId: string): Promise<RepoResult<Closure>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('dossier_finance')
    .select('closed_at')
    .eq('dossier_id', dossierId)
    .maybeSingle<{ closed_at: string | null }>();
  if (error) {
    console.error('[budget/closing] getClosure impossible', { code: error.code });
    return fail(error);
  }
  return { data: { closedAt: data?.closed_at ?? null }, error: null };
}

/** Clôture les cotisations (trésorier et plus, vérifié par la base) ; renvoie la date de clôture. */
export async function closeLedger(dossierId: string): Promise<RepoResult<string>> {
  const db = await getSupabaseServer();
  const { data, error } = await db.rpc('close_ledger', { p_dossier_id: dossierId });
  if (error) return fail(error);
  if (typeof data !== 'string') return fail({ code: 'unknown', message: 'closing error' });
  return { data, error: null };
}

/** Rouvre les cotisations (propriétaire seul, vérifié par la base). */
export async function reopenLedger(dossierId: string): Promise<RepoResult<true>> {
  const db = await getSupabaseServer();
  const { error } = await db.rpc('reopen_ledger', { p_dossier_id: dossierId });
  if (error) return fail(error);
  return { data: true, error: null };
}

/**
 * Toutes les lignes du registre visibles (RLS), triées par date, par pages.
 * WHY: lu avec le client de l'utilisateur ; seul un trésorier (ou plus) voit tout, et le service
 * de l'export l'exige. La pagination se fait sur (`created_at`, `id`), l'ordre de sortie
 * (`occurred_on` d'abord) est refait en mémoire. Une ligne commise pendant l'export peut décaler
 * une page, `now()` étant l'heure de début de transaction ; le dédoublonnage par id garantit
 * chaque ligne une seule fois.
 */
export async function listExportRows(dossierId: string): Promise<RepoResult<ExportRow[]>> {
  const db = await getSupabaseServer();
  const rows: ExportRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('ledger_entry')
      .select(EXPORT_COLUMNS)
      .eq('dossier_id', dossierId)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
      .returns<ExportDbRow[]>();
    if (error) {
      console.error('[budget/closing] listExportRows impossible', { code: error.code });
      return fail(error);
    }
    rows.push(...(data ?? []).map(toRow));
    // WHY: refus seulement au-delà du plafond ; un registre d'exactement 50 000 lignes passe.
    if (rows.length > EXPORT_MAX_ROWS) {
      return { data: null, error: { code: 'too_large', message: 'ledger too large to export' } };
    }
    if (!data || data.length < PAGE) break;
  }
  // WHY: une page décalée peut répéter une ligne ; `rows.length` (plafond) reste plus strict.
  const unique = [...new Map(rows.map((r) => [r.id, r])).values()];
  return { data: unique.sort(byOccurrence), error: null };
}

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const byOccurrence = (a: ExportRow, b: ExportRow) =>
  cmp(a.occurredOn, b.occurredOn) || cmp(a.createdAt, b.createdAt) || cmp(a.id, b.id);
