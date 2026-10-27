import { describe, expect, it } from 'vitest';
import { SKIPPED } from '@/journey/types';
import { LEVELS } from '@/journey/options';
import { BUDGET_GRID, GRID_KEYS, type GridItem } from './grid';
import {
  AMOUNT_MAX,
  attendanceFrom,
  chosenLevel,
  envisagedTotal,
  guestOccasionsOf,
  lineAmount,
  occasionsOf,
  scenariosFor,
} from './scenarios';

const answers = {
  'attendance.close': 20,
  'attendance.extended': 60,
  'attendance.friends': 40,
  'attendance.community': 30,
  'attendance.nights': 2,
};

describe('attendanceFrom', () => {
  it('additionne les cercles et ajoute 25 % pour la fourchette haute', () => {
    expect(attendanceFrom(answers)).toEqual({
      low: 150,
      high: 188,
      nights: 2,
      answered: true,
      nightsAssumed: false,
    });
  });

  it('ignore les réponses passées, absentes ou invalides', () => {
    expect(
      attendanceFrom({
        'attendance.close': 10,
        'attendance.extended': SKIPPED,
        'attendance.friends': '40',
        'attendance.community': -5,
      }),
    ).toEqual({ low: 10, high: 13, nights: 1, answered: true, nightsAssumed: true });
  });

  it('suppose une nuit sans réponse, et respecte zéro nuit répondu', () => {
    expect(attendanceFrom({})).toEqual({
      low: 0,
      high: 0,
      nights: 1,
      answered: false,
      nightsAssumed: true,
    });
    expect(attendanceFrom({ 'attendance.nights': 0 })).toEqual({
      low: 0,
      high: 0,
      nights: 0,
      answered: false,
      nightsAssumed: false,
    });
  });
});

describe('occasions', () => {
  it('compte le jour des obsèques plus les nuits, et la moitié des invités par veillée', () => {
    const attendance = attendanceFrom(answers);
    expect(occasionsOf(attendance)).toBe(3);
    expect(guestOccasionsOf(attendance)).toBe(376);
    expect(occasionsOf(attendanceFrom({ 'attendance.nights': 0 }))).toBe(1);
    expect(guestOccasionsOf(attendanceFrom({}))).toBe(0);
  });
});

describe('lineAmount', () => {
  const attendance = { low: 150, high: 188, nights: 2, answered: true, nightsAssumed: false };
  const item = (mode: GridItem['mode']): GridItem => ({
    key: 'demo',
    mode,
    cost: { sober: 100, intermediate: 200, full: 300 },
  });

  it('applique le mode de calcul du poste sur la fourchette haute', () => {
    expect(lineAmount(item('flat'), 'sober', attendance)).toBe(100);
    expect(lineAmount(item('perPerson'), 'sober', attendance)).toBe(18_800);
    expect(lineAmount(item('perOccasion'), 'intermediate', attendance)).toBe(600);
    expect(lineAmount(item('perGuestOccasion'), 'full', attendance)).toBe(112_800);
  });
});

describe('scenariosFor', () => {
  it('calcule chaque poste de la grille et les trois totaux', () => {
    const scenarios = scenariosFor(attendanceFrom(answers));
    expect(scenarios.lines.map((line) => line.key)).toEqual(BUDGET_GRID.map((item) => item.key));
    expect(scenarios.lines.find((line) => line.key === 'catering')?.amounts.sober).toBe(940_000);
    expect(scenarios.lines.every((line) => !line.capped)).toBe(true);
    expect(scenarios.totals.sober).toBe(2_409_000);
    expect(scenarios.totals.sober).toBeLessThan(scenarios.totals.intermediate);
    expect(scenarios.totals.intermediate).toBeLessThan(scenarios.totals.full);
  });

  it('se limite aux postes forfaitaires et par occasion sans affluence', () => {
    const scenarios = scenariosFor(attendanceFrom({}));
    expect(scenarios.lines.find((line) => line.key === 'catering')?.amounts.full).toBe(0);
    expect(scenarios.totals.sober).toBe(855_000);
  });

  it('plafonne chaque montant aux bornes et signale la ligne', () => {
    const scenarios = scenariosFor(
      attendanceFrom({
        'attendance.close': 500,
        'attendance.extended': 2_000,
        'attendance.friends': 2_000,
        'attendance.community': 2_000,
        'attendance.nights': 7,
      }),
    );
    for (const line of scenarios.lines) {
      for (const level of LEVELS) expect(line.amounts[level]).toBeLessThanOrEqual(AMOUNT_MAX);
    }
    const catering = scenarios.lines.find((line) => line.key === 'catering');
    expect(catering?.amounts.full).toBe(AMOUNT_MAX);
    expect(catering?.capped).toBe(true);
    expect(catering?.amounts.sober).toBe(91_415_000);
    expect(scenarios.lines.find((line) => line.key === 'mortuary')?.capped).toBe(false);
    const sum = scenarios.lines.reduce((total, line) => total + line.amounts.full, 0);
    expect(scenarios.totals.full).toBe(sum);
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
    expect(GRID_KEYS).toEqual(keys);
    for (const { key, cost } of BUDGET_GRID) {
      for (const level of LEVELS) expect(Number.isInteger(cost[level]), key).toBe(true);
      expect(cost.sober, key).toBeGreaterThan(0);
      expect(cost.sober, key).toBeLessThan(cost.intermediate);
      expect(cost.intermediate, key).toBeLessThan(cost.full);
    }
  });
});

describe('envisagedTotal', () => {
  it('donne le total du niveau envisagé, ou null sans niveau', () => {
    const withLevel = { ...answers, 'budget.level': 'sober' };
    expect(envisagedTotal(withLevel)).toBe(scenariosFor(attendanceFrom(withLevel)).totals.sober);
    expect(envisagedTotal(answers)).toBeNull();
  });
});
