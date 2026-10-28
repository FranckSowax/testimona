import type { ClosingError } from '../service';

/** Erreurs propres à la clôture, traduites dans `closing.errors` ; les autres dans `dossier.errors`. */
const CLOSING_SPECIFIC: ReadonlySet<ClosingError> = new Set(['too_large']);

/**
 * Texte d'une erreur de la clôture, à partir d'un traducteur sans espace de noms.
 *
 * @example
 * const t = useTranslations();
 * closingErrorText('forbidden', (key) => t(key)); // « Vous n'avez pas les droits… »
 */
export function closingErrorText(error: ClosingError, t: (key: string) => string): string {
  return t(CLOSING_SPECIFIC.has(error) ? `closing.errors.${error}` : `dossier.errors.${error}`);
}
