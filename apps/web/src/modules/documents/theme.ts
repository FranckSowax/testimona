import type { DocumentStyle } from './model';

/** Encre principale : couleur `foreground` de l'application (`globals.css`), 12,5:1 sur blanc. */
const INK = '#2d3250';
/** Texte secondaire (dates, en-têtes, lieux) : `muted` assombri, 5,6:1 sur blanc. */
const MUTED_TEXT = '#5f6880';
/** Titres et date des obsèques du style couleur : `primary` assombri, 4,8:1 sur blanc. */
const TEAL_TEXT = '#2b7c93';
/** Filets du style sobre : couleur `muted` de l'application, décorative seulement (3,9:1). */
const MUTED_LINE = '#788199';
/** Cadre et lignes du style couleur : couleur `primary`, décorative seulement (2,7:1). */
const PRIMARY = '#50aac3';
/** Filets de séparation du style couleur : couleur `accent`, décorative seulement (2,8:1). */
const ROSE = '#db8186';
/** Fond des documents : blanc, pour l'impression comme pour le partage. */
const PAPER = '#ffffff';

/** Couleurs d'un gabarit. */
export interface DocumentTheme {
  /** Texte : nom, textes, programme. */
  ink: string;
  /** Texte : titres de section et date des obsèques. */
  accent: string;
  /** Texte : dates de vie, en-têtes, intitulés des lieux. */
  muted: string;
  /** Décor : filets de séparation sous les titres et sous l'en-tête du programme. */
  rule: string;
  /** Décor : cadre de la photo et lignes du tableau. */
  frame: string;
  background: string;
}

/** Clés des couleurs de texte, qui doivent contraster à 4,5:1 au moins sur le fond (WCAG AA). */
export const TEXT_COLOR_KEYS = ['ink', 'accent', 'muted'] as const;

/**
 * Couleurs des deux styles proposés à l'étape 3.5.
 * WHY: les couleurs de la marque (`#50aac3`, `#db8186`, `#788199`) contrastent trop peu pour du
 * texte de 8 à 11 pt ; elles restent sur les filets et le cadre, et le texte prend des teintes
 * assombries lisibles une fois imprimées ou vues sur un téléphone.
 *
 * @example
 * const theme = DOCUMENT_THEMES[data.style];
 */
export const DOCUMENT_THEMES: Record<DocumentStyle, DocumentTheme> = {
  sober: {
    ink: INK,
    accent: INK,
    muted: MUTED_TEXT,
    rule: MUTED_LINE,
    frame: MUTED_LINE,
    background: PAPER,
  },
  color: {
    ink: INK,
    accent: TEAL_TEXT,
    muted: MUTED_TEXT,
    rule: ROSE,
    frame: PRIMARY,
    background: PAPER,
  },
};
