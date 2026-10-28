import 'server-only';
import { getSupabaseServer } from '@/lib/supabase/server';
import type { RepoResult } from '@/modules/dossier/repo';
import type { LedgerEntry, LedgerTotals } from './model';
import type { EntryKind, EntryMethod, Visibility } from './schema';

const COLUMNS =
  'id, kind, amount, method, party_name, member_id, pledge_id, budget_line_id, note, occurred_on, reverses_id, reverses_kind, created_at';

interface EntryRow {
  id: string;
  kind: EntryKind;
  amount: number;
  method: EntryMethod | null;
  party_name: string;
  member_id: string | null;
  pledge_id: string | null;
  budget_line_id: string | null;
  note: string;
  occurred_on: string;
  reverses_id: string | null;
  reverses_kind: LedgerEntry['reversesKind'];
  created_at: string;
}

/** Ligne à insérer ; auteur, dates et champs d'une annulation sont imposés par la base. */
export interface NewEntry {
  dossierId: string;
  kind: EntryKind;
  amount: number;
  method: EntryMethod | null;
  partyName: string;
  memberId: string | null;
  pledgeId: string | null;
  budgetLineId: string | null;
  note: string;
  occurredOn: string;
  reversesId: string | null;
  idempotencyKey: string;
}

const toEntry = (r: EntryRow): LedgerEntry => ({
  id: r.id,
  kind: r.kind,
  amount: r.amount,
  method: r.method,
  partyName: r.party_name,
  memberId: r.member_id,
  pledgeId: r.pledge_id,
  budgetLineId: r.budget_line_id,
  note: r.note,
  occurredOn: r.occurred_on,
  reversesId: r.reverses_id,
  reversesKind: r.reverses_kind,
  createdAt: r.created_at,
});

function fail(error: { code?: string; message?: string }) {
  return {
    data: null,
    error: { code: error.code || 'unknown', message: error.message || 'ledger error' },
  };
}

/**
 * Nombre maximal de lignes renvoyées par `listEntries`.
 * WHY: borne l'écran ; les totaux viennent de `ledger_totals`, calculés en base sur tout le
 * registre, et l'export CSV pagine au-delà.
 */
export const LEDGER_LIST_LIMIT = 500;

/** Lignes du registre que l'utilisateur peut voir (RLS), les plus récentes d'abord. */
export async function listEntries(dossierId: string): Promise<RepoResult<LedgerEntry[]>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('ledger_entry')
    .select(COLUMNS)
    .eq('dossier_id', dossierId)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(LEDGER_LIST_LIMIT)
    .returns<EntryRow[]>();
  if (error) {
    console.error('[budget/ledger] listEntries impossible', { code: error.code });
    return fail(error);
  }
  return { data: (data ?? []).map(toEntry), error: null };
}

const REPLAY_COLUMNS =
  'id, kind, amount, method, party_name, budget_line_id, note, occurred_on, reverses_id';

interface ReplayRow {
  id: string;
  kind: EntryKind;
  amount: number | string;
  method: EntryMethod | null;
  party_name: string;
  budget_line_id: string | null;
  note: string;
  occurred_on: string;
  reverses_id: string | null;
}

/**
 * La ligne relue après un double envoi est-elle la même saisie ?
 * WHY: une clé réutilisée par erreur pour une autre saisie ne doit pas faire disparaître cette
 * saisie en silence. Une annulation reçoit de la base le montant, le nom, le moyen et le poste de
 * la ligne visée, et sa date est le jour de l'envoi : on ne compare alors que la ligne visée.
 */
function sameEntry(row: ReplayRow, entry: NewEntry): boolean {
  if (row.kind !== entry.kind) return false;
  if (entry.kind === 'reversal') return row.reverses_id === entry.reversesId;
  return (
    Number(row.amount) === entry.amount &&
    row.party_name === entry.partyName &&
    row.occurred_on === entry.occurredOn &&
    row.budget_line_id === entry.budgetLineId &&
    row.method === entry.method &&
    row.note === entry.note
  );
}

/**
 * Insère une ligne. Un second envoi avec la même clé d'idempotence renvoie la ligne existante
 * (`duplicate: true`) plutôt qu'une erreur.
 */
export async function insertEntry(
  entry: NewEntry,
): Promise<RepoResult<{ id: string; duplicate: boolean }>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('ledger_entry')
    .insert({
      dossier_id: entry.dossierId,
      kind: entry.kind,
      amount: entry.amount,
      method: entry.method,
      party_name: entry.partyName,
      member_id: entry.memberId,
      pledge_id: entry.pledgeId,
      budget_line_id: entry.budgetLineId,
      note: entry.note,
      occurred_on: entry.occurredOn,
      reverses_id: entry.reversesId,
      idempotency_key: entry.idempotencyKey,
    })
    .select('id')
    .single<{ id: string }>();
  if (!error) return { data: { id: data.id, duplicate: false }, error: null };
  if (error.code === '23505') {
    const existing = await db
      .from('ledger_entry')
      .select(REPLAY_COLUMNS)
      .eq('dossier_id', entry.dossierId)
      .eq('idempotency_key', entry.idempotencyKey)
      .maybeSingle<ReplayRow>();
    if (existing.error) {
      console.error('[budget/ledger] insertEntry : relecture du double envoi impossible', {
        code: existing.error.code,
      });
    }
    if (existing.data) {
      if (!sameEntry(existing.data, entry)) {
        return {
          data: null,
          error: { code: 'idempotency_mismatch', message: 'idempotency key reused' },
        };
      }
      return { data: { id: existing.data.id, duplicate: true }, error: null };
    }
  }
  return fail(error);
}

/** Sommes du registre (reçu, promis non versé, dépensé), visibles de tout membre. */
export async function getTotals(dossierId: string): Promise<RepoResult<LedgerTotals>> {
  const db = await getSupabaseServer();
  const { data, error } = await db.rpc('ledger_totals', { p_dossier_id: dossierId });
  if (error) {
    console.error('[budget/ledger] getTotals impossible', { code: error.code });
    return fail(error);
  }
  const row = (Array.isArray(data) ? data[0] : data) as
    | { received: number | string; pledged_open: number | string; spent: number | string }
    | undefined;
  return {
    data: {
      received: Number(row?.received ?? 0),
      pledgedOpen: Number(row?.pledged_open ?? 0),
      spent: Number(row?.spent ?? 0),
    },
    error: null,
  };
}

/** Réglage de visibilité du dossier ; `restricted` tant que le propriétaire n'a rien choisi. */
export async function getVisibility(dossierId: string): Promise<RepoResult<Visibility>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('dossier_finance')
    .select('amounts_visibility')
    .eq('dossier_id', dossierId)
    .maybeSingle<{ amounts_visibility: Visibility }>();
  if (error) {
    console.error('[budget/ledger] getVisibility impossible', { code: error.code });
    return fail(error);
  }
  return { data: data?.amounts_visibility ?? 'restricted', error: null };
}

/** Change le réglage de visibilité (propriétaire seulement, vérifié par la RLS). */
export async function setVisibility(
  dossierId: string,
  visibility: Visibility,
): Promise<RepoResult<true>> {
  const db = await getSupabaseServer();
  const { error } = await db.from('dossier_finance').upsert(
    // WHY: updated_at vaut now() à l'insertion et un trigger le met à jour ensuite.
    { dossier_id: dossierId, amounts_visibility: visibility },
    { onConflict: 'dossier_id' },
  );
  if (error) return fail(error);
  return { data: true, error: null };
}
