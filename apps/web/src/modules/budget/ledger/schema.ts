import { z } from 'zod';
import { AMOUNT_MAX } from '../scenarios';

/** Natures de ligne du registre : promesse, cotisation reçue, dépense, annulation. */
export const ENTRY_KINDS = ['pledge', 'receipt', 'expense', 'reversal'] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

/** Moyens de paiement notés dans le registre (aucun paiement ne passe par Testimona). */
export const ENTRY_METHODS = [
  'cash',
  'airtel_money',
  'moov_money',
  'transfer',
  'card',
  'other',
] as const;
export type EntryMethod = (typeof ENTRY_METHODS)[number];

/** Réglages de visibilité du registre : restreint (ses lignes) ou ouvert aux membres. */
export const VISIBILITIES = ['restricted', 'members'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

// WHY: text refuse le caractère NUL ; on le refuse avant la base.
const noNul = (s: string) => !s.includes('\u0000');

// WHY: Postgres compte en caractères (char_length), pas en unités UTF-16 : un emoji compte pour 1.
const maxChars = (n: number) => (s: string) => [...s].length <= n;

const uuid = z.string().uuid();

// WHY: un montant se saisit souvent avec des espaces (« 200 000 ») ; on ne retire que ceux-là.
const amount = z
  .string()
  .transform((s) => s.replace(/[\s\u00a0\u202f]/g, ''))
  .pipe(z.string().regex(/^\d+$/, 'invalid number'))
  .transform(Number)
  .pipe(
    z
      .number()
      .min(1, 'out of range')
      .max(AMOUNT_MAX, 'out of range')
      .refine(Number.isSafeInteger, 'out of range'),
  );

const partyName = z
  .string()
  .trim()
  .min(1, 'required')
  .refine(maxChars(120), 'too long')
  .refine(noNul, 'invalid character');

const note = z
  .string()
  .trim()
  .refine(maxChars(500), 'too long')
  .refine(noNul, 'invalid character')
  .default('');

const LEDGER_TIME_ZONE = 'Africa/Libreville';

/**
 * Date du jour (AAAA-MM-JJ) dans le fuseau du registre.
 * WHY: le Gabon et l'essentiel de la CEMAC sont en UTC+1 ; une date saisie juste après minuit ne
 * doit pas devenir la veille, ce qui arriverait avec la date UTC.
 *
 * @example
 * ledgerToday(); // '2026-10-27'
 */
export const ledgerToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: LEDGER_TIME_ZONE }).format(new Date());

// WHY: une date vide vaut aujourd'hui. Le plafond reflète le `current_date + 1` de la base (session
// UTC) ; ce jour de marge couvre UTC+1.
const occurredOn = z
  .string()
  .optional()
  .transform((s) => (s && s.trim() ? s.trim() : ledgerToday()))
  .pipe(
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid date')
      .refine((s) => {
        const date = new Date(`${s}T00:00:00Z`);
        const max = Date.now() + 24 * 60 * 60 * 1000;
        return (
          !Number.isNaN(date.getTime()) &&
          date.toISOString().slice(0, 10) === s &&
          Number(s.slice(0, 4)) >= 2000 &&
          date.getTime() <= max
        );
      }, 'invalid date'),
  );

const optionalId = z
  .union([uuid, z.literal('')])
  .optional()
  .transform((v) => (v ? v : null));

/** Saisie d'une promesse de cotisation. */
export const PledgeSchema = z.object({
  dossierId: uuid,
  idempotencyKey: uuid,
  partyName,
  amount,
  note,
  occurredOn,
});

/** Saisie d'une cotisation reçue, éventuellement liée à un membre et à une promesse. */
export const ReceiptSchema = PledgeSchema.extend({
  method: z.enum(ENTRY_METHODS),
  memberId: optionalId,
  pledgeId: optionalId,
});

/** Saisie d'une dépense payée, éventuellement rattachée à un poste du budget. */
export const ExpenseSchema = PledgeSchema.extend({
  method: z.enum(ENTRY_METHODS),
  budgetLineId: optionalId,
});

/** Demande d'annulation d'une ligne du registre. */
export const ReversalSchema = z.object({ dossierId: uuid, idempotencyKey: uuid, entryId: uuid });

/** Réglage de la visibilité du registre pour le dossier. */
export const VisibilitySchema = z.object({ dossierId: uuid, visibility: z.enum(VISIBILITIES) });
