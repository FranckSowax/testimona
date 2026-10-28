import type { ReadError } from '../service';

/** Erreur affichable du reçu : celles du service, plus l'envoi au stockage en échec. */
export type CaptureError = ReadError | 'upload_failed';

/**
 * Espace de textes de chaque erreur.
 * WHY: un `Record` fait échouer le typecheck si un code est ajouté au service sans être aiguillé
 * ici. `manual` : l'IA n'a pas lu le reçu, mais la photo reste jointe (saisie manuelle).
 */
const GROUP: Record<CaptureError, 'errors' | 'manual' | 'generic'> = {
  receipt_type: 'errors',
  receipt_size: 'errors',
  too_many_receipts: 'errors',
  upload_failed: 'errors',
  unavailable: 'manual',
  quota: 'manual',
  failed: 'manual',
  too_large_to_read: 'manual',
  validation: 'generic',
  forbidden: 'generic',
  not_found: 'generic',
  unauthenticated: 'generic',
  unknown: 'generic',
};

/** Vrai quand l'IA n'a pas lu le reçu mais que la photo reste jointe (saisie manuelle). */
export const isManualFallback = (error: CaptureError) => GROUP[error] === 'manual';

/**
 * Texte d'une erreur du reçu, à partir d'un traducteur sans espace de noms.
 *
 * @example
 * const t = useTranslations();
 * receiptErrorText('quota', t); // « Photo jointe. La limite de lectures… »
 */
export function receiptErrorText(error: CaptureError, t: (key: string) => string): string {
  const group = GROUP[error];
  if (group === 'manual') return t(`receipts.manual.${error}`);
  return t(group === 'errors' ? `receipts.errors.${error}` : `dossier.errors.${error}`);
}
