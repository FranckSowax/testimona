import type { PhotoError } from '../service';

/**
 * Erreur affichable de la photo : celles du service, plus deux du navigateur (envoi au stockage
 * en échec, photo illisible après réencodage).
 */
export type PhotoCaptureError = PhotoError | 'upload_failed' | 'unreadable';

/**
 * Espace de textes de chaque erreur.
 * WHY: un `Record` fait échouer le typecheck si un code est ajouté au service sans être aiguillé
 * ici (même gabarit que `receiptError`).
 */
const GROUP: Record<PhotoCaptureError, 'photo' | 'generic'> = {
  photo_type: 'photo',
  photo_size: 'photo',
  photo_missing: 'photo',
  photo_already_used: 'photo',
  upload_failed: 'photo',
  unreadable: 'photo',
  validation: 'generic',
  forbidden: 'generic',
  not_found: 'generic',
  unauthenticated: 'generic',
  unknown: 'generic',
};

/**
 * Texte d'une erreur de la photo, à partir d'un traducteur sans espace de noms.
 *
 * @example
 * const t = useTranslations();
 * photoErrorText('photo_missing', t); // « La photo n'est pas encore arrivée… »
 */
export function photoErrorText(error: PhotoCaptureError, t: (key: string) => string): string {
  return t(
    GROUP[error] === 'photo' ? `documents.photo.errors.${error}` : `dossier.errors.${error}`,
  );
}
