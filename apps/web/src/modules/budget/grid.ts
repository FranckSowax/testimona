import type { Level } from '@/journey/options';

/**
 * Mode de calcul d'un poste : forfait, par personne, par nuit de veillée, ou par personne et
 * par nuit.
 */
export type CostMode = 'flat' | 'perPerson' | 'perNight' | 'perPersonNight';

export interface GridItem {
  /** Clé stable (texte `budget.grid.<clé>`, et `budget_line.grid_key` à la PR 2). */
  key: string;
  mode: CostMode;
  /** Coût unitaire en XAF, par niveau. */
  cost: Readonly<Record<Level, number>>;
}

/**
 * Grille de référence des postes de funérailles à Libreville, en XAF.
 * WHY: ce sont des estimations à vérifier, affichées comme telles ; elles servent à donner un
 * ordre de grandeur avant les vrais prix des prestataires (lot 3). Les quantités (tentes,
 * repas, boissons) suivent la fourchette haute d'affluence et le nombre de nuits.
 */
export const BUDGET_GRID: readonly GridItem[] = [
  { key: 'mortuary', mode: 'flat', cost: { sober: 150_000, intermediate: 250_000, full: 400_000 } },
  { key: 'coffin', mode: 'flat', cost: { sober: 300_000, intermediate: 800_000, full: 2_000_000 } },
  { key: 'hearse', mode: 'flat', cost: { sober: 50_000, intermediate: 100_000, full: 200_000 } },
  { key: 'burial', mode: 'flat', cost: { sober: 100_000, intermediate: 200_000, full: 400_000 } },
  { key: 'service', mode: 'flat', cost: { sober: 25_000, intermediate: 50_000, full: 100_000 } },
  {
    key: 'tentsChairs',
    mode: 'perPersonNight',
    cost: { sober: 500, intermediate: 800, full: 1_200 },
  },
  {
    key: 'catering',
    mode: 'perPersonNight',
    cost: { sober: 2_500, intermediate: 4_000, full: 7_000 },
  },
  {
    key: 'drinks',
    mode: 'perPersonNight',
    cost: { sober: 1_000, intermediate: 2_000, full: 3_500 },
  },
  { key: 'sound', mode: 'perNight', cost: { sober: 50_000, intermediate: 100_000, full: 200_000 } },
  { key: 'printing', mode: 'flat', cost: { sober: 30_000, intermediate: 80_000, full: 200_000 } },
  { key: 'outfits', mode: 'flat', cost: { sober: 50_000, intermediate: 150_000, full: 400_000 } },
  {
    key: 'contingency',
    mode: 'flat',
    cost: { sober: 50_000, intermediate: 100_000, full: 200_000 },
  },
];
