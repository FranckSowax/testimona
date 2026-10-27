import { describe, expect, it } from 'vitest';
import { scenariosFor, attendanceFrom } from '../scenarios';
import {
  gridRows,
  lineViews,
  recomputeRows,
  referenceBudget,
  scenarioTotals,
  type BudgetLine,
} from './model';

const answers = {
  'attendance.close': 40,
  'attendance.extended': 60,
  'attendance.friends': 30,
  'attendance.community': 20,
  'attendance.nights': 2,
  'budget.level': 'sober',
};

const line = (over: Partial<BudgetLine>): BudgetLine => ({
  id: 'l1',
  gridKey: null,
  label: 'Traiteur',
  amounts: { sober: 100, intermediate: 200, full: 300 },
  edited: false,
  position: 0,
  ...over,
});

describe('gridRows', () => {
  it('donne un poste par entrée de la grille avec les montants de l’estimation', () => {
    const rows = gridRows(answers, (key) => `label:${key}`);
    const expected = scenariosFor(attendanceFrom(answers)).lines;
    expect(rows).toHaveLength(expected.length);
    expect(rows[0]).toEqual({
      gridKey: expected[0]!.key,
      label: `label:${expected[0]!.key}`,
      amounts: expected[0]!.amounts,
      position: 0,
    });
    expect(rows.map((r) => r.position)).toEqual(expected.map((_, i) => i));
  });
});

describe('recomputeRows', () => {
  it('ne recalcule que les postes de la grille non modifiés', () => {
    const fresh = scenariosFor(attendanceFrom(answers)).lines;
    const rows = recomputeRows(
      [
        line({ id: 'a', gridKey: fresh[0]!.key, position: 0 }),
        line({ id: 'b', gridKey: fresh[1]!.key, edited: true }),
        line({ id: 'c', gridKey: null }),
        line({ id: 'd', gridKey: 'removedFromGrid' }),
      ],
      answers,
    );
    expect(rows).toEqual([{ id: 'a', amounts: fresh[0]!.amounts }]);
  });
});

describe('lineViews et scenarioTotals', () => {
  it('ajoute les dépenses par poste et trie par position', () => {
    const views = lineViews(
      [line({ id: 'b', position: 2 }), line({ id: 'a', position: 1 })],
      new Map([['a', 5_000]]),
    );
    expect(views.map((v) => [v.id, v.spent])).toEqual([
      ['a', 5_000],
      ['b', 0],
    ]);
  });

  it('additionne les postes pour chaque scénario', () => {
    expect(scenarioTotals([line({}), line({ id: 'l2' })])).toEqual({
      sober: 200,
      intermediate: 400,
      full: 600,
    });
  });
});

describe('referenceBudget', () => {
  it('prend le total du scénario retenu quand il existe des postes', () => {
    expect(referenceBudget('full', [line({})], answers)).toEqual({
      amount: 300,
      source: 'retained',
    });
  });

  it('revient au budget envisagé sans scénario ou sans poste', () => {
    const envisaged = scenariosFor(attendanceFrom(answers)).totals.sober;
    expect(referenceBudget(null, [line({})], answers)).toEqual({
      amount: envisaged,
      source: 'envisaged',
    });
    expect(referenceBudget('full', [], answers)?.source).toBe('envisaged');
    expect(referenceBudget(null, [], { ...answers, 'budget.level': undefined })).toBeNull();
  });
});
