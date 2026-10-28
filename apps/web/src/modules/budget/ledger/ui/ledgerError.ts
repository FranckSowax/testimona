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
export function isLedgerSpecific(
  error: LedgerError,
): error is 'already_reversed' | 'pledge_unavailable' | 'receipt_unlinked' {
  return (
    error === 'already_reversed' || error === 'pledge_unavailable' || error === 'receipt_unlinked'
  );
}
