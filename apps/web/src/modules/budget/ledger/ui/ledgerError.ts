import type { LedgerError } from '../service';

/** Erreurs Zod des champs du registre vers leur texte (relatif à l'espace `ledger`). */
export const FIELD_MESSAGES: Record<string, string> = {
  'invalid number': 'errors.invalidNumber',
  'out of range': 'errors.outOfRange',
  'invalid date': 'errors.invalidDate',
  required: 'errors.required',
  'too long': 'errors.tooLong',
  'invalid character': 'errors.invalidCharacter',
};

/** Erreurs propres au registre ; les autres reprennent `dossier.errors`. */
const LEDGER_SPECIFIC = [
  'already_reversed',
  'pledge_unavailable',
  'receipt_unlinked',
  'receipt_unavailable',
  'changed_since_saved',
] as const;

export function isLedgerSpecific(error: LedgerError): error is (typeof LEDGER_SPECIFIC)[number] {
  return (LEDGER_SPECIFIC as readonly LedgerError[]).includes(error);
}
