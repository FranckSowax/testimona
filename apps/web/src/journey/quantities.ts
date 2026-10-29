import { BUDGET_GRID, type GridItem } from '@/modules/budget/grid';
import {
  AMOUNT_MAX,
  ATTENDANCE_KEYS,
  type Attendance,
  attendanceFrom,
  chosenLevel,
  guestOccasionsOf,
  LEVEL_KEY,
  lineAmount,
  NIGHTS_KEY,
  WAKE_ATTENDANCE_RATIO,
} from '@/modules/budget/scenarios';
import { COOKS, DRINKS, LEVELS, type Level, SEATINGS, SERVINGS, SHELTERS, YES_NO } from './options';
import type { Answers } from './progress';

// WHY: ces ratios sont des estimations à vérifier, comme la grille du lot 2 ; ils donnent un
// ordre de grandeur avant les vrais prix des prestataires.
/** Places assises sous une tente de 5 × 10 m. */
export const SEATS_PER_TENT = 50;
/** Jeux de lumière par tente (une salle en reçoit un seul). */
export const LIGHT_SETS_PER_TENT = 1;
/** Eau par invité et par occasion, en litres. */
export const WATER_LITRES_PER_GUEST = 1.5;
/** Contenance d'un pack d'eau (6 bouteilles de 1,5 l), en litres. */
export const WATER_PACK_LITRES = 9;
/** Bouteilles de boisson par invité et par occasion. */
export const DRINKS_PER_GUEST = 2;
/** Glace par invité et par occasion, en kilogrammes. */
export const ICE_KG_PER_GUEST = 0.5;
/** Coût d'une collation rapporté à celui d'un repas. */
export const SNACK_COST_RATIO = 0.5;
/** Coût d'une cuisine familiale rapporté à celui d'un traiteur. */
export const FAMILY_COOKING_RATIO = 0.6;
/** Coût des boissons avec alcool rapporté à celui des boissons sans alcool. */
export const ALCOHOL_COST_RATIO = 1.5;

/** Quantités affichées ; libellés `journey.synthesis.quantity.<clé>`. */
export type QuantityKey =
  | 'tents'
  | 'chairs'
  | 'benchPlaces'
  | 'lightSets'
  | 'soundSystems'
  | 'platesPerNight'
  | 'funeralPlates'
  | 'waterPacks'
  | 'drinkBottles'
  | 'iceKg';

export interface Quantity {
  key: QuantityKey;
  count: number;
}

/** Coût estimé d'un poste de la grille, pour les trois niveaux. */
export interface CostLine {
  gridKey: string;
  amounts: Readonly<Record<Level, number>>;
  /** Vrai si le montant d'au moins un niveau a été ramené à `AMOUNT_MAX`. */
  capped: boolean;
}

export interface StepEstimate {
  attendance: Attendance;
  /** Niveau affiché : celui de l'étape B.2, sinon intermédiaire. */
  level: Level;
  quantities: readonly Quantity[];
  costs: readonly CostLine[];
}

type Estimator = (
  answers: Answers,
  attendance: Attendance,
) => Pick<StepEstimate, 'quantities' | 'costs'>;

/** Clés lues en plus des réponses de l'étape : affluence, nuits et niveau. */
export const ESTIMATE_KEYS: readonly string[] = [...ATTENDANCE_KEYS, NIGHTS_KEY, LEVEL_KEY];

/** Réponse d'une question à choix, sinon null (absente, passée, option inconnue). */
function choice<T extends string>(answers: Answers, key: string, options: readonly T[]): T | null {
  const value = answers[key];
  return typeof value === 'string' && (options as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

function gridItem(key: string): GridItem {
  const item = BUDGET_GRID.find((candidate) => candidate.key === key);
  if (!item) throw new Error(`Poste de la grille inconnu : ${key}`);
  return item;
}

/** Montants arrondis et plafonnés d'un poste, à partir d'un montant brut par niveau. */
function costLine(gridKey: string, raw: (level: Level) => number): CostLine {
  const amounts: Record<Level, number> = { sober: 0, intermediate: 0, full: 0 };
  let capped = false;
  for (const level of LEVELS) {
    const value = Math.round(raw(level));
    amounts[level] = Math.min(value, AMOUNT_MAX);
    capped ||= value > AMOUNT_MAX;
  }
  return { gridKey, amounts, capped };
}

/** Invités d'une nuit de veillée (même règle que `guestOccasionsOf`). */
export function wakeGuestsOf(attendance: Attendance): number {
  return Math.ceil(attendance.high * WAKE_ATTENDANCE_RATIO);
}

/**
 * 3.1 : abri, sièges, lumière et son.
 * WHY: dimensionné sur l'affluence haute, la réception du jour des obsèques se tenant en général
 * au même endroit que la veillée.
 */
const vigilSetup: Estimator = (answers, attendance) => {
  const peak = attendance.high;
  const shelter = choice(answers, 'vigil.shelter', SHELTERS);
  const seating = choice(answers, 'vigil.seating', SEATINGS);
  const sound = choice(answers, 'vigil.sound', YES_NO) === 'yes';
  const tents = Math.ceil(peak / SEATS_PER_TENT);
  const quantities: Quantity[] = [];
  if (shelter === 'tents' && tents > 0) quantities.push({ key: 'tents', count: tents });
  if (seating === 'chairs' && peak > 0) quantities.push({ key: 'chairs', count: peak });
  if (seating === 'benches' && peak > 0) quantities.push({ key: 'benchPlaces', count: peak });
  if (seating === 'mixed' && peak > 0) {
    const chairs = Math.ceil(peak / 2);
    quantities.push({ key: 'chairs', count: chairs });
    if (peak - chairs > 0) quantities.push({ key: 'benchPlaces', count: peak - chairs });
  }
  // WHY: sans invité, il n'y a rien à éclairer ni à sonoriser.
  if (choice(answers, 'vigil.lighting', YES_NO) === 'yes' && peak > 0) {
    const sets = shelter === 'tents' ? Math.max(1, tents * LIGHT_SETS_PER_TENT) : 1;
    quantities.push({ key: 'lightSets', count: sets });
  }
  if (sound && peak > 0) quantities.push({ key: 'soundSystems', count: 1 });

  const costs: CostLine[] = [];
  // WHY: une salle (`hall`) garde le chiffrage du poste tentes et chaises, qui couvre alors la
  // location de la salle et des sièges.
  if (shelter !== null || seating !== null) {
    const item = gridItem('tentsChairs');
    costs.push(costLine(item.key, (level) => lineAmount(item, level, attendance)));
  }
  if (sound) {
    const item = gridItem('sound');
    costs.push(costLine(item.key, (level) => lineAmount(item, level, attendance)));
  }
  return { quantities, costs };
};

/** 3.2 : assiettes, eau, boissons et glace. */
const vigilCatering: Estimator = (answers, attendance) => {
  const served = choice(answers, 'catering.served', SERVINGS);
  const drinks = choice(answers, 'catering.drinks', DRINKS);
  const funeralMeal = choice(answers, 'catering.funeralMeal', YES_NO) === 'yes';
  const platesPerNight =
    (served === 'snack' || served === 'meal') && attendance.nights > 0
      ? wakeGuestsOf(attendance)
      : 0;
  const funeralPlates = funeralMeal ? attendance.high : 0;
  const guests = guestOccasionsOf(attendance);

  const quantities: Quantity[] = [];
  if (platesPerNight > 0) quantities.push({ key: 'platesPerNight', count: platesPerNight });
  if (funeralPlates > 0) quantities.push({ key: 'funeralPlates', count: funeralPlates });
  // WHY: l'eau est servie à chaque occasion, même sans repas ni autre boisson.
  const waterPacks = Math.ceil((guests * WATER_LITRES_PER_GUEST) / WATER_PACK_LITRES);
  if (waterPacks > 0) quantities.push({ key: 'waterPacks', count: waterPacks });
  if (drinks !== null && guests > 0) {
    quantities.push(
      { key: 'drinkBottles', count: guests * DRINKS_PER_GUEST },
      { key: 'iceKg', count: Math.ceil(guests * ICE_KG_PER_GUEST) },
    );
  }

  const costs: CostLine[] = [];
  const servedRatio = served === 'snack' ? SNACK_COST_RATIO : 1;
  const plates = platesPerNight * attendance.nights * servedRatio + funeralPlates;
  if (plates > 0) {
    const item = gridItem('catering');
    const cookRatio =
      choice(answers, 'catering.cook', COOKS) === 'family' ? FAMILY_COOKING_RATIO : 1;
    costs.push(costLine(item.key, (level) => item.cost[level] * plates * cookRatio));
  }
  if (drinks !== null) {
    const item = gridItem('drinks');
    const ratio = drinks === 'alcohol' ? ALCOHOL_COST_RATIO : 1;
    costs.push(costLine(item.key, (level) => item.cost[level] * guests * ratio));
  }
  return { quantities, costs };
};

const ESTIMATORS: ReadonlyMap<string, Estimator> = new Map([
  ['vigil-setup', vigilSetup],
  ['vigil-catering', vigilCatering],
]);

/** Vrai si l'étape a une estimation (et donc une page de synthèse calculée). */
export function hasEstimate(stepId: string): boolean {
  return ESTIMATORS.has(stepId);
}

/**
 * Quantités et coûts estimés d'une étape, ou null sans estimation ou sans réponse à B.1.
 *
 * @example
 * estimateFor('vigil-setup', answers)?.quantities; // [{ key: 'tents', count: 4 }, …]
 */
export function estimateFor(stepId: string, answers: Answers): StepEstimate | null {
  const estimator = ESTIMATORS.get(stepId);
  const attendance = attendanceFrom(answers);
  if (!estimator || !attendance.answered) return null;
  const { quantities, costs } = estimator(answers, attendance);
  return {
    attendance,
    level: chosenLevel(answers) ?? 'intermediate',
    quantities,
    // WHY: sans invité, aucun coût n'a de sens, et un bouton « Mettre à jour le poste … : 0 XAF »
    // risquerait de remettre un poste du budget à zéro.
    costs: attendance.high === 0 ? [] : costs,
  };
}
