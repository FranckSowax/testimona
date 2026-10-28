import type { LinesError } from '../service';

/** Erreurs propres aux postes, traduites dans `lines.errors` ; les autres dans `dossier.errors`. */
const LINES_SPECIFIC: ReadonlySet<LinesError> = new Set([
  'line_in_use',
  'no_attendance',
  'too_many_lines',
  'closed',
]);

/**
 * Texte d'une erreur des postes, à partir d'un traducteur sans espace de noms.
 * WHY: un seul aiguillage pour tous les écrans des postes, au lieu d'un mappage par composant.
 *
 * @example
 * const t = useTranslations();
 * linesErrorText('no_attendance', t); // « Renseignez d'abord l'affluence… »
 */
export function linesErrorText(error: LinesError, t: (key: string) => string): string {
  return t(LINES_SPECIFIC.has(error) ? `lines.errors.${error}` : `dossier.errors.${error}`);
}
