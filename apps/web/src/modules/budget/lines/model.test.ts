import { describe, expect, it } from 'vitest';
import { AMOUNT_MAX, scenariosFor, attendanceFrom } from '../scenarios';
import {
  gridRows,
  lineAdjustments,
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

describe('gridRows sans réponse', () => {
  it('donne quand même les postes de la grille', () => {
    const rows = gridRows({}, (key) => key);
    expect(rows).toHaveLength(scenariosFor(attendanceFrom({})).lines.length);
    expect(rows.every((r) => Object.values(r.amounts).every(Number.isFinite))).toBe(true);
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

  it('ne renvoie que les postes dont un montant change', () => {
    const fresh = scenariosFor(attendanceFrom(answers)).lines;
    const rows = recomputeRows(
      [
        line({ id: 'same', gridKey: fresh[0]!.key, amounts: { ...fresh[0]!.amounts } }),
        line({
          id: 'diff',
          gridKey: fresh[1]!.key,
          amounts: { sober: 1, intermediate: 2, full: 3 },
        }),
      ],
      answers,
    );
    expect(rows.map((r) => r.id)).toEqual(['diff']);
  });

  it('gère un poste plafonné : inchangé s’il est déjà au plafond, sinon ramené au plafond', () => {
    const huge = { ...answers, 'attendance.close': 1_000_000_000 };
    const fresh = scenariosFor(attendanceFrom(huge)).lines;
    const capped = fresh.find((l) => Object.values(l.amounts).some((v) => v === AMOUNT_MAX))!;
    expect(capped).toBeDefined();
    expect(
      recomputeRows([line({ id: 'x', gridKey: capped.key, amounts: { ...capped.amounts } })], huge),
    ).toEqual([]);
    const rows = recomputeRows(
      [line({ id: 'y', gridKey: capped.key, amounts: { sober: 0, intermediate: 0, full: 0 } })],
      huge,
    );
    expect(rows[0]!.amounts).toEqual(capped.amounts);
    expect(Math.max(...Object.values(rows[0]!.amounts))).toBeLessThanOrEqual(AMOUNT_MAX);
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

  it('départage deux postes de même position par libellé puis identifiant', () => {
    const views = lineViews(
      [
        line({ id: 'z', label: 'Fleurs', position: 1 }),
        line({ id: 'b', label: 'Eau', position: 1 }),
        line({ id: 'a', label: 'Eau', position: 1 }),
      ],
      new Map(),
    );
    expect(views.map((v) => v.id)).toEqual(['a', 'b', 'z']);
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

  it('garde la source retenue quand le total du scénario est zéro', () => {
    const zero = line({ amounts: { sober: 0, intermediate: 0, full: 0 } });
    expect(referenceBudget('full', [zero], answers)).toEqual({ amount: 0, source: 'retained' });
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

describe('lineAdjustments', () => {
  const adjustLine = (
    gridKey: string | null,
    amounts = { sober: 1, intermediate: 2, full: 3 },
  ) => ({
    id: `id-${gridKey}`,
    gridKey,
    label: `Poste ${gridKey}`,
    amounts,
    edited: false,
    position: 0,
  });
  const cost = (gridKey: string, amounts = { sober: 10, intermediate: 20, full: 30 }) => ({
    gridKey,
    amounts,
    capped: false,
  });

  it('associe chaque coût estimé au poste de même clé', () => {
    expect(
      lineAdjustments([cost('sound')], [adjustLine('tentsChairs'), adjustLine('sound')]),
    ).toEqual([
      {
        gridKey: 'sound',
        line: adjustLine('sound'),
        amounts: { sober: 10, intermediate: 20, full: 30 },
        upToDate: false,
      },
    ]);
  });

  it('ignore un coût sans poste et signale un poste déjà à jour', () => {
    const same = { sober: 10, intermediate: 20, full: 30 };
    const res = lineAdjustments(
      [cost('catering'), cost('drinks', same)],
      [adjustLine('drinks', same)],
    );
    expect(res.map((a) => [a.gridKey, a.upToDate])).toEqual([['drinks', true]]);
  });
});
