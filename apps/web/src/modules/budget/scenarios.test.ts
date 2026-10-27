import { describe, expect, it } from 'vitest';
import { SKIPPED } from '@/journey/types';
import { BUDGET_GRID, type GridItem } from './grid';
import { attendanceFrom, chosenLevel, lineAmount, scenariosFor } from './scenarios';

const answers = {
  'attendance.close': 20,
  'attendance.extended': 60,
  'attendance.friends': 40,
  'attendance.community': 30,
  'attendance.nights': 2,
};

describe('attendanceFrom', () => {
  it('additionne les cercles et ajoute 25 % pour la fourchette haute', () => {
    expect(attendanceFrom(answers)).toEqual({ low: 150, high: 188, nights: 2, answered: true });
  });

  it('ignore les réponses passées, absentes ou invalides', () => {
    expect(
      attendanceFrom({
        'attendance.close': 10,
        'attendance.extended': SKIPPED,
        'attendance.friends': '40',
        'attendance.community': -5,
      }),
    ).toEqual({ low: 10, high: 13, nights: 1, answered: true });
  });

  it('compte au moins une nuit et signale une étape sans réponse', () => {
    expect(attendanceFrom({ 'attendance.nights': 0 })).toEqual({
      low: 0,
      high: 0,
      nights: 1,
      answered: false,
    });
  });
});

describe('lineAmount', () => {
  const attendance = { low: 150, high: 188, nights: 2, answered: true };
  const item = (mode: GridItem['mode']): GridItem => ({
    key: 'demo',
    mode,
    cost: { sober: 100, intermediate: 200, full: 300 },
  });

  it('applique le mode de calcul du poste sur la fourchette haute', () => {
    expect(lineAmount(item('flat'), 'sober', attendance)).toBe(100);
    expect(lineAmount(item('perPerson'), 'sober', attendance)).toBe(18_800);
    expect(lineAmount(item('perNight'), 'intermediate', attendance)).toBe(400);
    expect(lineAmount(item('perPersonNight'), 'full', attendance)).toBe(112_800);
  });
});

describe('scenariosFor', () => {
  it('calcule chaque poste de la grille et les trois totaux', () => {
    const scenarios = scenariosFor(attendanceFrom(answers));
    expect(scenarios.lines.map((line) => line.key)).toEqual(BUDGET_GRID.map((item) => item.key));
    expect(scenarios.lines.find((line) => line.key === 'catering')?.amounts.sober).toBe(940_000);
    expect(scenarios.totals.sober).toBe(2_359_000);
    expect(scenarios.totals.sober).toBeLessThan(scenarios.totals.intermediate);
    expect(scenarios.totals.intermediate).toBeLessThan(scenarios.totals.full);
  });

  it('se limite aux postes forfaitaires et par nuit sans affluence', () => {
    const scenarios = scenariosFor(attendanceFrom({}));
    expect(scenarios.lines.find((line) => line.key === 'catering')?.amounts.full).toBe(0);
    expect(scenarios.totals.sober).toBe(805_000);
  });
});

describe('chosenLevel', () => {
  it('reprend le niveau envisagé, sinon null', () => {
    expect(chosenLevel({ 'budget.level': 'intermediate' })).toBe('intermediate');
    expect(chosenLevel({ 'budget.level': 'luxury' })).toBeNull();
    expect(chosenLevel({ 'budget.level': SKIPPED })).toBeNull();
    expect(chosenLevel({})).toBeNull();
  });
});

describe('BUDGET_GRID', () => {
  it('a des clés uniques et des coûts entiers croissants par niveau', () => {
    const keys = BUDGET_GRID.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const { key, cost } of BUDGET_GRID) {
      expect(Number.isInteger(cost.sober), key).toBe(true);
      expect(cost.sober, key).toBeGreaterThan(0);
      expect(cost.sober, key).toBeLessThan(cost.intermediate);
      expect(cost.intermediate, key).toBeLessThan(cost.full);
    }
  });
});
