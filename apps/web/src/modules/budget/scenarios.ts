import { LEVELS, type Level } from '@/journey/options';
import type { Answers } from '@/journey/progress';
import { BUDGET_GRID, type GridItem } from './grid';

/** Réponses de l'étape B.1 additionnées pour l'affluence. */
export const ATTENDANCE_KEYS = [
  'attendance.close',
  'attendance.extended',
  'attendance.friends',
  'attendance.community',
] as const;
export const NIGHTS_KEY = 'attendance.nights';
export const LEVEL_KEY = 'budget.level';

/**
 * WHY: les invités viennent souvent accompagnés ; la fourchette haute ajoute un quart.
 * Exporté pour les tests et la PR 2.
 */
export const ATTENDANCE_MARGIN = 1.25;

/**
 * WHY: le jour des obsèques reçoit toute l'affluence haute ; chaque nuit de veillée environ la
 * moitié. Exporté pour les tests et la PR 2.
 */
export const WAKE_ATTENDANCE_RATIO = 0.5;

/** Borne d'un montant du registre, en XAF (réutilisée en PR 2). */
export const AMOUNT_MAX = 100_000_000;

export interface Attendance {
  low: number;
  high: number;
  /** Nuits de veillée (le jour des obsèques n'en fait pas partie). */
  nights: number;
  /** Vrai si au moins un cercle a reçu une réponse. */
  answered: boolean;
  /** Vrai si la durée de la veillée n'a pas de réponse valide (une nuit supposée). */
  nightsAssumed: boolean;
}

export interface ScenarioLine {
  key: string;
  amounts: Readonly<Record<Level, number>>;
  /** Vrai si le montant d'au moins un niveau a été ramené à `AMOUNT_MAX`. */
  capped: boolean;
}

export interface Scenarios {
  lines: readonly ScenarioLine[];
  totals: Readonly<Record<Level, number>>;
}

/** Entier positif ou nul enregistré sous cette clé, sinon null (absent, passé, invalide). */
function count(answers: Answers, key: string): number | null {
  const value = answers[key];
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : null;
}

/**
 * Fourchette d'affluence et nombre de nuits, à partir des réponses de l'étape B.1.
 *
 * @example
 * attendanceFrom(answers); // { low: 150, high: 188, nights: 2, answered: true, nightsAssumed: false }
 */
export function attendanceFrom(answers: Answers): Attendance {
  const counts = ATTENDANCE_KEYS.map((key) => count(answers, key));
  const low = counts.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  const nights = count(answers, NIGHTS_KEY);
  return {
    low,
    high: Math.ceil(low * ATTENDANCE_MARGIN),
    // WHY: sans réponse on suppose une nuit de veillée ; un zéro répondu est respecté.
    nights: nights ?? 1,
    answered: counts.some((value) => value !== null),
    nightsAssumed: nights === null,
  };
}

/** Occasions : le jour des obsèques plus les nuits de veillée. */
export function occasionsOf(attendance: Attendance): number {
  return attendance.nights + 1;
}

/** Invités cumulés sur toutes les occasions : affluence haute, puis une part par veillée. */
export function guestOccasionsOf(attendance: Attendance): number {
  return attendance.high + Math.ceil(attendance.high * WAKE_ATTENDANCE_RATIO) * attendance.nights;
}

/** Montant brut (non plafonné) d'un poste pour un niveau. */
export function lineAmount(item: GridItem, level: Level, attendance: Attendance): number {
  const unit = item.cost[level];
  switch (item.mode) {
    case 'flat':
      return unit;
    case 'perPerson':
      return unit * attendance.high;
    case 'perOccasion':
      return unit * occasionsOf(attendance);
    case 'perGuestOccasion':
      return unit * guestOccasionsOf(attendance);
  }
}

const zeroTotals = (): Record<Level, number> => ({ sober: 0, intermediate: 0, full: 0 });

/**
 * Montants de chaque poste de la grille et totaux des trois scénarios.
 *
 * @example
 * scenariosFor(attendanceFrom(answers)).totals.sober; // 2 409 000
 */
export function scenariosFor(
  attendance: Attendance,
  grid: readonly GridItem[] = BUDGET_GRID,
): Scenarios {
  const totals = zeroTotals();
  const lines = grid.map((item): ScenarioLine => {
    const amounts = zeroTotals();
    let capped = false;
    for (const level of LEVELS) {
      const raw = lineAmount(item, level, attendance);
      // WHY: une affluence saisie démesurée ne doit pas dépasser la borne d'un montant du registre.
      amounts[level] = Math.min(raw, AMOUNT_MAX);
      capped ||= raw > AMOUNT_MAX;
      totals[level] += amounts[level];
    }
    return { key: item.key, amounts, capped };
  });
  return { lines, totals };
}

/** Niveau envisagé à l'étape B.2, ou null s'il n'est pas (ou plus) valide. */
export function chosenLevel(answers: Answers): Level | null {
  const value = answers[LEVEL_KEY];
  return typeof value === 'string' && (LEVELS as readonly string[]).includes(value)
    ? (value as Level)
    : null;
}

/**
 * Total du budget du niveau envisagé à l'étape B.2, ou null sans niveau choisi.
 * WHY: en attendant le scénario retenu par le trésorier (lot 2, PR 3), c'est la référence de
 * l'écran Cotisations et du tableau de bord.
 *
 * @example
 * envisagedTotal(answers); // 2 409 000
 */
export function envisagedTotal(answers: Answers): number | null {
  const level = chosenLevel(answers);
  return level ? scenariosFor(attendanceFrom(answers)).totals[level] : null;
}
