# Lot 3 · PR 2 — Veillée : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** une famille répond aux étapes 3.1 « Installation de la veillée » et 3.2 « Restauration de la veillée », puis lit une synthèse avec les quantités, un coût estimé, un bouton pour ajuster le poste du budget (trésorier) et l'encadré des prestataires de sa ville.

**Architecture:** les deux étapes sont de courtes définitions dans `journey/steps/`. Le moteur gagne deux choses : la synthèse propre à une étape (`summary: 'step'`, page `/dossier/<id>/etape/<stepId>/synthese`) et la déclaration `providers: [catégories]`. Les quantités et les coûts sont des fonctions pures (`journey/quantities.ts`) qui réutilisent l'affluence et la grille du lot 2. L'ajustement d'un poste réutilise l'action existante `saveLineAction`. L'encadré lit les prestataires avec le client utilisateur (RLS) et les trie en code.

**Tech Stack:** Next.js 15 (Server Components, server actions), React 19, next-intl 3, Zod 3, Vitest (+ jsdom pour les composants). Aucune migration.

Spec : `docs/superpowers/specs/2026-10-28-lot-3-funerailles-design.md` (§ 2 « 3.1 », « 3.2 », « Calcul des quantités », « Ajustement des postes du budget » ; § 3 « Encadré prestataires » ; § 6 point 2).

---

## Décisions de ce plan (à valider dans la PR)

- **Synthèse propre à l'étape.** `StepSummary` devient `'budget' | 'step'`. `'step'` mène à `/dossier/<id>/etape/<stepId>/synthese`. Un seul calcul de chemin, `summaryPath()` (`journey/paths.ts`), utilisé par la redirection, la revalidation et le tableau de bord.
- **`providers` exige `summary: 'step'`.** `defineStep` le vérifie, ainsi que des catégories connues et sans doublon.
- **Taille de l'installation.** Tentes, chaises et bancs sont dimensionnés sur l'affluence haute (`attendance.high`). WHY : la réception du jour des obsèques se tient en général au même endroit que la veillée.
- **Quantités seulement pour les questions répondues.** Une question passée ou sans réponse n'ajoute ni quantité ni coût ; aucune valeur par défaut n'est inventée.
- **Coûts.** `tentsChairs` et `sound` reprennent `lineAmount()` de la grille. `catering` et `drinks` partent du coût unitaire de la grille, appliqué aux assiettes et invités calculés, avec trois ratios nommés « estimation à vérifier » (collation, cuisine familiale, alcool). Plafond `AMOUNT_MAX` comme le lot 2. Le niveau affiché est celui de B.2, sinon « intermédiaire ».
- **Éclairage** : quantité seulement ; la grille n'a pas de poste éclairage, donc pas de coût ni d'ajustement.
- **Ajustement d'un poste.** Le bouton envoie les trois montants estimés (sobre, intermédiaire, complet) à `saveLineAction`, avec le libellé actuel du poste. Le poste devient « modifié » et ne sera plus recalculé automatiquement ; le texte d'aide le dit. Si les montants sont déjà égaux, la synthèse l'indique au lieu du bouton. Le bouton n'apparaît que pour un trésorier et plus, si le poste existe et si les cotisations ne sont pas clôturées (une clôture illisible masque aussi le bouton).
- **Ville de l'encadré.** `person.death_city`, sinon Libreville. La comparaison se fait en code, sans casse ni accents (`localeCompare` en `sensitivity: 'base'`). WHY : la ville est saisie librement (« libreville »), et on évite un motif `ilike` (les jokers PostgREST `*` ne s'échappent pas).
- **Encadré.** Même contenu pour tous : prestataires actifs, vérifiés ou d'exemple (un administrateur ne voit pas en plus les non-vérifiés). Vérifiés d'abord, puis exemples, puis ordre alphabétique ; cinq au plus par catégorie ; aucun prestataire, pas d'encadré. Un échec de lecture masque l'encadré sans casser la synthèse.
- **Pas de bouton « Demander un devis »** dans cette PR (PR 3). Un exemple affiche déjà « Prestataire d'exemple, contact indisponible ».

Hors PR : message et trace de devis (PR 3), étape 3.4 (PR 4), documents (PR 5).

## Structure des fichiers

| Fichier                                                                         | Rôle                                                       |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `apps/web/src/journey/types.ts`                                                 | `StepSummary` + `'step'`, champ `providers`                |
| `apps/web/src/journey/define.ts`                                                | Contrôles de `providers`                                   |
| `apps/web/src/journey/paths.ts` (nouveau)                                       | `summaryPath()`                                            |
| `apps/web/src/modules/dossier/answers/redirect.ts`                              | `stepEndPath` passe par `summaryPath`                      |
| `apps/web/src/modules/dossier/answers/actions.ts`                               | Revalide la synthèse de l'étape                            |
| `apps/web/src/journey/ui/JourneyOverview.tsx`                                   | Lien « Voir la synthèse » par étape                        |
| `apps/web/src/journey/options.ts`                                               | Options des questions 3.1 et 3.2                           |
| `apps/web/src/journey/quantities.ts` (nouveau)                                  | Quantités et coûts estimés                                 |
| `apps/web/src/journey/steps/3-1-vigil-setup.ts` (nouveau)                       | Étape 3.1                                                  |
| `apps/web/src/journey/steps/3-2-vigil-catering.ts` (nouveau)                    | Étape 3.2                                                  |
| `apps/web/src/journey/registry.ts`                                              | 3.1 et 3.2 après le budget                                 |
| `apps/web/src/modules/providers/panel.ts` (nouveau)                             | Tri et regroupement de l'encadré, ville                    |
| `apps/web/src/modules/providers/repo.ts`                                        | `listPanelProviders()`                                     |
| `apps/web/src/modules/providers/service.ts`                                     | `providersForPanel()`                                      |
| `apps/web/src/modules/providers/ui/ProviderPanel.tsx` (nouveau)                 | Encadré                                                    |
| `apps/web/src/modules/dossier/repo.ts`                                          | `getDeathCity()`                                           |
| `apps/web/src/modules/budget/lines/model.ts`                                    | `lineAdjustments()`                                        |
| `apps/web/src/modules/budget/lines/ui/AdjustLineButton.tsx` (nouveau)           | Bouton d'ajustement                                        |
| `apps/web/src/journey/ui/StepSynthesis.tsx` (nouveau)                           | Contenu de la synthèse                                     |
| `apps/web/src/app/[locale]/(dossier)/dossier/[id]/etape/[stepId]/synthese/page.tsx` (nouveau) | Page de synthèse                             |
| `apps/web/messages/fr.json`, `apps/web/messages/en.json`                        | Textes des étapes, de la synthèse et de l'encadré          |

Toutes les commandes se lancent depuis la racine du dépôt (`/Users/user/Downloads/testimona`).

---

### Task 1 : synthèse propre à l'étape et déclaration `providers`

**Files:**

- Modify: `apps/web/src/journey/types.ts`
- Modify: `apps/web/src/journey/define.ts`
- Create: `apps/web/src/journey/paths.ts`
- Modify: `apps/web/src/modules/dossier/answers/redirect.ts`
- Modify: `apps/web/src/modules/dossier/answers/actions.ts`
- Modify: `apps/web/src/journey/ui/JourneyOverview.tsx`
- Test: `apps/web/src/journey/define.test.ts`, `apps/web/src/journey/paths.test.ts` (nouveau), `apps/web/src/modules/dossier/answers/redirect.test.ts`

- [ ] **Step 1 : écrire les tests qui échouent**

Ajouter à la fin du `describe('defineStep', …)` de `apps/web/src/journey/define.test.ts` :

```ts
  it('accepte des prestataires sur une étape à synthèse propre', () => {
    const step = {
      id: 'demo',
      questions: [q.shortText('demo.one')],
      summary: 'step' as const,
      providers: ['tentsChairs', 'sound'] as const,
    };
    expect(defineStep(step)).toBe(step);
  });

  it('refuse des prestataires sans synthèse propre', () => {
    expect(() =>
      defineStep({ id: 'demo', questions: [], summary: 'budget', providers: ['sound'] }),
    ).toThrow(/synthèse/);
    expect(() => defineStep({ id: 'demo', questions: [], providers: ['sound'] })).toThrow(
      /synthèse/,
    );
  });

  it('refuse une liste de prestataires vide, en double ou inconnue', () => {
    const base = { id: 'demo', questions: [], summary: 'step' as const };
    expect(() => defineStep({ ...base, providers: [] })).toThrow(/prestataires/);
    expect(() => defineStep({ ...base, providers: ['sound', 'sound'] })).toThrow(/prestataires/);
    expect(() =>
      // @ts-expect-error catégorie inconnue, refusée aussi à l'exécution
      defineStep({ ...base, providers: ['florist'] }),
    ).toThrow(/prestataires/);
  });
```

Créer `apps/web/src/journey/paths.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { summaryPath } from './paths';
import type { Step } from './types';

const ID = '11111111-1111-4111-8111-111111111111';
const base: Step = { id: 'demo', questions: [] };

describe('summaryPath', () => {
  it('mène à la page partagée du budget', () => {
    expect(summaryPath(ID, { ...base, summary: 'budget' })).toBe(`/dossier/${ID}/budget`);
  });

  it("mène à la synthèse propre de l'étape", () => {
    expect(summaryPath(ID, { ...base, summary: 'step' })).toBe(
      `/dossier/${ID}/etape/demo/synthese`,
    );
  });

  it('renvoie null sans synthèse', () => {
    expect(summaryPath(ID, base)).toBeNull();
  });
});
```

Dans `apps/web/src/modules/dossier/answers/redirect.test.ts`, dans `describe('stepEndPath', …)`, ajouter :

```ts
  it("mène à la synthèse propre d'une étape", () => {
    expect(stepEndPath(ID, { ...base, summary: 'step' })).toBe(
      `/dossier/${ID}/etape/${base.id}/synthese`,
    );
  });
```

(`base` et `ID` existent déjà dans ce fichier ; vérifier leur nom avant de coller.)

- [ ] **Step 2 : lancer les tests, constater l'échec**

Run: `pnpm --filter @testimona/web test -- src/journey/define src/journey/paths src/modules/dossier/answers/redirect`
Expected: FAIL — `./paths` introuvable, `'step'` refusé par le type, contrôles `providers` absents.

- [ ] **Step 3 : implémenter**

Dans `apps/web/src/journey/types.ts`, ajouter l'import en tête :

```ts
import type { ProviderCategory } from '@/modules/providers/categories';
```

Remplacer la déclaration de `StepSummary` et de `Step` par :

```ts
/**
 * Page qui conclut une étape sans brouillon :
 * - `budget` : page partagée `/dossier/<id>/budget` (B.1, B.2) ;
 * - `step` : synthèse propre à l'étape, `/dossier/<id>/etape/<stepId>/synthese` (3.1, 3.2).
 */
export type StepSummary = 'budget' | 'step';

/** Une étape du parcours : `id` sert de segment d'URL (`/etape/<id>`). */
export interface Step {
  id: string;
  questions: readonly Question[];
  draft?: StepDraft;
  /** Page de synthèse affichée à la fin de l'étape ; exclusive de `draft`. */
  summary?: StepSummary;
  /** Catégories de l'encadré prestataires de la synthèse ; exige `summary: 'step'`. */
  providers?: readonly ProviderCategory[];
}
```

Dans `apps/web/src/journey/define.ts`, ajouter l'import :

```ts
import { PROVIDER_CATEGORIES } from '@/modules/providers/categories';
```

puis, dans `defineStep`, juste après le contrôle `if (step.draft && step.summary) { … }` :

```ts
  if (step.providers) checkProviders(step);
```

et ajouter la fonction en fin de fichier :

```ts
function checkProviders(step: Step): void {
  const providers = step.providers ?? [];
  if (step.summary !== 'step') {
    throw new Error(`Étape ${step.id} : des prestataires exigent une synthèse propre`);
  }
  const known = new Set<string>(PROVIDER_CATEGORIES);
  if (
    providers.length === 0 ||
    new Set(providers).size !== providers.length ||
    providers.some((category) => !known.has(category))
  ) {
    throw new Error(`Étape ${step.id} : liste de prestataires invalide`);
  }
}
```

Créer `apps/web/src/journey/paths.ts` :

```ts
import type { Step } from './types';

/**
 * Chemin (non localisé) de la page de synthèse d'une étape, ou null si elle n'en a pas.
 *
 * @example
 * summaryPath(dossierId, vigilSetupStep); // '/dossier/<id>/etape/vigil-setup/synthese'
 */
export function summaryPath(dossierId: string, step: Step): string | null {
  if (step.summary === 'step') return `/dossier/${dossierId}/etape/${step.id}/synthese`;
  if (step.summary) return `/dossier/${dossierId}/${step.summary}`;
  return null;
}
```

Dans `apps/web/src/modules/dossier/answers/redirect.ts`, importer `summaryPath` :

```ts
import { summaryPath } from '@/journey/paths';
```

et remplacer le corps de `stepEndPath` (et sa JSDoc) par :

```ts
/**
 * Chemin (non localisé) qui conclut une étape : son brouillon (2.2, 2.3), sa page de synthèse
 * (B.1, B.2 → budget ; 3.1, 3.2 → synthèse de l'étape), sinon le tableau de bord du dossier.
 *
 * @example
 * stepEndPath(dossierId, attendanceStep); // '/dossier/<id>/budget'
 */
export function stepEndPath(dossierId: string, step: Step): string {
  if (step.draft) return `/dossier/${dossierId}/etape/${step.id}/brouillon`;
  return summaryPath(dossierId, step) ?? `/dossier/${dossierId}`;
}
```

Dans `apps/web/src/modules/dossier/answers/actions.ts`, importer `summaryPath` :

```ts
import { summaryPath } from '@/journey/paths';
```

et remplacer le bloc :

```ts
  // WHY: la page de synthèse (budget) est calculée depuis les réponses : elle doit les refléter.
  if (found?.step.summary) {
    revalidatePath(localizedPath(`/dossier/${dossierId}/${found.step.summary}`, locale));
  }
```

par :

```ts
  // WHY: la page de synthèse est calculée depuis les réponses : elle doit les refléter.
  const summary = found ? summaryPath(dossierId, found.step) : null;
  if (summary) revalidatePath(localizedPath(summary, locale));
```

Dans `apps/web/src/journey/ui/JourneyOverview.tsx`, importer `summaryPath` :

```ts
import { summaryPath } from '../paths';
```

remplacer :

```tsx
          // WHY: B.1 et B.2 mènent à la même page ; un seul lien « Voir le budget », sur la
          // dernière étape qui porte cette synthèse.
          const showSummary =
            step.summary !== undefined &&
            steps.findLastIndex((other) => other.summary === step.summary) === position;
```

par :

```tsx
          // WHY: B.1 et B.2 mènent à la même page ; un seul lien « Voir le budget », sur la
          // dernière étape qui porte cette synthèse. Une synthèse propre a son lien par étape.
          const summaryHref = summaryPath(dossierId, step);
          const showSummary =
            summaryHref !== null &&
            (step.summary === 'step' ||
              steps.findLastIndex((other) => other.summary === step.summary) === position);
```

et le bloc du lien :

```tsx
              {showSummary && step.summary && (
                <Link
                  href={`/dossier/${dossierId}/${step.summary}`}
                  className="text-primary text-sm font-semibold hover:underline"
                >
                  {t(`dashboard.summary.${step.summary}`)}
                </Link>
              )}
```

par :

```tsx
              {showSummary && summaryHref && step.summary && (
                <Link
                  href={summaryHref}
                  className="text-primary text-sm font-semibold hover:underline"
                >
                  {t(`dashboard.summary.${step.summary}`)}
                  {step.summary === 'step' && <span className="sr-only"> {title}</span>}
                </Link>
              )}
```

Ajouter le texte `journey.dashboard.summary.step` dans `apps/web/messages/fr.json` (« Voir la synthèse ») et `apps/web/messages/en.json` (« View the summary »), à côté de `summary.budget`.

- [ ] **Step 4 : relancer les tests**

Run: `pnpm --filter @testimona/web test -- src/journey src/modules/dossier/answers`
Expected: PASS (dont la parité FR/EN de `journey`).

- [ ] **Step 5 : typecheck et commit**

Run: `pnpm --filter @testimona/web typecheck`
Expected: aucune erreur.

```bash
git add apps/web/src/journey/types.ts apps/web/src/journey/define.ts apps/web/src/journey/define.test.ts apps/web/src/journey/paths.ts apps/web/src/journey/paths.test.ts apps/web/src/modules/dossier/answers/redirect.ts apps/web/src/modules/dossier/answers/redirect.test.ts apps/web/src/modules/dossier/answers/actions.ts apps/web/src/journey/ui/JourneyOverview.tsx apps/web/messages/fr.json apps/web/messages/en.json
git commit -m "feat(journey): add per-step summaries and provider categories on steps

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2 : options des étapes et calcul des quantités

**Files:**

- Modify: `apps/web/src/journey/options.ts`
- Create: `apps/web/src/journey/quantities.ts`
- Test: `apps/web/src/journey/quantities.test.ts` (nouveau)

Repères de calcul pour les tests (affluence `close 40, extended 60, friends 30, community 20`, `nights 2`) : `low = 150`, `high = 188`, invités d'une nuit `ceil(188 × 0,5) = 94`, invités cumulés `188 + 94 × 2 = 376`.

- [ ] **Step 1 : ajouter les options**

À la fin de `apps/web/src/journey/options.ts` :

```ts
/** Réponse oui / non d'une question à choix. */
export const YES_NO = ['yes', 'no'] as const;

/** Étape 3.1 : type de lieu de la veillée. */
export const VIGIL_PLACE_TYPES = ['familyHome', 'rentedHall', 'neighbourhood'] as const;
/** Étape 3.1 : abri des invités. */
export const SHELTERS = ['tents', 'hall'] as const;
/** Étape 3.1 : sièges. */
export const SEATINGS = ['chairs', 'benches', 'mixed'] as const;

/** Étape 3.2 : ce qui est servi chaque soir de veillée. */
export const SERVINGS = ['nothing', 'snack', 'meal'] as const;
/** Étape 3.2 : qui prépare les repas. */
export const COOKS = ['family', 'caterer'] as const;
/** Étape 3.2 : boissons servies. */
export const DRINKS = ['soft', 'alcohol'] as const;
```

- [ ] **Step 2 : écrire les tests qui échouent**

Créer `apps/web/src/journey/quantities.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { AMOUNT_MAX } from '@/modules/budget/scenarios';
import { estimateFor, ESTIMATE_KEYS, hasEstimate, wakeGuestsOf } from './quantities';

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
    expect(cost(estimate, 'catering')).toEqual({ sober: 0, intermediate: 0, full: 0 });
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
```

- [ ] **Step 3 : lancer les tests, constater l'échec**

Run: `pnpm --filter @testimona/web test -- src/journey/quantities`
Expected: FAIL, `./quantities` introuvable.

- [ ] **Step 4 : implémenter**

Créer `apps/web/src/journey/quantities.ts` :

```ts
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
import { LEVELS, type Level } from './options';
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

/** Réponse texte d'une question à choix, sinon null (absente, passée, invalide). */
function choice(answers: Answers, key: string): string | null {
  const value = answers[key];
  return typeof value === 'string' ? value : null;
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
  const shelter = choice(answers, 'vigil.shelter');
  const seating = choice(answers, 'vigil.seating');
  const sound = choice(answers, 'vigil.sound') === 'yes';
  const tents = Math.ceil(peak / SEATS_PER_TENT);
  const quantities: Quantity[] = [];
  if (shelter === 'tents') quantities.push({ key: 'tents', count: tents });
  if (seating === 'chairs') quantities.push({ key: 'chairs', count: peak });
  if (seating === 'benches') quantities.push({ key: 'benchPlaces', count: peak });
  if (seating === 'mixed') {
    const chairs = Math.ceil(peak / 2);
    quantities.push({ key: 'chairs', count: chairs }, { key: 'benchPlaces', count: peak - chairs });
  }
  if (choice(answers, 'vigil.lighting') === 'yes') {
    const sets = shelter === 'tents' ? Math.max(1, tents * LIGHT_SETS_PER_TENT) : 1;
    quantities.push({ key: 'lightSets', count: sets });
  }
  if (sound) quantities.push({ key: 'soundSystems', count: 1 });

  const costs: CostLine[] = [];
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
  const served = choice(answers, 'catering.served');
  const drinks = choice(answers, 'catering.drinks');
  const funeralMeal = choice(answers, 'catering.funeralMeal') === 'yes';
  const platesPerNight = served === 'snack' || served === 'meal' ? wakeGuestsOf(attendance) : 0;
  const funeralPlates = funeralMeal ? attendance.high : 0;
  const guests = guestOccasionsOf(attendance);

  const quantities: Quantity[] = [];
  if (platesPerNight > 0) quantities.push({ key: 'platesPerNight', count: platesPerNight });
  if (funeralPlates > 0) quantities.push({ key: 'funeralPlates', count: funeralPlates });
  // WHY: l'eau est servie à chaque occasion, même sans repas ni autre boisson.
  quantities.push({
    key: 'waterPacks',
    count: Math.ceil((guests * WATER_LITRES_PER_GUEST) / WATER_PACK_LITRES),
  });
  if (drinks !== null) {
    quantities.push(
      { key: 'drinkBottles', count: guests * DRINKS_PER_GUEST },
      { key: 'iceKg', count: Math.ceil(guests * ICE_KG_PER_GUEST) },
    );
  }

  const costs: CostLine[] = [];
  if (served !== null || funeralMeal) {
    const item = gridItem('catering');
    const servedRatio = served === 'snack' ? SNACK_COST_RATIO : 1;
    const cookRatio = choice(answers, 'catering.cook') === 'family' ? FAMILY_COOKING_RATIO : 1;
    const plates = platesPerNight * attendance.nights * servedRatio + funeralPlates;
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
  return {
    attendance,
    level: chosenLevel(answers) ?? 'intermediate',
    ...estimator(answers, attendance),
  };
}
```

- [ ] **Step 5 : relancer les tests**

Run: `pnpm --filter @testimona/web test -- src/journey/quantities`
Expected: PASS (12 tests).

- [ ] **Step 6 : commit**

```bash
git add apps/web/src/journey/options.ts apps/web/src/journey/quantities.ts apps/web/src/journey/quantities.test.ts
git commit -m "feat(journey): estimate vigil quantities and costs from attendance

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3 : étapes 3.1 et 3.2, registre et textes des questions

**Files:**

- Create: `apps/web/src/journey/steps/3-1-vigil-setup.ts`
- Create: `apps/web/src/journey/steps/3-2-vigil-catering.ts`
- Modify: `apps/web/src/journey/registry.ts`
- Modify: `apps/web/messages/fr.json`, `apps/web/messages/en.json`
- Test: `apps/web/src/journey/registry.test.ts`, `apps/web/src/journey/quantities.test.ts`

- [ ] **Step 1 : écrire les tests qui échouent**

Dans `apps/web/src/journey/registry.test.ts`, remplacer la liste attendue de `stepsFor('death')` par :

```ts
    expect(stepsFor('death').map((s) => s.id)).toEqual([
      'broadcast-list',
      'immediate-message',
      'email-announcement',
      'attendance',
      'budget',
      'vigil-setup',
      'vigil-catering',
      'biography',
    ]);
```

(garder le reste du test tel quel) et ajouter un test :

```ts
  it('pose les questions des étapes 3.1 et 3.2 avec leurs prestataires', () => {
    expect(getStep('vigil-setup')?.questions.map((q) => [q.key, q.kind])).toEqual([
      ['vigil.place', 'place'],
      ['vigil.placeType', 'choice'],
      ['vigil.shelter', 'choice'],
      ['vigil.seating', 'choice'],
      ['vigil.sound', 'choice'],
      ['vigil.lighting', 'choice'],
    ]);
    expect(getStep('vigil-setup')).toMatchObject({
      summary: 'step',
      providers: ['tentsChairs', 'sound', 'lighting'],
    });
    expect(getStep('vigil-catering')?.questions.map((q) => [q.key, q.kind])).toEqual([
      ['catering.served', 'choice'],
      ['catering.cook', 'choice'],
      ['catering.drinks', 'choice'],
      ['catering.funeralMeal', 'choice'],
    ]);
    expect(getStep('vigil-catering')).toMatchObject({
      summary: 'step',
      providers: ['catering', 'drinks'],
    });
  });
```

Dans `apps/web/src/journey/quantities.test.ts`, ajouter `import { allSteps } from './registry';` en tête et ce bloc en fin de fichier :

```ts
describe('registre', () => {
  it('donne une estimation à chaque étape à synthèse propre', () => {
    const missing = allSteps()
      .filter((step) => step.summary === 'step' && !hasEstimate(step.id))
      .map((step) => step.id);
    expect(missing).toEqual([]);
  });
});
```

- [ ] **Step 2 : lancer les tests, constater l'échec**

Run: `pnpm --filter @testimona/web test -- src/journey/registry src/journey/quantities`
Expected: FAIL, étapes `vigil-setup` et `vigil-catering` absentes.

- [ ] **Step 3 : créer les étapes**

`apps/web/src/journey/steps/3-1-vigil-setup.ts` :

```ts
import { defineStep, q } from '../define';
import { SEATINGS, SHELTERS, VIGIL_PLACE_TYPES, YES_NO } from '../options';

/** Étape 3.1 : installation de la veillée (lieu, abri, sièges, son, lumière). */
export const vigilSetupStep = defineStep({
  id: 'vigil-setup',
  questions: [
    q.place('vigil.place'),
    q.choice('vigil.placeType', VIGIL_PLACE_TYPES),
    q.choice('vigil.shelter', SHELTERS),
    q.choice('vigil.seating', SEATINGS),
    q.choice('vigil.sound', YES_NO),
    q.choice('vigil.lighting', YES_NO),
  ],
  summary: 'step',
  providers: ['tentsChairs', 'sound', 'lighting'],
});
```

`apps/web/src/journey/steps/3-2-vigil-catering.ts` :

```ts
import { defineStep, q } from '../define';
import { COOKS, DRINKS, SERVINGS, YES_NO } from '../options';

/** Étape 3.2 : restauration de la veillée et du jour des obsèques. */
export const vigilCateringStep = defineStep({
  id: 'vigil-catering',
  questions: [
    q.choice('catering.served', SERVINGS),
    q.choice('catering.cook', COOKS),
    q.choice('catering.drinks', DRINKS),
    q.choice('catering.funeralMeal', YES_NO),
  ],
  summary: 'step',
  providers: ['catering', 'drinks'],
});
```

Dans `apps/web/src/journey/registry.ts`, ajouter les imports :

```ts
import { vigilSetupStep } from './steps/3-1-vigil-setup';
import { vigilCateringStep } from './steps/3-2-vigil-catering';
```

remplacer la liste `death` par :

```ts
  death: [
    broadcastListStep,
    immediateMessageStep,
    emailAnnouncementStep,
    attendanceStep,
    budgetStep,
    vigilSetupStep,
    vigilCateringStep,
    biographyStep,
  ],
```

et compléter le commentaire WHY au-dessus de `STEPS_BY_ENTRY` :

```ts
 * WHY: après un décès, prévenir est plus urgent que raconter : les annonces passent en premier,
 * puis l'estimation du budget (on cotise dès les premiers jours), puis la veillée, qui en dépend,
 * puis la biographie.
```

- [ ] **Step 4 : ajouter les textes**

`journey.q` est imbriqué par segment de clé (`"budget": { "level": { … } }`) : imbriquer de la même façon.

Dans `apps/web/messages/fr.json`, sous `journey.steps` :

```json
    "vigil-setup": {
      "title": "L'installation de la veillée",
      "description": "Le lieu, l'abri, les sièges, le son et la lumière, avec les quantités à prévoir."
    },
    "vigil-catering": {
      "title": "La restauration de la veillée",
      "description": "Ce que vous servez chaque soir et le jour des obsèques, avec les quantités à prévoir."
    }
```

sous `journey.q` :

```json
    "vigil": {
      "place": {
        "title": "Où se tiendra la veillée ?",
        "hint": "La ville et le pays suffisent ; le quartier se précisera avec les prestataires."
      },
      "placeType": {
        "title": "Quel type de lieu ?",
        "hint": "Cela aide à prévoir l'abri et les sièges.",
        "options": {
          "familyHome": "La maison familiale",
          "rentedHall": "Une salle louée",
          "neighbourhood": "Un espace du quartier"
        }
      },
      "shelter": {
        "title": "Où les invités seront-ils abrités ?",
        "hint": "Une tente de 5 × 10 m accueille environ 50 personnes assises.",
        "options": { "tents": "Sous des tentes", "hall": "Dans une salle" }
      },
      "seating": {
        "title": "Quels sièges prévoir ?",
        "hint": "Les bancs prennent moins de place ; les chaises conviennent mieux aux aînés.",
        "options": { "chairs": "Des chaises", "benches": "Des bancs", "mixed": "Un peu des deux" }
      },
      "sound": {
        "title": "Faut-il une sonorisation ?",
        "hint": "Pour les chants, les prières et les prises de parole.",
        "options": { "yes": "Oui", "no": "Non" }
      },
      "lighting": {
        "title": "Faut-il un éclairage ?",
        "hint": "La veillée dure souvent toute la nuit.",
        "options": { "yes": "Oui", "no": "Non" }
      }
    },
    "catering": {
      "served": {
        "title": "Que servez-vous chaque soir de veillée ?",
        "hint": "Les quantités suivent le nombre de personnes attendues.",
        "options": { "nothing": "Rien", "snack": "Une collation", "meal": "Un repas" }
      },
      "cook": {
        "title": "Qui prépare les repas ?",
        "hint": "Une cuisine familiale revient en général moins cher qu'un traiteur.",
        "options": { "family": "La famille", "caterer": "Un traiteur" }
      },
      "drinks": {
        "title": "Quelles boissons servez-vous ?",
        "hint": "L'eau est toujours comptée en plus.",
        "options": { "soft": "Sans alcool", "alcohol": "Avec alcool" }
      },
      "funeralMeal": {
        "title": "Un repas est-il servi le jour des obsèques ?",
        "hint": "Pour toutes les personnes attendues ce jour-là.",
        "options": { "yes": "Oui", "no": "Non" }
      }
    }
```

Dans `apps/web/messages/en.json`, sous `journey.steps` :

```json
    "vigil-setup": {
      "title": "Setting up the wake",
      "description": "The place, shelter, seating, sound and lighting, with the quantities to plan."
    },
    "vigil-catering": {
      "title": "Food and drinks for the wake",
      "description": "What you serve each night and on the day of the funeral, with the quantities to plan."
    }
```

sous `journey.q` :

```json
    "vigil": {
      "place": {
        "title": "Where will the wake be held?",
        "hint": "The city and country are enough; the neighbourhood can be settled with the providers."
      },
      "placeType": {
        "title": "What kind of place?",
        "hint": "This helps plan the shelter and seating.",
        "options": {
          "familyHome": "The family home",
          "rentedHall": "A rented hall",
          "neighbourhood": "A space in the neighbourhood"
        }
      },
      "shelter": {
        "title": "Where will guests be sheltered?",
        "hint": "A 5 × 10 m tent seats about 50 people.",
        "options": { "tents": "Under tents", "hall": "In a hall" }
      },
      "seating": {
        "title": "What seating should you plan?",
        "hint": "Benches take less room; chairs suit older guests better.",
        "options": { "chairs": "Chairs", "benches": "Benches", "mixed": "Some of each" }
      },
      "sound": {
        "title": "Do you need a sound system?",
        "hint": "For songs, prayers and speeches.",
        "options": { "yes": "Yes", "no": "No" }
      },
      "lighting": {
        "title": "Do you need lighting?",
        "hint": "The wake often lasts all night.",
        "options": { "yes": "Yes", "no": "No" }
      }
    },
    "catering": {
      "served": {
        "title": "What do you serve each night of the wake?",
        "hint": "Quantities follow the number of people expected.",
        "options": { "nothing": "Nothing", "snack": "A snack", "meal": "A meal" }
      },
      "cook": {
        "title": "Who prepares the food?",
        "hint": "Family cooking usually costs less than a caterer.",
        "options": { "family": "The family", "caterer": "A caterer" }
      },
      "drinks": {
        "title": "What drinks do you serve?",
        "hint": "Water is always counted on top.",
        "options": { "soft": "Soft drinks only", "alcohol": "Including alcohol" }
      },
      "funeralMeal": {
        "title": "Is a meal served on the day of the funeral?",
        "hint": "For everyone expected that day.",
        "options": { "yes": "Yes", "no": "No" }
      }
    }
```

- [ ] **Step 5 : relancer les tests**

Run: `pnpm --filter @testimona/web test -- src/journey`
Expected: PASS, dont « couvrent chaque étape, question, option et champ du registre » et la parité FR/EN.

- [ ] **Step 6 : commit**

```bash
git add apps/web/src/journey/steps/3-1-vigil-setup.ts apps/web/src/journey/steps/3-2-vigil-catering.ts apps/web/src/journey/registry.ts apps/web/src/journey/registry.test.ts apps/web/src/journey/quantities.test.ts apps/web/messages/fr.json apps/web/messages/en.json
git commit -m "feat(journey): add the vigil setup and catering steps

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4 : données de l'encadré prestataires

**Files:**

- Create: `apps/web/src/modules/providers/panel.ts`
- Modify: `apps/web/src/modules/providers/repo.ts`
- Modify: `apps/web/src/modules/providers/service.ts`
- Modify: `apps/web/src/modules/dossier/repo.ts`
- Test: `apps/web/src/modules/providers/panel.test.ts` (nouveau), `apps/web/src/modules/providers/repo.test.ts`, `apps/web/src/modules/providers/service.panel.test.ts` (nouveau)

- [ ] **Step 1 : écrire les tests qui échouent**

Créer `apps/web/src/modules/providers/panel.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { panelCity, panelGroups } from './panel';
import type { Provider } from './schema';

let n = 0;
function provider(fields: Partial<Provider>): Provider {
  n += 1;
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    categoryKey: 'tentsChairs',
    name: `Prestataire ${n}`,
    city: 'Libreville',
    district: null,
    whatsapp: null,
    priceNote: null,
    isExample: true,
    verifiedAt: null,
    active: true,
    ...fields,
  };
}
const verified = (fields: Partial<Provider>) =>
  provider({
    isExample: false,
    whatsapp: '+24177123456',
    verifiedAt: '2026-10-01T00:00:00Z',
    ...fields,
  });

describe('panelCity', () => {
  it('prend la ville du décès, sinon Libreville', () => {
    expect(panelCity(' Port-Gentil ')).toBe('Port-Gentil');
    expect(panelCity('')).toBe('Libreville');
    expect(panelCity(null)).toBe('Libreville');
  });
});

describe('panelGroups', () => {
  it('met les vérifiés avant les exemples, puis trie par nom', () => {
    const groups = panelGroups(
      [
        provider({ name: 'Bâches Zed' }),
        verified({ name: 'Tentes Owendo' }),
        provider({ name: 'Akanda Location' }),
      ],
      ['tentsChairs'],
      'Libreville',
    );
    expect(groups.map((g) => [g.category, g.providers.map((p) => p.name)])).toEqual([
      ['tentsChairs', ['Tentes Owendo', 'Akanda Location', 'Bâches Zed']],
    ]);
  });

  it("suit l'ordre des catégories demandées et omet les catégories vides", () => {
    const groups = panelGroups(
      [provider({ categoryKey: 'sound' }), provider({ categoryKey: 'tentsChairs' })],
      ['tentsChairs', 'lighting', 'sound'],
      'Libreville',
    );
    expect(groups.map((g) => g.category)).toEqual(['tentsChairs', 'sound']);
  });

  it('garde cinq prestataires au plus par catégorie', () => {
    const many = Array.from({ length: 7 }, () => provider({}));
    expect(panelGroups(many, ['tentsChairs'], 'Libreville')[0]?.providers).toHaveLength(5);
  });

  it('compare la ville sans casse ni accents', () => {
    const groups = panelGroups(
      [
        provider({ city: 'LIBREVILLE' }),
        provider({ city: 'Lambaréné' }),
        provider({ city: 'Owendo' }),
      ],
      ['tentsChairs'],
      'libreville',
    );
    expect(groups[0]?.providers.map((p) => p.city)).toEqual(['LIBREVILLE']);
    expect(
      panelGroups([provider({ city: 'Lambarene' })], ['tentsChairs'], 'Lambaréné'),
    ).toHaveLength(1);
  });

  it('écarte les inactifs et les non vérifiés qui ne sont pas des exemples', () => {
    const groups = panelGroups(
      [provider({ active: false }), provider({ isExample: false }), verified({ active: false })],
      ['tentsChairs'],
      'Libreville',
    );
    expect(groups).toEqual([]);
  });
});
```

Dans `apps/web/src/modules/providers/repo.test.ts`, ajouter `'in'` et `'or'` à la liste des méthodes de la doublure :

```ts
    for (const method of [
      'select',
      'insert',
      'update',
      'eq',
      'in',
      'or',
      'order',
      'limit',
      'returns',
    ]) {
```

ajouter `listPanelProviders` à l'import dynamique :

```ts
const { getProvider, insertProvider, listPanelProviders, listProviders, updateProvider } =
  await import('./repo');
```

et ce bloc de tests (réutiliser l'objet `row` du fichier ; s'il porte un autre nom, l'adapter ; si le fichier vide `results` et `calls` dans un `beforeEach`, ce bloc en profite) :

```ts
describe('listPanelProviders', () => {
  it("lit les prestataires actifs, vérifiés ou d'exemple, des catégories demandées", async () => {
    results.push({ data: [row], error: null });
    const res = await listPanelProviders(['tentsChairs', 'sound']);
    expect(res.error).toBeNull();
    expect(res.data?.[0]?.id).toBe(row.id);
    expect(calls).toEqual(
      expect.arrayContaining([
        { method: 'from', args: ['provider'] },
        { method: 'in', args: ['category_key', ['tentsChairs', 'sound']] },
        { method: 'eq', args: ['active', true] },
        { method: 'or', args: ['is_example.eq.true,verified_at.not.is.null'] },
      ]),
    );
  });

  it('remonte une erreur de lecture', async () => {
    results.push({ data: null, error: { code: '42501', message: 'denied' } });
    const res = await listPanelProviders(['sound']);
    expect(res.error?.code).toBe('42501');
  });
});
```

Créer `apps/web/src/modules/providers/service.panel.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { repo } = vi.hoisted(() => ({ repo: { listPanelProviders: vi.fn() } }));

vi.mock('server-only', () => ({}));
vi.mock('./repo', () => repo);
vi.mock('@/lib/auth/platform-admin', () => ({ isPlatformAdmin: vi.fn() }));

const { providersForPanel } = await import('./service');

const example = {
  id: '66666666-6666-4666-8666-666666666666',
  categoryKey: 'sound',
  name: 'Sono Owendo (exemple)',
  city: 'Libreville',
  district: 'Owendo',
  whatsapp: null,
  priceNote: null,
  isExample: true,
  verifiedAt: null,
  active: true,
};

beforeEach(() => repo.listPanelProviders.mockReset());

describe('providersForPanel', () => {
  it('regroupe les prestataires de la ville, sans contrôle administrateur', async () => {
    repo.listPanelProviders.mockResolvedValue({ data: [example], error: null });
    const res = await providersForPanel(['tentsChairs', 'sound'], 'Libreville');
    expect(repo.listPanelProviders).toHaveBeenCalledWith(['tentsChairs', 'sound']);
    expect(res).toEqual({ ok: true, data: [{ category: 'sound', providers: [example] }] });
  });

  it('traduit une erreur de la base', async () => {
    repo.listPanelProviders.mockResolvedValue({ data: null, error: { code: '42501' } });
    expect(await providersForPanel(['sound'], 'Libreville')).toEqual({
      ok: false,
      error: 'forbidden',
    });
  });
});
```

- [ ] **Step 2 : lancer les tests, constater l'échec**

Run: `pnpm --filter @testimona/web test -- src/modules/providers`
Expected: FAIL, `./panel` introuvable, `listPanelProviders` et `providersForPanel` absents.

- [ ] **Step 3 : implémenter**

Créer `apps/web/src/modules/providers/panel.ts` :

```ts
import type { ProviderCategory } from './categories';
import type { Provider } from './schema';

/** Prestataires affichés au plus par catégorie. */
export const PANEL_PER_CATEGORY = 5;
/** Ville par défaut quand la fiche n'a pas de ville du décès. */
export const DEFAULT_CITY = 'Libreville';

export interface PanelGroup {
  category: ProviderCategory;
  providers: readonly Provider[];
}

const isVerified = (p: Provider) => !p.isExample && p.verifiedAt !== null;

// WHY: la ville est saisie librement (« libreville », « Lambarene ») ; on compare sans casse ni
// accents plutôt qu'avec un motif `ilike`, dont les jokers PostgREST ne s'échappent pas.
const sameCity = (a: string, b: string) =>
  a.trim().localeCompare(b.trim(), 'fr', { sensitivity: 'base' }) === 0;

/**
 * Ville de recherche de l'encadré : ville du décès, sinon Libreville.
 *
 * @example
 * panelCity(null); // 'Libreville'
 */
export function panelCity(deathCity: string | null): string {
  const city = deathCity?.trim();
  return city ? city : DEFAULT_CITY;
}

/**
 * Prestataires de l'encadré, par catégorie dans l'ordre demandé : actifs, vérifiés ou d'exemple,
 * de la ville ; vérifiés d'abord, puis par nom ; cinq au plus ; catégories vides omises.
 *
 * @example
 * panelGroups(providers, ['tentsChairs', 'sound'], 'Libreville');
 */
export function panelGroups(
  providers: readonly Provider[],
  categories: readonly ProviderCategory[],
  city: string,
  perCategory = PANEL_PER_CATEGORY,
): PanelGroup[] {
  return categories.flatMap((category) => {
    const list = providers
      .filter(
        (p) =>
          p.categoryKey === category &&
          p.active &&
          (p.isExample || isVerified(p)) &&
          sameCity(p.city, city),
      )
      .sort(
        (a, b) =>
          Number(isVerified(b)) - Number(isVerified(a)) || a.name.localeCompare(b.name, 'fr'),
      )
      .slice(0, perCategory);
    return list.length > 0 ? [{ category, providers: list }] : [];
  });
}
```

Dans `apps/web/src/modules/providers/repo.ts`, ajouter après `LIST_LIMIT` :

```ts
/** WHY: le tri et la ville se font en code ; 200 lignes couvrent largement le pilote. */
const PANEL_LIMIT = 200;
```

et la fonction après `listProviders` :

```ts
/**
 * Prestataires des catégories d'un encadré : actifs, vérifiés ou d'exemple.
 * WHY: un administrateur lit aussi les non-vérifiés (RLS) ; ce filtre donne à tous le même
 * encadré.
 */
export async function listPanelProviders(
  categories: readonly ProviderCategory[],
): Promise<RepoResult<Provider[]>> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('provider')
    .select(COLUMNS)
    .in('category_key', [...categories])
    .eq('active', true)
    .or('is_example.eq.true,verified_at.not.is.null')
    .order('name')
    .limit(PANEL_LIMIT)
    .returns<ProviderRow[]>();
  if (error) {
    console.error('[providers] listPanelProviders impossible', { code: error.code });
    return fail(error);
  }
  return { data: (data ?? []).map(toProvider), error: null };
}
```

Dans `apps/web/src/modules/providers/service.ts`, ajouter les imports :

```ts
import type { ProviderCategory } from './categories';
import { type PanelGroup, panelGroups } from './panel';
```

et la fonction en fin de fichier :

```ts
/**
 * Encadré prestataires d'une étape, pour tout utilisateur connecté (la RLS filtre).
 *
 * @example
 * const res = await providersForPanel(['tentsChairs', 'sound'], 'Libreville');
 */
export async function providersForPanel(
  categories: readonly ProviderCategory[],
  city: string,
): Promise<ProvidersResult<PanelGroup[]>> {
  const res = await repo.listPanelProviders(categories);
  if (res.error) return fromRepo(res.error, 'providersForPanel');
  return { ok: true, data: panelGroups(res.data, categories, city) };
}
```

Dans `apps/web/src/modules/dossier/repo.ts`, ajouter après `getPerson` :

```ts
/** Ville du décès inscrite sur la fiche, ou null (absente, vide ou illisible). */
export async function getDeathCity(dossierId: string): Promise<string | null> {
  const db = await getSupabaseServer();
  const { data, error } = await db
    .from('person')
    .select('death_city')
    .eq('dossier_id', dossierId)
    .maybeSingle<{ death_city: string | null }>();
  logRead('getDeathCity', error);
  return data?.death_city ?? null;
}
```

- [ ] **Step 4 : relancer les tests**

Run: `pnpm --filter @testimona/web test -- src/modules/providers`
Expected: PASS.

- [ ] **Step 5 : commit**

```bash
git add apps/web/src/modules/providers/panel.ts apps/web/src/modules/providers/panel.test.ts apps/web/src/modules/providers/repo.ts apps/web/src/modules/providers/repo.test.ts apps/web/src/modules/providers/service.ts apps/web/src/modules/providers/service.panel.test.ts apps/web/src/modules/dossier/repo.ts
git commit -m "feat(providers): list the providers of a step panel by city

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5 : textes de la synthèse et de l'encadré

**Files:**

- Modify: `apps/web/messages/fr.json`, `apps/web/messages/en.json`
- Test: `apps/web/src/journey/messages.test.ts`, `apps/web/src/modules/providers/messages.test.ts`

- [ ] **Step 1 : écrire les tests qui échouent**

Dans `apps/web/src/journey/messages.test.ts`, ajouter l'import :

```ts
import type { QuantityKey } from './quantities';
```

au-dessus de `UI_PATHS` :

```ts
// WHY: Record typé : ajouter une quantité sans texte fait échouer la compilation.
const QUANTITY_KEYS: Record<QuantityKey, true> = {
  tents: true,
  chairs: true,
  benchPlaces: true,
  lightSets: true,
  soundSystems: true,
  platesPerNight: true,
  funeralPlates: true,
  waterPacks: true,
  drinkBottles: true,
  iceKg: true,
};
```

et ajouter à la fin du tableau `UI_PATHS` :

```ts
  ...[
    'intro',
    'nightsAssumed',
    'noAttendance',
    'answerAttendance',
    'quantitiesTitle',
    'noQuantities',
    'costTitle',
    'costNote',
    'line',
    'capped',
    'cappedNote',
    'adjustTitle',
    'adjust',
    'adjustHint',
    'adjusted',
    'upToDate',
    'editAnswers',
    'backToDossier',
    ...Object.keys(QUANTITY_KEYS).map((key) => `quantity.${key}`),
  ].map((key) => `journey.synthesis.${key}`),
```

Dans `apps/web/src/modules/providers/messages.test.ts`, ajouter au tableau `PATHS` :

```ts
  ...['title', 'intro', 'verified', 'example', 'exampleNotice'].map(
    (k) => `providers.panel.${k}`,
  ),
```

- [ ] **Step 2 : lancer les tests, constater l'échec**

Run: `pnpm --filter @testimona/web test -- src/journey/messages src/modules/providers/messages`
Expected: FAIL, chemins `journey.synthesis.*` et `providers.panel.*` absents.

- [ ] **Step 3 : ajouter les textes**

`apps/web/messages/fr.json`, sous `journey` (à côté de `dashboard`) :

```json
    "synthesis": {
      "intro": "Calculé pour {high, plural, =1 {1 personne} other {# personnes}} au plus et {nights, plural, =0 {aucune nuit de veillée} =1 {1 nuit de veillée} other {# nuits de veillée}}.",
      "nightsAssumed": "La durée de la veillée n'est pas renseignée : une nuit est supposée.",
      "noAttendance": "Indiquez d'abord combien de personnes sont attendues : les quantités en dépendent.",
      "answerAttendance": "Répondre aux personnes attendues",
      "quantitiesTitle": "Quantités à prévoir",
      "noQuantities": "Répondez aux questions de l'étape pour voir les quantités.",
      "costTitle": "Coût estimé ({level})",
      "costNote": "Estimation à vérifier, d'après la grille du budget. Les prix indiqués par les prestataires n'entrent pas dans le calcul.",
      "line": "Poste",
      "capped": "montant plafonné",
      "cappedNote": "Montant ramené à {max}.",
      "adjustTitle": "Postes du budget",
      "adjust": "Mettre à jour le poste {line} : {amount}",
      "adjustHint": "Les trois scénarios du poste prennent les montants de cette estimation ; le poste ne sera plus recalculé selon l'affluence.",
      "adjusted": "Poste mis à jour.",
      "upToDate": "Le poste {line} correspond déjà à cette estimation.",
      "editAnswers": "Modifier les réponses",
      "backToDossier": "Retour au dossier",
      "quantity": {
        "tents": "{count, plural, =1 {1 tente de 5 × 10 m} other {# tentes de 5 × 10 m}}",
        "chairs": "{count, plural, =1 {1 chaise} other {# chaises}}",
        "benchPlaces": "{count, plural, =1 {1 place de banc} other {# places de banc}}",
        "lightSets": "{count, plural, =1 {1 jeu de lumière} other {# jeux de lumière}}",
        "soundSystems": "{count, plural, =1 {1 sonorisation} other {# sonorisations}}",
        "platesPerNight": "{count, plural, =1 {1 assiette par soir de veillée} other {# assiettes par soir de veillée}}",
        "funeralPlates": "{count, plural, =1 {1 assiette le jour des obsèques} other {# assiettes le jour des obsèques}}",
        "waterPacks": "{count, plural, =1 {1 pack d'eau de 9 litres} other {# packs d'eau de 9 litres}}",
        "drinkBottles": "{count, plural, =1 {1 bouteille de boisson} other {# bouteilles de boisson}}",
        "iceKg": "{count} kg de glace"
      }
    }
```

`apps/web/messages/fr.json`, sous `providers` :

```json
    "panel": {
      "title": "Prestataires à {city}",
      "intro": "Les prestataires d'exemple illustrent le service : ils ne peuvent pas être contactés.",
      "verified": "Vérifié",
      "example": "Exemple",
      "exampleNotice": "Prestataire d'exemple, contact indisponible."
    }
```

`apps/web/messages/en.json`, sous `journey` :

```json
    "synthesis": {
      "intro": "Worked out for at most {high, plural, =1 {1 person} other {# people}} and {nights, plural, =0 {no wake night} =1 {1 wake night} other {# wake nights}}.",
      "nightsAssumed": "The length of the wake is not set: one night is assumed.",
      "noAttendance": "First say how many people are expected: the quantities depend on it.",
      "answerAttendance": "Answer the expected attendance",
      "quantitiesTitle": "Quantities to plan",
      "noQuantities": "Answer the questions of this step to see the quantities.",
      "costTitle": "Estimated cost ({level})",
      "costNote": "An estimate to check, based on the budget grid. Prices given by providers are not used in the calculation.",
      "line": "Item",
      "capped": "capped amount",
      "cappedNote": "Amount capped at {max}.",
      "adjustTitle": "Budget items",
      "adjust": "Update the {line} item: {amount}",
      "adjustHint": "The item's three scenarios take the amounts of this estimate; it will no longer be recalculated from attendance.",
      "adjusted": "Item updated.",
      "upToDate": "The {line} item already matches this estimate.",
      "editAnswers": "Edit the answers",
      "backToDossier": "Back to the dossier",
      "quantity": {
        "tents": "{count, plural, =1 {1 tent of 5 × 10 m} other {# tents of 5 × 10 m}}",
        "chairs": "{count, plural, =1 {1 chair} other {# chairs}}",
        "benchPlaces": "{count, plural, =1 {1 bench seat} other {# bench seats}}",
        "lightSets": "{count, plural, =1 {1 lighting set} other {# lighting sets}}",
        "soundSystems": "{count, plural, =1 {1 sound system} other {# sound systems}}",
        "platesPerNight": "{count, plural, =1 {1 plate per wake night} other {# plates per wake night}}",
        "funeralPlates": "{count, plural, =1 {1 plate on the day of the funeral} other {# plates on the day of the funeral}}",
        "waterPacks": "{count, plural, =1 {1 pack of 9 litres of water} other {# packs of 9 litres of water}}",
        "drinkBottles": "{count, plural, =1 {1 bottle of drink} other {# bottles of drink}}",
        "iceKg": "{count} kg of ice"
      }
    }
```

`apps/web/messages/en.json`, sous `providers` :

```json
    "panel": {
      "title": "Providers in {city}",
      "intro": "Example providers illustrate the service: they cannot be contacted.",
      "verified": "Verified",
      "example": "Example",
      "exampleNotice": "Example provider, no contact available."
    }
```

- [ ] **Step 4 : relancer les tests**

Run: `pnpm --filter @testimona/web test -- src/journey/messages src/modules/providers/messages`
Expected: PASS.

- [ ] **Step 5 : commit**

```bash
git add apps/web/messages/fr.json apps/web/messages/en.json apps/web/src/journey/messages.test.ts apps/web/src/modules/providers/messages.test.ts
git commit -m "feat(i18n): add the vigil summary and provider panel texts

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6 : composant `ProviderPanel`

**Files:**

- Create: `apps/web/src/modules/providers/ui/ProviderPanel.tsx`
- Test: `apps/web/src/modules/providers/ui/ProviderPanel.test.tsx` (nouveau)

- [ ] **Step 1 : écrire le test qui échoue**

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it } from 'vitest';
import messages from '../../../../messages/fr.json';
import type { PanelGroup } from '../panel';
import { ProviderPanel } from './ProviderPanel';

const groups: PanelGroup[] = [
  {
    category: 'tentsChairs',
    providers: [
      {
        id: '11111111-1111-4111-8111-111111111111',
        categoryKey: 'tentsChairs',
        name: 'Tentes Owendo',
        city: 'Libreville',
        district: 'Owendo',
        whatsapp: '+24177123456',
        priceNote: 'Tente 5×10 m, 40 000 XAF',
        isExample: false,
        verifiedAt: '2026-10-01T00:00:00Z',
        active: true,
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        categoryKey: 'tentsChairs',
        name: 'Location Akanda (exemple)',
        city: 'Libreville',
        district: null,
        whatsapp: null,
        priceNote: null,
        isExample: true,
        verifiedAt: null,
        active: true,
      },
    ],
  },
];

function renderPanel(g: PanelGroup[]) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <ProviderPanel city="Libreville" groups={g} />
    </NextIntlClientProvider>,
  );
}

afterEach(cleanup);

describe('ProviderPanel', () => {
  it('affiche les prestataires par catégorie avec leur badge', () => {
    renderPanel(groups);
    expect(screen.getByRole('heading', { name: 'Prestataires à Libreville' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Tentes et chaises' })).toBeTruthy();
    const [verified, example] = screen.getAllByRole('listitem') as HTMLElement[];
    expect(within(verified!).getByText('Vérifié')).toBeTruthy();
    expect(within(verified!).getByText('Owendo')).toBeTruthy();
    expect(within(verified!).getByText('Tente 5×10 m, 40 000 XAF')).toBeTruthy();
    expect(within(verified!).queryByText(/contact indisponible/)).toBeNull();
    expect(within(example!).getByText('Exemple')).toBeTruthy();
    expect(within(example!).getByText("Prestataire d'exemple, contact indisponible.")).toBeTruthy();
  });

  it("n'affiche rien sans prestataire", () => {
    const { container } = renderPanel([]);
    expect(container.innerHTML).toBe('');
  });

  it("n'affiche pas le numéro WhatsApp", () => {
    renderPanel(groups);
    expect(screen.queryByText(/\+241/)).toBeNull();
  });
});
```

(Si la règle ESLint du dépôt refuse `!` non nul dans les tests, remplacer par `as HTMLElement` sur chaque élément.)

- [ ] **Step 2 : lancer le test, constater l'échec**

Run: `pnpm --filter @testimona/web test -- src/modules/providers/ui/ProviderPanel`
Expected: FAIL, `./ProviderPanel` introuvable.

- [ ] **Step 3 : implémenter**

Créer `apps/web/src/modules/providers/ui/ProviderPanel.tsx` :

```tsx
import { useTranslations } from 'next-intl';
import type { PanelGroup } from '../panel';

/**
 * Encadré prestataires d'une synthèse d'étape : une carte par prestataire (nom, quartier, prix
 * indicatif, badge « Vérifié » ou « Exemple »). Rien sans prestataire.
 * WHY: pas de numéro ici ; le contact passera par la demande de devis tracée (PR 3).
 *
 * @example
 * <ProviderPanel city="Libreville" groups={groups} />
 */
export function ProviderPanel({ city, groups }: { city: string; groups: readonly PanelGroup[] }) {
  const t = useTranslations('providers');
  if (groups.length === 0) return null;
  return (
    <section
      aria-labelledby="providers-panel-title"
      className="border-border space-y-4 rounded-2xl border p-5"
    >
      <header className="space-y-1">
        <h2
          id="providers-panel-title"
          className="font-display text-foreground text-lg font-semibold"
        >
          {t('panel.title', { city })}
        </h2>
        <p className="text-muted-foreground text-sm">{t('panel.intro')}</p>
      </header>
      {groups.map((group) => (
        <div key={group.category} className="space-y-2">
          <h3 className="text-foreground font-semibold">{t(`category.${group.category}`)}</h3>
          <ul className="grid gap-3 sm:grid-cols-2">
            {group.providers.map((provider) => (
              <li key={provider.id} className="border-border space-y-1 rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-foreground font-semibold">{provider.name}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      provider.isExample
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {provider.isExample ? t('panel.example') : t('panel.verified')}
                  </span>
                </div>
                {provider.district && (
                  <p className="text-muted-foreground text-sm">{provider.district}</p>
                )}
                {provider.priceNote && (
                  <p className="text-foreground text-sm">{provider.priceNote}</p>
                )}
                {provider.isExample && (
                  <p className="text-muted-foreground text-sm">{t('panel.exampleNotice')}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 4 : relancer le test**

Run: `pnpm --filter @testimona/web test -- src/modules/providers/ui/ProviderPanel`
Expected: PASS (3 tests).

- [ ] **Step 5 : commit**

```bash
git add apps/web/src/modules/providers/ui/ProviderPanel.tsx apps/web/src/modules/providers/ui/ProviderPanel.test.tsx
git commit -m "feat(providers): add the provider panel of step summaries

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7 : ajustement d'un poste du budget

**Files:**

- Modify: `apps/web/src/modules/budget/lines/model.ts`
- Create: `apps/web/src/modules/budget/lines/ui/AdjustLineButton.tsx`
- Test: `apps/web/src/modules/budget/lines/model.test.ts`, `apps/web/src/modules/budget/lines/ui/AdjustLineButton.test.tsx` (nouveau)

- [ ] **Step 1 : écrire les tests qui échouent**

À la fin de `apps/web/src/modules/budget/lines/model.test.ts` (ajouter `lineAdjustments` à l'import de `./model`) :

```ts
describe('lineAdjustments', () => {
  const line = (gridKey: string | null, amounts = { sober: 1, intermediate: 2, full: 3 }) => ({
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
    expect(lineAdjustments([cost('sound')], [line('tentsChairs'), line('sound')])).toEqual([
      {
        gridKey: 'sound',
        line: line('sound'),
        amounts: { sober: 10, intermediate: 20, full: 30 },
        upToDate: false,
      },
    ]);
  });

  it('ignore un coût sans poste et signale un poste déjà à jour', () => {
    const same = { sober: 10, intermediate: 20, full: 30 };
    const res = lineAdjustments([cost('catering'), cost('drinks', same)], [line('drinks', same)]);
    expect(res.map((a) => [a.gridKey, a.upToDate])).toEqual([['drinks', true]]);
  });
});
```

Créer `apps/web/src/modules/budget/lines/ui/AdjustLineButton.test.tsx` :

```tsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../../../messages/fr.json';
import { AdjustLineButton } from './AdjustLineButton';

const saveLineAction = vi.fn();
const refresh = vi.fn();
vi.mock('../actions', () => ({
  saveLineAction: (...args: unknown[]) => saveLineAction(...args),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const LINE = '22222222-2222-4222-8222-222222222222';
const TEXT = 'Mettre à jour le poste Tentes et chaises : 300 800 FCFA';

function renderButton() {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <AdjustLineButton
        dossierId={DOSSIER}
        lineId={LINE}
        label="Tentes et chaises"
        amounts={{ sober: 188_000, intermediate: 300_800, full: 451_200 }}
        text={TEXT}
      />
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  saveLineAction.mockReset();
  refresh.mockReset();
});

describe('AdjustLineButton', () => {
  it('envoie les trois montants estimés avec le libellé du poste, puis relit la page', async () => {
    saveLineAction.mockResolvedValue({ ok: true });
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: TEXT }));
    await waitFor(() => expect(saveLineAction).toHaveBeenCalledTimes(1));
    const data = saveLineAction.mock.calls[0]?.[1] as FormData;
    expect(Object.fromEntries(data.entries())).toEqual({
      dossierId: DOSSIER,
      lineId: LINE,
      label: 'Tentes et chaises',
      sober: '188000',
      intermediate: '300800',
      full: '451200',
    });
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Poste mis à jour.'));
    expect(refresh).toHaveBeenCalled();
  });

  it('affiche une erreur des postes sans relire la page', async () => {
    saveLineAction.mockResolvedValue({ error: 'closed' });
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: TEXT }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2 : lancer les tests, constater l'échec**

Run: `pnpm --filter @testimona/web test -- src/modules/budget/lines/model src/modules/budget/lines/ui/AdjustLineButton`
Expected: FAIL, `lineAdjustments` et `./AdjustLineButton` absents.

- [ ] **Step 3 : implémenter**

À la fin de `apps/web/src/modules/budget/lines/model.ts` :

```ts
/** Coût estimé d'un poste de la grille (même forme que `CostLine` du parcours). */
export interface EstimatedCost {
  gridKey: string;
  amounts: Readonly<Record<Level, number>>;
}

/** Ajustement proposé d'un poste à partir d'une estimation d'étape. */
export interface LineAdjustment {
  gridKey: string;
  line: BudgetLine;
  amounts: Readonly<Record<Level, number>>;
  /** Vrai si le poste a déjà ces montants. */
  upToDate: boolean;
}

/**
 * Ajustements possibles : un par coût estimé dont le poste de même `grid_key` existe.
 * WHY: un poste supprimé ou jamais créé n'est pas recréé depuis une étape.
 *
 * @example
 * lineAdjustments(estimate.costs, lines); // [{ gridKey: 'sound', line, amounts, upToDate: false }]
 */
export function lineAdjustments(
  costs: readonly EstimatedCost[],
  lines: readonly BudgetLine[],
): LineAdjustment[] {
  return costs.flatMap((cost) => {
    const line = lines.find((candidate) => candidate.gridKey === cost.gridKey);
    if (!line) return [];
    const upToDate = LEVELS.every((level) => line.amounts[level] === cost.amounts[level]);
    return [{ gridKey: cost.gridKey, line, amounts: { ...cost.amounts }, upToDate }];
  });
}
```

Créer `apps/web/src/modules/budget/lines/ui/AdjustLineButton.tsx` :

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { LEVELS, type Level } from '@/journey/options';
import { saveLineAction } from '../actions';
import { linesErrorText } from './linesError';
import { useLinesForm } from './useLinesForm';

interface Props {
  dossierId: string;
  lineId: string;
  /** Libellé actuel du poste, renvoyé tel quel. */
  label: string;
  amounts: Readonly<Record<Level, number>>;
  /** Texte du bouton, montant déjà formaté côté serveur. */
  text: string;
}

/**
 * « Mettre à jour le poste … » : remplace les trois montants du poste par l'estimation de
 * l'étape, avec l'action existante de modification d'un poste.
 *
 * @example
 * <AdjustLineButton dossierId={id} lineId={line.id} label={line.label} amounts={a} text={text} />
 */
export function AdjustLineButton({ dossierId, lineId, label, amounts, text }: Props) {
  const t = useTranslations('journey.synthesis');
  const tRoot = useTranslations();
  const router = useRouter();
  const { state, pending, saved, onSubmit, formRef } = useLinesForm(saveLineAction);
  // WHY: l'action revalide les pages des cotisations, pas cette synthèse : on la relit.
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);
  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-2">
      <input type="hidden" name="dossierId" value={dossierId} />
      <input type="hidden" name="lineId" value={lineId} />
      <input type="hidden" name="label" value={label} />
      {LEVELS.map((level) => (
        <input key={level} type="hidden" name={level} value={String(amounts[level])} />
      ))}
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        className={buttonClasses({
          variant: 'secondary',
          size: 'md',
          className: 'disabled:cursor-not-allowed disabled:opacity-60',
        })}
      >
        {text}
      </button>
      <p role="status" className="text-foreground text-sm">
        {saved ? t('adjusted') : ''}
      </p>
      {state?.error && (
        <p role="alert" className="text-destructive text-sm">
          {linesErrorText(state.error, tRoot)}
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 4 : relancer les tests**

Run: `pnpm --filter @testimona/web test -- src/modules/budget/lines`
Expected: PASS.

- [ ] **Step 5 : commit**

```bash
git add apps/web/src/modules/budget/lines/model.ts apps/web/src/modules/budget/lines/model.test.ts apps/web/src/modules/budget/lines/ui/AdjustLineButton.tsx apps/web/src/modules/budget/lines/ui/AdjustLineButton.test.tsx
git commit -m "feat(budget): let a treasurer apply a step estimate to a budget item

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8 : composant `StepSynthesis`

**Files:**

- Create: `apps/web/src/journey/ui/StepSynthesis.tsx`
- Test: `apps/web/src/journey/ui/StepSynthesis.test.tsx` (nouveau)

- [ ] **Step 1 : écrire le test qui échoue**

```tsx
// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import messages from '../../../messages/fr.json';
import { estimateFor } from '../quantities';
import { StepSynthesis } from './StepSynthesis';

vi.mock('@/modules/budget/lines/actions', () => ({ saveLineAction: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const DOSSIER = '11111111-1111-4111-8111-111111111111';
const estimate = estimateFor('vigil-setup', {
  'attendance.close': 40,
  'attendance.extended': 60,
  'attendance.friends': 30,
  'attendance.community': 20,
  'attendance.nights': 2,
  'vigil.shelter': 'tents',
  'vigil.seating': 'chairs',
  'vigil.sound': 'yes',
});
const line = (id: string, gridKey: string, label: string) => ({
  id,
  gridKey,
  label,
  amounts: { sober: 0, intermediate: 1, full: 0 },
  edited: false,
  position: 0,
});

function renderSynthesis(props: Partial<ComponentProps<typeof StepSynthesis>> = {}) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <StepSynthesis
        dossierId={DOSSIER}
        locale="fr"
        stepId="vigil-setup"
        estimate={estimate}
        adjustments={null}
        canAnswer
        panel={{ city: 'Libreville', groups: [] }}
        {...props}
      />
    </NextIntlClientProvider>,
  );
}

afterEach(cleanup);

describe('StepSynthesis', () => {
  it('affiche les quantités et le coût estimé au niveau choisi', () => {
    renderSynthesis();
    expect(
      screen.getByRole('heading', { level: 1, name: "L'installation de la veillée" }),
    ).toBeTruthy();
    expect(screen.getByText('4 tentes de 5 × 10 m')).toBeTruthy();
    expect(screen.getByText('188 chaises')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Coût estimé (Intermédiaire)' })).toBeTruthy();
    expect(screen.getByRole('rowheader', { name: 'Tentes et chaises' })).toBeTruthy();
    expect(screen.getByText(/300\s800/)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it("renvoie vers l'affluence sans réponse à B.1", () => {
    renderSynthesis({ estimate: null });
    expect(
      screen.getByText(
        "Indiquez d'abord combien de personnes sont attendues : les quantités en dépendent.",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Répondre aux personnes attendues' }).getAttribute('href'),
    ).toContain(`/dossier/${DOSSIER}/etape/attendance`);
  });

  it("propose au trésorier les postes à mettre à jour, ou dit qu'ils sont à jour", () => {
    renderSynthesis({
      adjustments: [
        {
          gridKey: 'tentsChairs',
          line: line('00000000-0000-4000-8000-000000000001', 'tentsChairs', 'Tentes et chaises'),
          amounts: { sober: 188_000, intermediate: 300_800, full: 451_200 },
          upToDate: false,
        },
        {
          gridKey: 'sound',
          line: line('00000000-0000-4000-8000-000000000002', 'sound', 'Sonorisation'),
          amounts: { sober: 150_000, intermediate: 300_000, full: 600_000 },
          upToDate: true,
        },
      ],
    });
    expect(
      screen.getByRole('button', { name: /Mettre à jour le poste Tentes et chaises : 300\s800/ }),
    ).toBeTruthy();
    expect(
      screen.getByText('Le poste Sonorisation correspond déjà à cette estimation.'),
    ).toBeTruthy();
  });

  it('masque le lien de modification à un lecteur', () => {
    renderSynthesis({ canAnswer: false });
    expect(screen.queryByRole('link', { name: 'Modifier les réponses' })).toBeNull();
    expect(screen.getByRole('link', { name: /Retour au dossier/ })).toBeTruthy();
  });
});
```

- [ ] **Step 2 : lancer le test, constater l'échec**

Run: `pnpm --filter @testimona/web test -- src/journey/ui/StepSynthesis`
Expected: FAIL, `./StepSynthesis` introuvable.

- [ ] **Step 3 : implémenter**

Créer `apps/web/src/journey/ui/StepSynthesis.tsx` :

```tsx
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { formatXaf } from '@/modules/budget/format';
import type { LineAdjustment } from '@/modules/budget/lines/model';
import { AdjustLineButton } from '@/modules/budget/lines/ui/AdjustLineButton';
import { AMOUNT_MAX } from '@/modules/budget/scenarios';
import type { PanelGroup } from '@/modules/providers/panel';
import { ProviderPanel } from '@/modules/providers/ui/ProviderPanel';
import type { StepEstimate } from '../quantities';

interface Props {
  dossierId: string;
  locale: string;
  stepId: string;
  /** null sans réponse à B.1. */
  estimate: StepEstimate | null;
  /** null si la personne ne peut pas ajuster les postes (rôle, clôture). */
  adjustments: readonly LineAdjustment[] | null;
  canAnswer: boolean;
  panel: { city: string; groups: readonly PanelGroup[] };
}

/**
 * Synthèse d'une étape (3.1, 3.2) : quantités, coût estimé au niveau de B.2, ajustement des
 * postes pour un trésorier, puis encadré prestataires. Rien n'est enregistré sans clic.
 */
export function StepSynthesis(props: Props) {
  const { dossierId, locale, stepId, estimate, adjustments, canAnswer, panel } = props;
  const t = useTranslations('journey');
  const tBudget = useTranslations('budget');
  const money = (amount: number) => formatXaf(amount, locale);
  const anyCapped = estimate?.costs.some((cost) => cost.capped) ?? false;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-foreground text-3xl font-bold">
          {t(`steps.${stepId}.title`)}
        </h1>
        {estimate && (
          <p className="text-muted-foreground">
            {t('synthesis.intro', {
              high: estimate.attendance.high,
              nights: estimate.attendance.nights,
            })}
          </p>
        )}
        {estimate?.attendance.nightsAssumed && (
          <p className="text-muted-foreground text-sm">{t('synthesis.nightsAssumed')}</p>
        )}
      </header>

      {!estimate ? (
        <section className="border-border space-y-3 rounded-2xl border p-5">
          <p className="text-foreground">{t('synthesis.noAttendance')}</p>
          {canAnswer && (
            <Link
              href={`/dossier/${dossierId}/etape/attendance`}
              className="text-primary text-sm font-semibold hover:underline"
            >
              {t('synthesis.answerAttendance')}
            </Link>
          )}
        </section>
      ) : (
        <>
          <section aria-labelledby="quantities-title" className="space-y-3">
            <h2
              id="quantities-title"
              className="font-display text-foreground text-lg font-semibold"
            >
              {t('synthesis.quantitiesTitle')}
            </h2>
            {estimate.quantities.length === 0 ? (
              <p className="text-muted-foreground">{t('synthesis.noQuantities')}</p>
            ) : (
              <ul className="text-foreground list-disc space-y-1 pl-5">
                {estimate.quantities.map((quantity) => (
                  <li key={quantity.key}>
                    {t(`synthesis.quantity.${quantity.key}`, { count: quantity.count })}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {estimate.costs.length > 0 && (
            <section aria-labelledby="cost-title" className="space-y-3">
              <h2 id="cost-title" className="font-display text-foreground text-lg font-semibold">
                {t('synthesis.costTitle', { level: tBudget(`level.${estimate.level}`) })}
              </h2>
              <div className="border-border overflow-x-auto rounded-2xl border">
                <table className="w-full text-sm">
                  <thead className="sr-only">
                    <tr>
                      <th scope="col">{t('synthesis.line')}</th>
                      <th scope="col">{tBudget(`level.${estimate.level}`)}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estimate.costs.map((cost) => (
                      <tr key={cost.gridKey} className="border-border border-b last:border-0">
                        <th scope="row" className="px-4 py-2 text-left font-normal">
                          {tBudget(`grid.${cost.gridKey}`)}
                          {cost.capped && (
                            <>
                              <span aria-hidden="true"> *</span>
                              <span className="sr-only"> ({t('synthesis.capped')})</span>
                            </>
                          )}
                        </th>
                        <td className="px-4 py-2 text-right tabular-nums">
                          {money(cost.amounts[estimate.level])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-muted-foreground text-sm">{t('synthesis.costNote')}</p>
              {anyCapped && (
                <p role="note" className="text-muted-foreground text-sm">
                  * {t('synthesis.cappedNote', { max: money(AMOUNT_MAX) })}
                </p>
              )}
            </section>
          )}

          {adjustments && adjustments.length > 0 && (
            <section aria-labelledby="adjust-title" className="space-y-3">
              <h2 id="adjust-title" className="font-display text-foreground text-lg font-semibold">
                {t('synthesis.adjustTitle')}
              </h2>
              <p className="text-muted-foreground text-sm">{t('synthesis.adjustHint')}</p>
              <ul className="space-y-3">
                {adjustments.map((adjustment) => (
                  <li key={adjustment.gridKey}>
                    {adjustment.upToDate ? (
                      <p className="text-foreground text-sm">
                        {t('synthesis.upToDate', { line: adjustment.line.label })}
                      </p>
                    ) : (
                      <AdjustLineButton
                        dossierId={dossierId}
                        lineId={adjustment.line.id}
                        label={adjustment.line.label}
                        amounts={adjustment.amounts}
                        text={t('synthesis.adjust', {
                          line: adjustment.line.label,
                          amount: money(adjustment.amounts[estimate.level]),
                        })}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      <ProviderPanel city={panel.city} groups={panel.groups} />

      <div className="flex flex-wrap justify-between gap-3 text-sm">
        {canAnswer && (
          <Link
            href={`/dossier/${dossierId}/etape/${stepId}`}
            className="text-secondary font-semibold underline underline-offset-2"
          >
            {t('synthesis.editAnswers')}
          </Link>
        )}
        <Link
          href={`/dossier/${dossierId}`}
          className="text-foreground underline underline-offset-2"
        >
          ← {t('synthesis.backToDossier')}
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 4 : relancer le test**

Run: `pnpm --filter @testimona/web test -- src/journey/ui/StepSynthesis`
Expected: PASS (4 tests). Les montants sont cherchés avec `/300\s800/` : `\s` couvre l'espace fine insécable (U+202F) de `Intl.NumberFormat` en français.

- [ ] **Step 5 : commit**

```bash
git add apps/web/src/journey/ui/StepSynthesis.tsx apps/web/src/journey/ui/StepSynthesis.test.tsx
git commit -m "feat(journey): render step summaries with quantities, cost and providers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9 : page de synthèse

**Files:**

- Create: `apps/web/src/app/[locale]/(dossier)/dossier/[id]/etape/[stepId]/synthese/page.tsx`

Pas de test unitaire de page (comme `budget/page.tsx`) : la logique est dans les fonctions et composants testés aux tâches 2 à 8. La vérification se fait au build et à la main (Task 10).

- [ ] **Step 1 : créer la page**

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { z } from 'zod';
import { ESTIMATE_KEYS, estimateFor, hasEstimate } from '@/journey/quantities';
import { getStep, isStepOpen } from '@/journey/registry';
import { StepSynthesis } from '@/journey/ui/StepSynthesis';
import { getClosure } from '@/modules/budget/closing/repo';
import { canManageLedger } from '@/modules/budget/ledger/contributions-view';
import { type LineAdjustment, lineAdjustments } from '@/modules/budget/lines/model';
import { listLines } from '@/modules/budget/lines/repo';
import { listAnswersResult } from '@/modules/dossier/answers/repo';
import { getDeathCity, getDossier, getMyRole } from '@/modules/dossier/repo';
import { canWrite } from '@/modules/dossier/roles';
import { panelCity, type PanelGroup } from '@/modules/providers/panel';
import { providersForPanel } from '@/modules/providers/service';

export const metadata: Metadata = { robots: { index: false, follow: false } };

const IdSchema = z.string().uuid();

export default async function StepSynthesisPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; stepId: string }>;
}) {
  const { locale, id, stepId } = await params;
  setRequestLocale(locale);
  const step = getStep(stepId);
  if (!IdSchema.safeParse(id).success || !step || step.summary !== 'step') notFound();
  if (!hasEstimate(step.id)) notFound();

  const dossier = await getDossier(id);
  if (!dossier || !isStepOpen(dossier.entryPoint, step.id)) notFound();

  const keys = [...step.questions.map((question) => question.key), ...ESTIMATE_KEYS];
  const [role, answers, closure, deathCity] = await Promise.all([
    getMyRole(id),
    listAnswersResult(id, keys),
    getClosure(id),
    getDeathCity(id),
  ]);
  // WHY: des quantités nulles sur une lecture en échec seraient trompeuses ; error.tsx prend le
  // relais.
  if (answers.error) throw new Error('step summary answers unreadable');
  const estimate = estimateFor(step.id, answers.data);

  // WHY: ajuster un poste est réservé au trésorier et refusé (TL009) une fois les cotisations
  // clôturées ; une clôture ou des postes illisibles masquent le bouton plutôt que de proposer
  // une écriture refusée.
  let adjustments: LineAdjustment[] | null = null;
  if (estimate && canManageLedger(role) && !closure.error && !closure.data.closedAt) {
    const lines = await listLines(id);
    adjustments = lines.error ? null : lineAdjustments(estimate.costs, lines.data);
  }

  const city = panelCity(deathCity);
  let groups: PanelGroup[] = [];
  if (step.providers) {
    const res = await providersForPanel(step.providers, city);
    // WHY: l'encadré est un complément ; s'il est illisible, la synthèse reste utile sans lui.
    groups = res.ok ? res.data : [];
  }

  return (
    <div className="px-4 py-8 sm:px-6 lg:py-12">
      <StepSynthesis
        dossierId={id}
        locale={locale}
        stepId={step.id}
        estimate={estimate}
        adjustments={adjustments}
        canAnswer={canWrite(role)}
        panel={{ city, groups }}
      />
    </div>
  );
}
```

- [ ] **Step 2 : typecheck**

Run: `pnpm --filter @testimona/web typecheck`
Expected: aucune erreur. Si `closure.data` n'est pas affiné par `!closure.error`, vérifier que `getClosure` renvoie bien `RepoResult<Closure>` (union discriminée de `modules/dossier/repo.ts`).

- [ ] **Step 3 : commit**

```bash
git add 'apps/web/src/app/[locale]/(dossier)/dossier/[id]/etape/[stepId]/synthese/page.tsx'
git commit -m "feat(journey): add the step summary page for the vigil steps

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10 : vérification complète et documentation

**Files:**

- Modify: `docs/superpowers/specs/2026-10-28-lot-3-funerailles-design.md` (seulement si une décision de ce plan change la spec)

- [ ] **Step 1 : suite complète**

Run: `pnpm --filter @testimona/web test`
Expected: PASS, aucune régression (registre, redirection, messages compris).

Run: `pnpm --filter @testimona/supabase test`
Expected: PASS (aucune migration, la suite ne doit pas bouger).

- [ ] **Step 2 : typecheck, lint, build**

Run: `pnpm --filter @testimona/web typecheck && pnpm --filter @testimona/web lint && pnpm --filter @testimona/web build`
Expected: aucune erreur ; pas de nouvel avertissement de lint ; la route `/[locale]/dossier/[id]/etape/[stepId]/synthese` apparaît dans la sortie du build.

- [ ] **Step 3 : vérification à la main (serveur local)**

Avec un compte de test et un dossier « décès » local :

1. Répondre à B.1 puis aux six questions de 3.1 : la dernière réponse mène à `/etape/vigil-setup/synthese`.
2. La synthèse montre tentes, chaises, lumières, son, le coût au niveau de B.2 et l'encadré « Prestataires à Libreville » avec les exemples.
3. En trésorier, avec des postes créés : « Mettre à jour le poste … » met à jour le poste ; la synthèse affiche ensuite « correspond déjà ». Le poste est marqué modifié dans `/cotisations/postes`.
4. Cotisations clôturées : le bouton disparaît.
5. Sans réponse à B.1 : message et lien vers l'affluence.
6. Le tableau de bord du dossier affiche « Voir la synthèse » sous 3.1 et sous 3.2.

- [ ] **Step 4 : aligner la spec si besoin, puis commit**

Si une décision de ce plan précise la spec (synthèse `'step'`, ville comparée en code, éclairage sans coût), ajouter une phrase dans la section concernée de la spec.

```bash
git add docs/superpowers/specs/2026-10-28-lot-3-funerailles-design.md
git commit -m "docs(lot3): align the spec with the vigil implementation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Risques à reporter dans la PR

- Les ratios de quantités et de coût sont des hypothèses (« estimation à vérifier ») ; à valider avec des familles et des prestataires de Libreville.
- Ajuster un poste le marque « modifié » : « Recalculer selon l'affluence » ne le touchera plus. C'est voulu et dit dans le texte d'aide.
- Le bouton écrit un poste à la fois ; si deux trésoriers ajustent en même temps, la dernière écriture gagne, comme pour la modification manuelle.
- Un prestataire vérifié n'est pas encore contactable depuis l'encadré (demande de devis en PR 3). En production il n'y a aujourd'hui que des exemples.
- La ville du décès est comparée sans casse ni accents, mais « Port Gentil » et « Port-Gentil » restent différents.
- Pas de test de page (comme les autres pages du dossier) ; la vérification à la main de la Task 10 le couvre.
