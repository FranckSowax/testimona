import { z } from 'zod';
import { AMOUNT_MAX } from '../scenarios';

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

export const VISIBILITIES = ['restricted', 'members'] as const;
export type Visibility = (typeof VISIBILITIES)[number];

// WHY: text refuse le caractère NUL ; on le refuse avant la base.
const noNul = (s: string) => !s.includes('\u0000');

const uuid = z.string().uuid();

// WHY: un montant se saisit souvent avec des espaces (« 200 000 ») ; on ne retire que ceux-là.
const amount = z
  .string()
  .transform((s) => s.replace(/[\s\u00a0\u202f]/g, ''))
  .pipe(z.string().regex(/^\d{1,9}$/, 'invalid number'))
  .transform(Number)
  .pipe(z.number().int().min(1, 'out of range').max(AMOUNT_MAX, 'out of range'));

const partyName = z
  .string()
  .trim()
  .min(1, 'required')
  .max(120, 'too long')
  .refine(noNul, 'invalid character');

const note = z.string().trim().max(500, 'too long').refine(noNul, 'invalid character').default('');

const today = () => new Date().toISOString().slice(0, 10);

// WHY: une date vide vaut aujourd'hui ; un jour de marge couvre les fuseaux horaires.
const occurredOn = z
  .string()
  .optional()
  .transform((s) => (s && s.trim() ? s.trim() : today()))
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

export const PledgeSchema = z.object({
  dossierId: uuid,
  idempotencyKey: uuid,
  partyName,
  amount,
  note,
  occurredOn,
});
export type PledgeInput = z.infer<typeof PledgeSchema>;

export const ReceiptSchema = PledgeSchema.extend({
  method: z.enum(ENTRY_METHODS),
  memberId: optionalId,
  pledgeId: optionalId,
});
export type ReceiptInput = z.infer<typeof ReceiptSchema>;

export const ExpenseSchema = PledgeSchema.extend({ method: z.enum(ENTRY_METHODS) });
export type ExpenseInput = z.infer<typeof ExpenseSchema>;

export const ReversalSchema = z.object({ dossierId: uuid, idempotencyKey: uuid, entryId: uuid });
export type ReversalInput = z.infer<typeof ReversalSchema>;

export const VisibilitySchema = z.object({ dossierId: uuid, visibility: z.enum(VISIBILITIES) });
export type VisibilityInput = z.infer<typeof VisibilitySchema>;
