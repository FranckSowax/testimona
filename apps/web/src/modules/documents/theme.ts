import type { DocumentStyle } from './model';

/** Encre principale : couleur `foreground` de l'application (`globals.css`). */
const INK = '#2d3250';
/** Texte secondaire (dates, en-têtes de tableau) : couleur `muted` de l'application. */
const MUTED = '#788199';
/** Accent du style couleur (titres, date des obsèques) : couleur `primary` de l'application. */
const PRIMARY = '#50aac3';
/** Second accent du style couleur (filets de séparation) : couleur `accent` de l'application. */
const ROSE = '#db8186';
/** Fond des documents : blanc, pour l'impression comme pour le partage. */
const PAPER = '#ffffff';

/** Couleurs d'un gabarit. */
export interface DocumentTheme {
  /** Nom, textes, programme. */
  ink: string;
  /** Titres de section et date des obsèques. */
  accent: string;
  /** Dates de vie, en-têtes, intitulés des lieux. */
  muted: string;
  /** Filets de séparation et cadre de la photo. */
  rule: string;
  background: string;
}

/**
 * Couleurs des deux styles proposés à l'étape 3.5.
 * WHY: le texte courant reste dans l'encre sombre dans les deux styles ; seuls les titres et les
 * filets prennent la couleur, pour rester lisibles une fois imprimés ou vus sur un téléphone.
 *
 * @example
 * const theme = DOCUMENT_THEMES[data.style];
 */
export const DOCUMENT_THEMES: Record<DocumentStyle, DocumentTheme> = {
  sober: { ink: INK, accent: INK, muted: MUTED, rule: MUTED, background: PAPER },
  color: { ink: INK, accent: PRIMARY, muted: MUTED, rule: ROSE, background: PAPER },
};
