import { LEVELS, type Level } from '@/journey/options';
import type { Answers } from '@/journey/progress';
import { attendanceFrom, envisagedTotal, scenariosFor } from '../scenarios';

/** Poste du budget tel que lu en base. */
export interface BudgetLine {
  id: string;
  gridKey: string | null;
  label: string;
  amounts: Readonly<Record<Level, number>>;
  edited: boolean;
  position: number;
}

/** Poste prêt à afficher, avec les dépenses actives qui lui sont rattachées. */
export interface LineView extends BudgetLine {
  spent: number;
}

/** Poste de la grille à créer. */
export interface GridRow {
  gridKey: string;
  label: string;
  amounts: Readonly<Record<Level, number>>;
  position: number;
}

/** Nouveaux montants d'un poste de la grille recalculé. */
export interface RecomputedRow {
  id: string;
  amounts: Readonly<Record<Level, number>>;
}

/** Clé des dépenses sans poste dans le total des dépenses par poste. */
export const UNASSIGNED_KEY = '';

export type BudgetSource = 'retained' | 'envisaged';

/** Budget de référence de la famille et sa provenance. */
export interface ReferenceBudget {
  amount: number;
  source: BudgetSource;
}

/**
 * Postes de la grille avec les montants de l'estimation (affluence de l'étape B.1).
 *
 * @example
 * gridRows(answers, (key) => t(key)); // [{ gridKey: 'mortuary', label: 'Morgue…', … }]
 */
export function gridRows(answers: Answers, labelOf: (gridKey: string) => string): GridRow[] {
  return scenariosFor(attendanceFrom(answers)).lines.map((line, position) => ({
    gridKey: line.key,
    label: labelOf(line.key),
    amounts: { ...line.amounts },
    position,
  }));
}

/**
 * Montants à jour des postes de la grille que personne n'a modifiés.
 * WHY: un poste modifié à la main ou libre garde ses montants ; un poste dont la clé a quitté la
 * grille n'est pas touché.
 */
export function recomputeRows(lines: readonly BudgetLine[], answers: Answers): RecomputedRow[] {
  const fresh = new Map(
    scenariosFor(attendanceFrom(answers)).lines.map((line) => [line.key, line.amounts]),
  );
  return lines.flatMap((line) => {
    const amounts = !line.edited && line.gridKey ? fresh.get(line.gridKey) : undefined;
    // WHY: ne renvoyer que les postes qui changent évite des écritures inutiles.
    const changed = amounts && LEVELS.some((level) => amounts[level] !== line.amounts[level]);
    return amounts && changed ? [{ id: line.id, amounts: { ...amounts } }] : [];
  });
}

/** Postes triés par position, avec leurs dépenses (0 si aucune). */
export function lineViews(
  lines: readonly BudgetLine[],
  spentByLine: ReadonlyMap<string, number>,
): LineView[] {
  return [...lines]
    .sort(
      (a, b) =>
        a.position - b.position || a.label.localeCompare(b.label, 'fr') || a.id.localeCompare(b.id),
    )
    .map((line) => ({ ...line, spent: spentByLine.get(line.id) ?? 0 }));
}

/** Total des postes pour chaque scénario. */
export function scenarioTotals(lines: readonly BudgetLine[]): Record<Level, number> {
  const totals: Record<Level, number> = { sober: 0, intermediate: 0, full: 0 };
  for (const line of lines) for (const level of LEVELS) totals[level] += line.amounts[level];
  return totals;
}

/**
 * Budget de référence : total des postes du scénario retenu, sinon budget envisagé à l'étape B.2,
 * sinon null.
 *
 * @example
 * referenceBudget('intermediate', lines, answers); // { amount: 3_100_000, source: 'retained' }
 */
export function referenceBudget(
  scenario: Level | null,
  lines: readonly BudgetLine[],
  answers: Answers,
): ReferenceBudget | null {
  if (scenario && lines.length > 0) {
    return { amount: scenarioTotals(lines)[scenario], source: 'retained' };
  }
  const envisaged = envisagedTotal(answers);
  return envisaged === null ? null : { amount: envisaged, source: 'envisaged' };
}
