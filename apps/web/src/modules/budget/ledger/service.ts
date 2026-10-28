import 'server-only';
import type { z } from 'zod';
import { fieldErrors } from '@/modules/dossier/service';
import { budgetGate } from '../gate';
import { attachReceipt } from '../receipts/repo';
import * as repo from './repo';
import type { NewEntry } from './repo';
import {
  ExpenseSchema,
  PledgeSchema,
  ReceiptSchema,
  ReversalSchema,
  VisibilitySchema,
  type Visibility,
  ledgerToday,
} from './schema';

export type LedgerError =
  | 'validation'
  | 'forbidden'
  | 'not_found'
  | 'unauthenticated'
  | 'already_reversed'
  | 'pledge_unavailable'
  | 'receipt_unlinked'
  | 'receipt_unavailable'
  | 'changed_since_saved'
  | 'unknown';

export type LedgerResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: LedgerError; fieldErrors?: Record<string, string> };

const CODES: Record<string, LedgerError> = {
  // WHY: clé rejouée pour une saisie modifiée (souvent un formulaire corrigé après un échec) :
  // l'écran demande de repartir d'un formulaire vide. fromRepo la journalise aussi, car elle peut
  // signaler un bug d'écran.
  idempotency_mismatch: 'changed_since_saved',
  '42501': 'forbidden',
  '28000': 'unauthenticated',
  '23514': 'validation',
  '22P02': 'validation',
  '23503': 'validation',
  TL001: 'validation',
  TL002: 'pledge_unavailable',
  TL003: 'validation',
  // WHY: poste d'un autre dossier ; un poste d'un autre type de ligne donne 23514.
  TL004: 'validation',
};

function fromRepo(error: { code: string }, scope: string): { ok: false; error: LedgerError } {
  const mapped = CODES[error.code];
  if (!mapped || error.code === 'idempotency_mismatch') {
    console.error(`[budget/ledger] ${scope} failed`, { code: error.code });
  }
  return { ok: false, error: mapped ?? 'unknown' };
}

function invalid(error: z.ZodError): {
  ok: false;
  error: LedgerError;
  fieldErrors: Record<string, string>;
} {
  return { ok: false, error: 'validation', fieldErrors: fieldErrors(error.issues) };
}

async function write(entry: NewEntry, scope: string): Promise<LedgerResult<{ id: string }>> {
  const blocked = await budgetGate(entry.dossierId);
  if (blocked) return { ok: false, error: blocked };
  const res = await repo.insertEntry(entry);
  if (res.error) {
    // WHY: le dépôt résout le double envoi ; une unicité encore violée ne s'explique que par une
    // seconde annulation de la même ligne. Pour un autre type, c'est inattendu.
    if (res.error.code === '23505') {
      if (entry.kind === 'reversal') return { ok: false, error: 'already_reversed' };
      console.error(`[budget/ledger] ${scope} failed`, { code: res.error.code });
      return { ok: false, error: 'unknown' };
    }
    return fromRepo(res.error, scope);
  }
  return { ok: true, data: { id: res.data.id } };
}

/**
 * Promesse de l'utilisateur courant (contributeur et plus, vérifié par la RLS).
 *
 * @example
 * await recordPledge({ dossierId, idempotencyKey, partyName: 'Awa', amount: '50 000' }, userId);
 */
export async function recordPledge(raw: unknown, userId: string) {
  const input = PledgeSchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const { dossierId, idempotencyKey, partyName, amount, note, occurredOn } = input.data;
  return write(
    {
      dossierId,
      kind: 'pledge',
      amount,
      method: null,
      partyName,
      memberId: userId,
      pledgeId: null,
      budgetLineId: null,
      note,
      occurredOn,
      reversesId: null,
      idempotencyKey,
    },
    'recordPledge',
  );
}

/** Cotisation reçue (trésorier et plus), liée ou non à un membre et à une promesse. */
export async function recordReceipt(raw: unknown) {
  const input = ReceiptSchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const d = input.data;
  return write(
    {
      dossierId: d.dossierId,
      kind: 'receipt',
      amount: d.amount,
      method: d.method,
      partyName: d.partyName,
      memberId: d.memberId,
      pledgeId: d.pledgeId,
      budgetLineId: null,
      note: d.note,
      occurredOn: d.occurredOn,
      reversesId: null,
      idempotencyKey: d.idempotencyKey,
    },
    'recordReceipt',
  );
}

// WHY: reçu invisible, déjà rattaché ailleurs ou ligne invalide (TL008), dépense ayant déjà un
// reçu (23505) : renvoyer le formulaire n'y changera rien. Les autres échecs (TL006 : photo pas
// encore au stockage) peuvent réussir au renvoi.
const ATTACH_FINAL = new Set(['no_rows', '23505', 'TL008']);

/**
 * Dépense (trésorier et plus) ; `partyName` est le fournisseur. Un reçu préparé est rattaché
 * après l'enregistrement.
 * WHY: le registre est en ajout seul, la dépense reste si le rattachement échoue
 * (`receipt_unlinked`). Renvoyer le formulaire rejoue la même clé : le dépôt renvoie la dépense
 * existante et le rattachement est retenté (sans effet s'il avait réussi).
 */
export async function recordExpense(raw: unknown): Promise<LedgerResult<{ id: string }>> {
  const input = ExpenseSchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const d = input.data;
  const res = await write(
    {
      dossierId: d.dossierId,
      kind: 'expense',
      amount: d.amount,
      method: d.method,
      partyName: d.partyName,
      memberId: null,
      pledgeId: null,
      budgetLineId: d.budgetLineId,
      note: d.note,
      occurredOn: d.occurredOn,
      reversesId: null,
      idempotencyKey: d.idempotencyKey,
    },
    'recordExpense',
  );
  if (!res.ok || !d.receiptId) return res;
  const linked = await attachReceipt(d.dossierId, d.receiptId, res.data.id);
  if (linked.error) {
    console.error('[budget/ledger] attachReceipt failed', { code: linked.error.code });
    return {
      ok: false,
      error: ATTACH_FINAL.has(linked.error.code) ? 'receipt_unavailable' : 'receipt_unlinked',
    };
  }
  return res;
}

/**
 * Annule une ligne (trésorier et plus) : la base recopie montant, nom et membre.
 * WHY: le trigger remplace amount, party_name, member_id, method, pledge_id et reverses_kind ;
 * les valeurs envoyées pour ces champs ne servent qu'à remplir la ligne. occurred_on (le jour de
 * l'annulation) et note viennent bien du service.
 */
export async function reverseEntry(raw: unknown) {
  const input = ReversalSchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const { dossierId, idempotencyKey, entryId } = input.data;
  return write(
    {
      dossierId,
      kind: 'reversal',
      amount: 1,
      method: null,
      partyName: '-',
      memberId: null,
      pledgeId: null,
      budgetLineId: null,
      note: '',
      occurredOn: ledgerToday(),
      reversesId: entryId,
      idempotencyKey,
    },
    'reverseEntry',
  );
}

/** Réglage de visibilité des montants individuels (propriétaire seulement). */
export async function setVisibility(
  raw: unknown,
): Promise<LedgerResult<{ visibility: Visibility }>> {
  const input = VisibilitySchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const blocked = await budgetGate(input.data.dossierId);
  if (blocked) return { ok: false, error: blocked };
  const res = await repo.setVisibility(input.data.dossierId, input.data.visibility);
  if (res.error) return fromRepo(res.error, 'setVisibility');
  return { ok: true, data: { visibility: input.data.visibility } };
}
