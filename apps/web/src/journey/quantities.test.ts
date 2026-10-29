import { describe, expect, it } from 'vitest';
import { AMOUNT_MAX } from '@/modules/budget/scenarios';
import { estimateFor, ESTIMATE_KEYS, hasEstimate, wakeGuestsOf } from './quantities';
import { allSteps } from './registry';

const ATTENDANCE = {
  'attendance.close': 40,
  'attendance.extended': 60,
  'attendance.friends': 30,
  'attendance.community': 20,
  'attendance.nights': 2,
};

const cost = (estimate: ReturnType<typeof estimateFor>, gridKey: string) =>
  estimate?.costs.find((c) => c.gridKey === gridKey)?.amounts;

describe('estimateFor', () => {
  it('renvoie null sans affluence ou pour une étape sans estimation', () => {
    expect(estimateFor('vigil-setup', { 'vigil.shelter': 'tents' })).toBeNull();
    expect(estimateFor('biography', ATTENDANCE)).toBeNull();
    expect(hasEstimate('vigil-setup')).toBe(true);
    expect(hasEstimate('vigil-catering')).toBe(true);
    expect(hasEstimate('biography')).toBe(false);
  });

  it("prend le niveau de l'étape B.2, sinon le niveau intermédiaire", () => {
    expect(estimateFor('vigil-setup', ATTENDANCE)?.level).toBe('intermediate');
    expect(estimateFor('vigil-setup', { ...ATTENDANCE, 'budget.level': 'full' })?.level).toBe(
      'full',
    );
  });

  it("lit l'affluence, les nuits et le niveau", () => {
    expect(ESTIMATE_KEYS).toEqual([
      'attendance.close',
      'attendance.extended',
      'attendance.friends',
      'attendance.community',
      'attendance.nights',
      'budget.level',
    ]);
  });
});

describe('installation de la veillée (3.1)', () => {
  const answers = {
    ...ATTENDANCE,
    'vigil.shelter': 'tents',
    'vigil.seating': 'chairs',
    'vigil.sound': 'yes',
    'vigil.lighting': 'yes',
  };

  it("compte tentes, chaises, lumières et sonorisation sur l'affluence haute", () => {
    expect(estimateFor('vigil-setup', answers)?.quantities).toEqual([
      { key: 'tents', count: 4 },
      { key: 'chairs', count: 188 },
      { key: 'lightSets', count: 4 },
      { key: 'soundSystems', count: 1 },
    ]);
  });

  it('chiffre tentes et chaises puis sonorisation avec la grille', () => {
    const estimate = estimateFor('vigil-setup', answers);
    expect(cost(estimate, 'tentsChairs')).toEqual({
      sober: 188_000,
      intermediate: 300_800,
      full: 451_200,
    });
    expect(cost(estimate, 'sound')).toEqual({
      sober: 150_000,
      intermediate: 300_000,
      full: 600_000,
    });
  });

  it('partage chaises et bancs, et une seule lumière dans une salle', () => {
    const estimate = estimateFor('vigil-setup', {
      ...ATTENDANCE,
      'vigil.shelter': 'hall',
      'vigil.seating': 'mixed',
      'vigil.lighting': 'yes',
      'vigil.sound': 'no',
    });
    expect(estimate?.quantities).toEqual([
      { key: 'chairs', count: 94 },
      { key: 'benchPlaces', count: 94 },
      { key: 'lightSets', count: 1 },
    ]);
    expect(cost(estimate, 'sound')).toBeUndefined();
  });

  it("n'invente rien pour les questions sans réponse", () => {
    const estimate = estimateFor('vigil-setup', {
      ...ATTENDANCE,
      'vigil.sound': { skipped: true },
    });
    expect(estimate?.quantities).toEqual([]);
    expect(estimate?.costs).toEqual([]);
  });
});

describe('restauration de la veillée (3.2)', () => {
  it('compte assiettes, eau, boissons et glace', () => {
    const estimate = estimateFor('vigil-catering', {
      ...ATTENDANCE,
      'catering.served': 'meal',
      'catering.cook': 'caterer',
      'catering.drinks': 'soft',
      'catering.funeralMeal': 'yes',
    });
    expect(estimate?.quantities).toEqual([
      { key: 'platesPerNight', count: 94 },
      { key: 'funeralPlates', count: 188 },
      { key: 'waterPacks', count: 63 },
      { key: 'drinkBottles', count: 752 },
      { key: 'iceKg', count: 188 },
    ]);
    expect(cost(estimate, 'catering')?.intermediate).toBe(1_504_000);
    expect(cost(estimate, 'drinks')?.intermediate).toBe(752_000);
  });

  it("allège une collation et une cuisine familiale, renchérit l'alcool", () => {
    const estimate = estimateFor('vigil-catering', {
      ...ATTENDANCE,
      'catering.served': 'snack',
      'catering.cook': 'family',
      'catering.drinks': 'alcohol',
      'catering.funeralMeal': 'yes',
    });
    // (94 × 2 × 0,5 + 188) assiettes × 4 000 × 0,6
    expect(cost(estimate, 'catering')?.intermediate).toBe(676_800);
    // 376 invités × 2 000 × 1,5
    expect(cost(estimate, 'drinks')?.intermediate).toBe(1_128_000);
  });

  it("ne compte que l'eau si rien n'est servi", () => {
    const estimate = estimateFor('vigil-catering', {
      ...ATTENDANCE,
      'catering.served': 'nothing',
      'catering.funeralMeal': 'no',
    });
    expect(estimate?.quantities).toEqual([{ key: 'waterPacks', count: 63 }]);
    expect(cost(estimate, 'catering')).toBeUndefined();
  });

  it('ignore les options inconnues', () => {
    const setup = estimateFor('vigil-setup', { ...ATTENDANCE, 'vigil.seating': 'foo' });
    expect(setup?.quantities).toEqual([]);
    const estimate = estimateFor('vigil-catering', {
      ...ATTENDANCE,
      'catering.served': 'foo',
      'catering.drinks': 'foo',
    });
    expect(estimate?.quantities).toEqual([{ key: 'waterPacks', count: 63 }]);
    expect(estimate?.costs).toEqual([]);
  });

  it("ne sert pas d'assiettes par nuit sans nuit de veillée", () => {
    const estimate = estimateFor('vigil-catering', {
      ...ATTENDANCE,
      'attendance.nights': 0,
      'catering.served': 'meal',
      'catering.funeralMeal': 'no',
    });
    expect(estimate?.quantities.some((q) => q.key === 'platesPerNight')).toBe(false);
    expect(cost(estimate, 'catering')).toBeUndefined();
  });

  it("ne compte rien quand l'affluence répondue est nulle", () => {
    const zero = {
      'attendance.close': 0,
      'attendance.extended': 0,
      'attendance.friends': 0,
      'attendance.community': 0,
      'attendance.nights': 2,
    };
    const setup = estimateFor('vigil-setup', {
      ...zero,
      'vigil.shelter': 'tents',
      'vigil.seating': 'chairs',
      'vigil.lighting': 'yes',
      'vigil.sound': 'yes',
    });
    expect(setup?.quantities).toEqual([]);
    expect(setup?.costs).toEqual([]);
    const catering = estimateFor('vigil-catering', {
      ...zero,
      'catering.served': 'meal',
      'catering.drinks': 'soft',
      'catering.funeralMeal': 'yes',
    });
    expect(catering?.quantities).toEqual([]);
    expect(catering?.costs).toEqual([]);
  });

  it('plafonne un montant démesuré', () => {
    const estimate = estimateFor('vigil-catering', {
      'attendance.close': 500,
      'attendance.extended': 2000,
      'attendance.friends': 2000,
      'attendance.community': 2000,
      'attendance.nights': 7,
      'catering.served': 'meal',
      'catering.cook': 'caterer',
      'catering.funeralMeal': 'yes',
    });
    const catering = estimate?.costs.find((c) => c.gridKey === 'catering');
    expect(catering?.amounts.full).toBe(AMOUNT_MAX);
    expect(catering?.capped).toBe(true);
  });
});

describe('wakeGuestsOf', () => {
  it("arrondit au supérieur la part de l'affluence haute", () => {
    const base = { low: 0, nights: 1, answered: true, nightsAssumed: false };
    expect(wakeGuestsOf({ ...base, high: 4 })).toBe(2);
    expect(wakeGuestsOf({ ...base, high: 5 })).toBe(3);
  });
});

describe('registre', () => {
  it('donne une estimation à chaque étape à synthèse propre', () => {
    const missing = allSteps()
      .filter((step) => step.summary === 'step' && !hasEstimate(step.id))
      .map((step) => step.id);
    expect(missing).toEqual([]);
  });
});
