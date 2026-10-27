import 'server-only';
import type { z } from 'zod';
import { isStepOpen } from '@/journey/registry';
import { getDossier } from '@/modules/dossier/repo';
import { fieldErrors } from '@/modules/dossier/service';
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
  | 'unknown';

export type LedgerResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: LedgerError; fieldErrors?: Record<string, string> };

// WHY: 'idempotency_mismatch' (clé réutilisée pour une autre saisie, signe d'un bug d'écran) reste
// volontairement hors table : fromRepo la journalise et renvoie 'unknown'.
const CODES: Record<string, LedgerError> = {
  '42501': 'forbidden',
  '28000': 'unauthenticated',
  '23514': 'validation',
  '22P02': 'validation',
  '23503': 'validation',
  TL001: 'validation',
  TL002: 'pledge_unavailable',
  TL003: 'validation',
};

function fromRepo(error: { code: string }, scope: string): { ok: false; error: LedgerError } {
  const mapped = CODES[error.code];
  if (!mapped) console.error(`[budget/ledger] ${scope} failed`, { code: error.code });
  return { ok: false, error: mapped ?? 'unknown' };
}

function invalid(error: z.ZodError): {
  ok: false;
  error: LedgerError;
  fieldErrors: Record<string, string>;
} {
  return { ok: false, error: 'validation', fieldErrors: fieldErrors(error.issues) };
}

/** Le registre n'existe que pour un dossier lisible ouvert au budget (porte « décès »). */
async function checkDossier(dossierId: string): Promise<LedgerError | null> {
  const dossier = await getDossier(dossierId);
  // WHY: un dossier sans étape budget n'a pas de registre : on le traite comme absent.
  if (!dossier || !isStepOpen(dossier.entryPoint, 'attendance')) return 'not_found';
  return null;
}

async function write(entry: NewEntry, scope: string): Promise<LedgerResult<{ id: string }>> {
  const blocked = await checkDossier(entry.dossierId);
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
      note: d.note,
      occurredOn: d.occurredOn,
      reversesId: null,
      idempotencyKey: d.idempotencyKey,
    },
    'recordReceipt',
  );
}

/** Dépense (trésorier et plus) ; `partyName` est le fournisseur. */
export async function recordExpense(raw: unknown) {
  const input = ExpenseSchema.safeParse(raw);
  if (!input.success) return invalid(input.error);
  const d = input.data;
  return write(
    {
      dossierId: d.dossierId,
      kind: 'expense',
      amount: d.amount,
      method: d.method,
      partyName: d.partyName,
      memberId: null,
      pledgeId: null,
      note: d.note,
      occurredOn: d.occurredOn,
      reversesId: null,
      idempotencyKey: d.idempotencyKey,
    },
    'recordExpense',
  );
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
  const blocked = await checkDossier(input.data.dossierId);
  if (blocked) return { ok: false, error: blocked };
  const res = await repo.setVisibility(input.data.dossierId, input.data.visibility);
  if (res.error) return fromRepo(res.error, 'setVisibility');
  return { ok: true, data: { visibility: input.data.visibility } };
}
