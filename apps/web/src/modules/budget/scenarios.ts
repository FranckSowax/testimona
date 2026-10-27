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

/** WHY: les invités viennent souvent accompagnés ; la fourchette haute ajoute un quart. */
export const ATTENDANCE_MARGIN = 1.25;

export interface Attendance {
  low: number;
  high: number;
  nights: number;
  /** Vrai si au moins un cercle a reçu une réponse. */
  answered: boolean;
}

export interface ScenarioLine {
  key: string;
  amounts: Record<Level, number>;
}

export interface Scenarios {
  lines: ScenarioLine[];
  totals: Record<Level, number>;
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
 * attendanceFrom(answers); // { low: 150, high: 188, nights: 2, answered: true }
 */
export function attendanceFrom(answers: Answers): Attendance {
  const counts = ATTENDANCE_KEYS.map((key) => count(answers, key));
  const low = counts.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  return {
    low,
    high: Math.ceil(low * ATTENDANCE_MARGIN),
    // WHY: sans veillée déclarée, la journée des obsèques compte pour une nuit de calcul.
    nights: Math.max(1, count(answers, NIGHTS_KEY) ?? 1),
    answered: counts.some((value) => value !== null),
  };
}

/** Montant d'un poste pour un niveau, sur la fourchette haute d'affluence. */
export function lineAmount(item: GridItem, level: Level, attendance: Attendance): number {
  const unit = item.cost[level];
  switch (item.mode) {
    case 'flat':
      return unit;
    case 'perPerson':
      return unit * attendance.high;
    case 'perNight':
      return unit * attendance.nights;
    case 'perPersonNight':
      return unit * attendance.high * attendance.nights;
  }
}

const zeroTotals = (): Record<Level, number> => ({ sober: 0, intermediate: 0, full: 0 });

/**
 * Montants de chaque poste de la grille et totaux des trois scénarios.
 *
 * @example
 * scenariosFor(attendanceFrom(answers)).totals.sober; // 2 359 000
 */
export function scenariosFor(
  attendance: Attendance,
  grid: readonly GridItem[] = BUDGET_GRID,
): Scenarios {
  const totals = zeroTotals();
  const lines = grid.map((item) => {
    const amounts = zeroTotals();
    for (const level of LEVELS) {
      amounts[level] = lineAmount(item, level, attendance);
      totals[level] += amounts[level];
    }
    return { key: item.key, amounts };
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
