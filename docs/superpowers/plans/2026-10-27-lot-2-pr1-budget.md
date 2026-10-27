# Lot 2 · PR 1 — Budget : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** la famille estime l'affluence (étape B.1), voit trois budgets calculés (sobre, intermédiaire, complet) sur une page « Budget prévisionnel », puis indique le niveau envisagé (étape B.2).

**Architecture:** une nouvelle sorte de question `number` dans le moteur du lot 1 ; deux étapes déclaratives (`attendance`, `budget`) ouvertes à la porte « décès » ; un module `apps/web/src/modules/budget/` de fonctions pures (grille de référence, affluence, scénarios, format XAF) ; une page serveur `/dossier/[id]/budget` qui calcule tout à partir des réponses. Aucune table, aucune migration dans cette PR.

**Tech Stack:** Next.js 15 (App Router, Server Components), React 19, next-intl 3, Zod 3, Vitest, Playwright.

Spec : `docs/superpowers/specs/2026-10-27-lot-2-financer-design.md` (§ 2 parcours, § 3 module `budget`, livraison PR 1).

---

## Décisions de ce plan (écarts à la spec, à valider dans la PR)

- **Pas de table dans la PR 1.** La spec range `dossier_finance` (scénario) et `budget_line` en PR 1. Or le scénario « retenu » s'écrit par trésorier et plus, et les postes ne deviennent modifiables qu'avec l'onglet « Postes » de la PR 2. Ici, tout est calculé à la volée depuis la grille et les réponses ; les deux tables arrivent en PR 2, où le trésorier **retient** le scénario (prérempli par le niveau envisagé) et où les postes sont enregistrés.
- **B.2 = niveau envisagé par la famille.** La réponse `budget.level` est une réponse de parcours ordinaire (contributeur et plus, comme toutes les questions). Elle met en avant un scénario sur la page Budget ; elle ne fixe pas encore le budget retenu.
- **Fin d'étape vers la page Budget.** Les étapes B.1 et B.2 se terminent sur `/dossier/[id]/budget` (comme les étapes à brouillon se terminent sur `/brouillon`) : après B.1, la famille voit les trois totaux avant de choisir ; après B.2, le niveau choisi est mis en avant.
- **Affluence :** basse = somme des quatre réponses de B.1 ; haute = basse × 1,25 arrondi au supérieur (les invités viennent accompagnés). Les scénarios utilisent la fourchette haute.
- **Occasions :** jour des obsèques + nuits de veillée (`nuits + 1`) ; nuits non répondues = 1, 0 répondu = pas de veillée. Le jour des obsèques reçoit toute la fourchette haute, chaque nuit de veillée la moitié (arrondie au supérieur). La sonorisation se compte par occasion.
- **Plafond :** chaque poste est plafonné à 100 000 000 XAF (borne d'un montant du registre), avec un indicateur affiché sur la page Budget.
- **Grille de référence :** 12 postes, prix en XAF pour Libreville, tous marqués « estimation à vérifier » ; à corriger par le propriétaire du projet avant la mise en production.

## Structure des fichiers

| Fichier                                                                                 | Rôle                                                           |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `apps/web/src/journey/types.ts`                                                         | `NumberQuestion`, schéma d'une réponse nombre, `Step.summary`  |
| `apps/web/src/journey/define.ts`                                                        | `q.number`, contrôles (bornes, `draft` et `summary` exclusifs) |
| `apps/web/src/journey/options.ts`                                                       | `LEVELS` (`sober`, `intermediate`, `full`)                     |
| `apps/web/src/journey/ui/values.ts`                                                     | Valeur éditable d'une question nombre                          |
| `apps/web/src/journey/ui/inputs/NumberInput.tsx`                                        | Champ nombre                                                   |
| `apps/web/src/journey/ui/AnswerInput.tsx`                                               | Aiguillage vers `NumberInput`                                  |
| `apps/web/src/journey/ui/specific-error.ts`                                             | Messages `invalid number`, `out of range`                      |
| `apps/web/src/journey/steps/b-1-attendance.ts`, `b-2-budget.ts`                         | Étapes B.1 et B.2                                              |
| `apps/web/src/journey/registry.ts`                                                      | Ordre de la porte « décès »                                    |
| `apps/web/src/modules/dossier/answers/redirect.ts`                                      | `stepEndPath` (brouillon, page de synthèse ou dossier)         |
| `apps/web/src/app/[locale]/(dossier)/dossier/[id]/etape/[stepId]/page.tsx`              | Lien « Suivant » des lecteurs en fin d'étape                   |
| `apps/web/src/journey/ui/JourneyOverview.tsx`                                           | Lien « Voir le budget »                                        |
| `apps/web/src/modules/budget/grid.ts`                                                   | Grille de référence                                            |
| `apps/web/src/modules/budget/scenarios.ts`                                              | Affluence, montants par poste, totaux, niveau choisi           |
| `apps/web/src/modules/budget/format.ts`                                                 | Montant en XAF selon la langue                                 |
| `apps/web/src/modules/budget/ui/BudgetOverview.tsx`                                     | Contenu de la page Budget                                      |
| `apps/web/src/app/[locale]/(dossier)/dossier/[id]/budget/page.tsx`                      | Page Budget                                                    |
| `apps/web/messages/{fr,en}.json`                                                        | Textes `journey.*` et nouvel espace `budget.*`                 |
| `apps/web/src/journey/messages.test.ts`, `apps/web/src/modules/budget/messages.test.ts` | Gardes des textes                                              |
| `apps/web/e2e/smoke.spec.ts`                                                            | La page Budget exige une connexion                             |

Règles du lot 0 : accès base uniquement dans les `repo.ts` (cette PR n'en ajoute pas), 300 lignes au maximum par fichier, `pnpm exec prettier --write <fichiers touchés>` avant chaque commit. Commits conventionnels en anglais terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Commentaires et JSDoc en français, `// WHY:` pour les choix.

---

### Tâche 1 : question de type nombre

**Files:**

- Modify: `apps/web/src/journey/types.ts`, `apps/web/src/journey/define.ts`, `apps/web/src/journey/ui/values.ts`, `apps/web/src/journey/ui/AnswerInput.tsx`, `apps/web/src/journey/ui/specific-error.ts`
- Create: `apps/web/src/journey/ui/inputs/NumberInput.tsx`
- Modify: `apps/web/messages/fr.json`, `apps/web/messages/en.json`, `apps/web/src/journey/messages.test.ts`
- Test: `apps/web/src/journey/types.test.ts`, `apps/web/src/journey/define.test.ts`, `apps/web/src/journey/ui/values.test.ts`, `apps/web/src/journey/ui/specific-error.test.ts`

- [ ] **Étape 1 : écrire les tests (ils échouent)**

À la fin de `apps/web/src/journey/types.test.ts` :

```ts
describe('answerSchema : nombre', () => {
  const guests: Question = { kind: 'number', key: 'attendance.close', min: 0, max: 2000 };
  const issue = (value: unknown) => answerSchema(guests).safeParse(value).error?.issues[0]?.message;

  it('accepte un entier ou une chaîne de chiffres, et rend un nombre', () => {
    expect(answerSchema(guests).parse(12)).toBe(12);
    expect(answerSchema(guests).parse(' 12 ')).toBe(12);
    expect(answerSchema(guests).parse(0)).toBe(0);
  });

  it('refuse un nombre mal formé', () => {
    expect(issue('-3')).toBe('invalid number');
    expect(issue('1.5')).toBe('invalid number');
    expect(issue(1.5)).toBe('invalid number');
    expect(issue('abc')).toBe('invalid number');
    expect(issue(true)).toBe('invalid number');
  });

  it('refuse un nombre hors des bornes', () => {
    expect(issue(2001)).toBe('out of range');
    expect(issue(-1)).toBe('out of range');
  });
});
```

À la fin de `apps/web/src/journey/define.test.ts` :

```ts
describe('q.number', () => {
  it('crée une question nombre, bornée à partir de 0 par défaut', () => {
    expect(q.number('demo.count', { max: 10 })).toEqual({
      kind: 'number',
      key: 'demo.count',
      min: 0,
      max: 10,
    });
  });

  it('refuse des bornes invalides', () => {
    const step = (min: number, max: number) =>
      defineStep({ id: 'demo', questions: [q.number('demo.count', { min, max })] });
    expect(() => step(5, 5)).toThrow(/bornes invalides/);
    expect(() => step(-1, 5)).toThrow(/bornes invalides/);
    expect(() => step(0, 1.5)).toThrow(/bornes invalides/);
    expect(() => step(0, 2_000_000_000)).toThrow(/bornes invalides/);
  });

  it('refuse une étape qui a à la fois un brouillon et une page de synthèse', () => {
    expect(() =>
      defineStep({
        id: 'demo',
        questions: [q.number('demo.count', { max: 10 })],
        draft: { key: 'demo.text', kind: 'whatsapp' },
        summary: 'budget',
      }),
    ).toThrow(/brouillon et page de synthèse/);
  });
});
```

Dans `apps/web/src/journey/ui/values.test.ts`, à la fin du `describe('toEditable', …)` (avant sa fermeture) :

```ts
it('reprend un nombre enregistré sous forme de texte, sinon un champ vide', () => {
  const count: Question = { kind: 'number', key: 'attendance.close', min: 0, max: 2000 };
  expect(toEditable(count, 40, 'GA')).toBe('40');
  expect(toEditable(count, 0, 'GA')).toBe('0');
  expect(toEditable(count, SKIPPED, 'GA')).toBe('');
  expect(toEditable(count, '40', 'GA')).toBe('');
  expect(toEditable(count, undefined, 'GA')).toBe('');
});
```

Dans `apps/web/src/journey/ui/specific-error.test.ts`, avant le test « renvoie null… » :

```ts
it('reconnaît un nombre invalide ou hors des bornes', () => {
  expect(specificMessage({ '': 'invalid number' })).toBe('ui.invalidNumber');
  expect(specificMessage({ '': 'out of range' })).toBe('ui.outOfRange');
});
```

Dans `apps/web/src/journey/messages.test.ts`, ajouter `'invalidNumber'` et `'outOfRange'` à la liste mappée sur `` `journey.ui.${key}` `` (après `'invalidCharacter'`).

- [ ] **Étape 2 : lancer les tests**

Run: `pnpm --filter @testimona/web test -- src/journey`
Expected: FAIL (`kind: 'number'` inconnu, `q.number` absent, clés `ui.invalidNumber` et `ui.outOfRange` absentes).

- [ ] **Étape 3 : types et schéma**

Dans `apps/web/src/journey/types.ts` :

1. Après `export type ChoiceQuestion = …;`, ajouter :

```ts
/** Nombre entier borné (affluence, nuits…), saisi en chiffres. */
export type NumberQuestion = { kind: 'number'; key: string; min: number; max: number };
```

2. Remplacer l'union `Question` par :

```ts
export type Question =
  | { kind: 'shortText' | 'longText' | 'date' | 'place'; key: string }
  | ChoiceQuestion
  | NumberQuestion
  | ListQuestion;
```

3. Remplacer l'interface `Step` par :

```ts
/** Page qui conclut une étape sans brouillon (segment sous `/dossier/<id>/`). */
export type StepSummary = 'budget';

/** Une étape du parcours : `id` sert de segment d'URL (`/etape/<id>`). */
export interface Step {
  id: string;
  questions: readonly Question[];
  draft?: StepDraft;
  /** Page de synthèse affichée à la fin de l'étape ; exclusive de `draft`. */
  summary?: StepSummary;
}
```

4. Après `const oneOf = …;`, ajouter :

```ts
// WHY: le navigateur envoie le champ en texte ; on accepte aussi un nombre JSON, et on stocke
// toujours un entier. Une seule erreur précise (« invalid number ») plutôt que l'erreur
// générique d'une union Zod.
const integerIn = (min: number, max: number) =>
  z
    .unknown()
    .transform((v, ctx) => {
      if (typeof v === 'number') return v;
      if (typeof v === 'string' && /^\d{1,9}$/.test(v.trim())) return Number(v.trim());
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'invalid number' });
      return z.NEVER;
    })
    .pipe(z.number().int('invalid number').min(min, 'out of range').max(max, 'out of range'));
```

5. Dans `rawAnswerSchema`, après le cas `'choice'` :

```ts
    case 'number':
      return integerIn(question.min, question.max);
```

- [ ] **Étape 4 : fabrique et contrôles**

Dans `apps/web/src/journey/define.ts` :

1. Ajouter `type NumberQuestion` aux imports depuis `./types`.
2. Ajouter dans l'objet `q`, après `choice` :

```ts
  number: (key: string, bounds: { min?: number; max: number }): NumberQuestion => ({
    kind: 'number',
    key,
    min: bounds.min ?? 0,
    max: bounds.max,
  }),
```

3. Au début du corps de `defineStep`, après le contrôle de l'identifiant :

```ts
if (step.draft && step.summary) {
  throw new Error(`Étape ${step.id} : brouillon et page de synthèse sont exclusifs`);
}
```

4. Au début de `checkQuestion` :

```ts
if (question.kind === 'number') {
  const { min, max } = question;
  // WHY: au-delà de 9 chiffres, la saisie (texte) et le schéma ne se comprennent plus.
  if (
    !Number.isInteger(min) ||
    !Number.isInteger(max) ||
    min < 0 ||
    max <= min ||
    max > 999_999_999
  ) {
    throw new Error(`Étape ${stepId} : bornes invalides pour « ${question.key} »`);
  }
  return;
}
```

- [ ] **Étape 5 : saisie**

Dans `apps/web/src/journey/ui/values.ts`, dans `toEditable`, avant `default:` :

```ts
    case 'number':
      return known && typeof stored === 'number' ? String(stored) : '';
```

Créer `apps/web/src/journey/ui/inputs/NumberInput.tsx` :

```tsx
import type { NumberQuestion } from '../../types';
import { FIELD_CLASS, type FieldProps } from '../field';

/** Nombre entier saisi en chiffres ; le clavier numérique s'ouvre sur mobile. */
export function NumberInput({
  question,
  ...props
}: FieldProps<string> & { question: NumberQuestion }) {
  return (
    <input
      id={props.id}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={props.value}
      // WHY: on ne garde que les chiffres ; les bornes sont vérifiées par le serveur.
      onChange={(e) => props.onChange(e.target.value.replace(/\D/g, ''))}
      readOnly={props.readOnly}
      data-readonly={props.readOnly}
      maxLength={String(question.max).length}
      autoComplete="off"
      aria-invalid={props.invalid}
      aria-labelledby={props.labelledBy}
      aria-describedby={props.describedBy}
      className={FIELD_CLASS}
    />
  );
}
```

Dans `apps/web/src/journey/ui/AnswerInput.tsx`, importer `NumberInput` (`import { NumberInput } from './inputs/NumberInput';`) et ajouter après le cas `'choice'` :

```tsx
    case 'number':
      return <NumberInput {...text} question={question} />;
```

Dans `apps/web/src/journey/ui/specific-error.ts`, ajouter dans `SPECIFIC_MESSAGES`, après `'invalid character'` :

```ts
  'invalid number': 'ui.invalidNumber',
  'out of range': 'ui.outOfRange',
```

- [ ] **Étape 6 : textes**

Dans `apps/web/messages/fr.json`, sous `journey.ui`, après `"invalidCharacter"` :

```json
"invalidNumber": "Entrez un nombre entier, en chiffres.",
"outOfRange": "Ce nombre sort des limites prévues pour cette question."
```

Dans `apps/web/messages/en.json`, au même endroit :

```json
"invalidNumber": "Enter a whole number, in digits.",
"outOfRange": "This number is outside the range expected for this question."
```

- [ ] **Étape 7 : relancer les tests**

Run: `pnpm --filter @testimona/web test -- src/journey && pnpm --filter @testimona/web typecheck`
Expected: PASS ; `typecheck` sans erreur (les `switch` exhaustifs sur `question.kind` couvrent `number`).

- [ ] **Étape 8 : commit**

```bash
git add apps/web/src/journey apps/web/messages/fr.json apps/web/messages/en.json
git commit -m "feat(journey): add bounded whole-number questions"
```

---

### Tâche 2 : grille de référence et scénarios

> **Note après revue :** le modèle de calcul a été affiné (commit `883cb55`) : modes `perOccasion` et `perGuestOccasion` à la place de `perNight` et `perPersonNight`, occasions = nuits + 1, moitié de l'affluence haute par nuit de veillée, plafond `AMOUNT_MAX` par poste avec `capped`, `GRID_KEYS` exporté. Le code de la branche fait foi ; les extraits ci-dessous sont ceux de la première version.

**Files:**

- Modify: `apps/web/src/journey/options.ts`
- Create: `apps/web/src/modules/budget/grid.ts`, `scenarios.ts`, `format.ts`
- Test: `apps/web/src/modules/budget/scenarios.test.ts`, `apps/web/src/modules/budget/format.test.ts`

- [ ] **Étape 1 : écrire les tests (ils échouent)**

`apps/web/src/modules/budget/scenarios.test.ts` :

```ts
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
```

Vérification des montants attendus (fourchette haute 188, 2 nuits, niveau sobre) : forfaits = 150 000 + 300 000 + 50 000 + 100 000 + 25 000 + 30 000 + 50 000 + 50 000 = 755 000 ; par personne et par nuit = (500 + 2 500 + 1 000) × 188 × 2 = 1 504 000 ; par nuit = 50 000 × 2 = 100 000 ; total = 2 359 000. Sans affluence (une nuit) : 755 000 + 50 000 = 805 000.

`apps/web/src/modules/budget/format.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { formatXaf } from './format';

describe('formatXaf', () => {
  it('affiche un montant entier en francs CFA, selon la langue', () => {
    for (const locale of ['fr', 'en']) {
      const text = formatXaf(2_359_000, locale);
      expect(text.replace(/\D/g, '')).toBe('2359000');
      expect(text).toMatch(/FCFA|XAF/);
    }
  });
});
```

- [ ] **Étape 2 : lancer les tests**

Run: `pnpm --filter @testimona/web test -- src/modules/budget`
Expected: FAIL (modules introuvables).

- [ ] **Étape 3 : niveaux**

À la fin de `apps/web/src/journey/options.ts` :

```ts
/** Niveaux de cérémonie, du plus simple au plus complet (budget, étape B.2). */
export const LEVELS = ['sober', 'intermediate', 'full'] as const;
export type Level = (typeof LEVELS)[number];
```

- [ ] **Étape 4 : grille**

`apps/web/src/modules/budget/grid.ts` :

```ts
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
```

- [ ] **Étape 5 : scénarios**

`apps/web/src/modules/budget/scenarios.ts` :

```ts
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
```

- [ ] **Étape 6 : format**

`apps/web/src/modules/budget/format.ts` :

```ts
/**
 * Montant entier en francs CFA (XAF), au format de la langue de l'interface.
 *
 * @example
 * formatXaf(2_359_000, 'fr'); // « 2 359 000 FCFA »
 */
export function formatXaf(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(amount);
}
```

- [ ] **Étape 7 : relancer les tests**

Run: `pnpm --filter @testimona/web test -- src/modules/budget && pnpm --filter @testimona/web typecheck`
Expected: PASS.

- [ ] **Étape 8 : commit**

```bash
git add apps/web/src/journey/options.ts apps/web/src/modules/budget
git commit -m "feat(budget): add the reference grid and the three budget scenarios"
```

---

### Tâche 3 : étapes B.1 et B.2, fin d'étape vers la page Budget

**Files:**

- Create: `apps/web/src/journey/steps/b-1-attendance.ts`, `apps/web/src/journey/steps/b-2-budget.ts`
- Modify: `apps/web/src/journey/registry.ts`, `apps/web/src/modules/dossier/answers/redirect.ts`, `apps/web/src/app/[locale]/(dossier)/dossier/[id]/etape/[stepId]/page.tsx`, `apps/web/src/journey/ui/JourneyOverview.tsx`
- Modify: `apps/web/messages/fr.json`, `apps/web/messages/en.json`, `apps/web/src/journey/messages.test.ts`
- Test: `apps/web/src/journey/registry.test.ts`, `apps/web/src/modules/dossier/answers/redirect.test.ts`

- [ ] **Étape 1 : écrire les tests (ils échouent)**

Dans `apps/web/src/journey/registry.test.ts`, remplacer l'attente de la porte « décès » du premier test par :

```ts
expect(stepsFor('death').map((s) => s.id)).toEqual([
  'broadcast-list',
  'immediate-message',
  'email-announcement',
  'attendance',
  'budget',
  'biography',
]);
```

et ajouter à la fin du `describe('registre du parcours', …)` :

```ts
it('pose les questions du budget et conclut sur la page Budget', () => {
  expect(getStep('attendance')?.questions.map((q) => q.key)).toEqual([
    'attendance.close',
    'attendance.extended',
    'attendance.friends',
    'attendance.community',
    'attendance.nights',
  ]);
  expect(getStep('attendance')?.questions.every((q) => q.kind === 'number')).toBe(true);
  expect(getStep('budget')?.questions).toEqual([
    { kind: 'choice', key: 'budget.level', options: ['sober', 'intermediate', 'full'] },
  ]);
  expect(getStep('attendance')?.summary).toBe('budget');
  expect(getStep('budget')?.summary).toBe('budget');
  expect(isStepOpen('prepare', 'attendance')).toBe(false);
});
```

Dans `apps/web/src/modules/dossier/answers/redirect.test.ts`, ajouter (en adaptant l'import : `import { answerRedirectTarget, stepEndPath } from './redirect';`) :

```ts
describe('stepEndPath', () => {
  const base: Step = { id: 'plain', questions: [{ kind: 'shortText', key: 'plain.a' }] };

  it('mène au brouillon, à la page de synthèse ou au dossier', () => {
    expect(stepEndPath(ID, { ...base, draft: { key: 'plain.text', kind: 'whatsapp' } })).toBe(
      `/dossier/${ID}/etape/plain/brouillon`,
    );
    expect(stepEndPath(ID, { ...base, summary: 'budget' })).toBe(`/dossier/${ID}/budget`);
    expect(stepEndPath(ID, base)).toBe(`/dossier/${ID}`);
  });

  it('termine une étape à synthèse sur sa page', () => {
    const step: Step = { ...base, summary: 'budget' };
    expect(answerRedirectTarget(ID, step, { 'plain.a': 'x' }, 0)).toBe(`/dossier/${ID}/budget`);
  });
});
```

(`ID` et le type `Step` sont déjà présents dans ce fichier ; sinon, les importer comme dans les tests existants.)

Dans `apps/web/src/journey/messages.test.ts` :

1. Ajouter `'summary.budget'` à la liste mappée sur `` `journey.dashboard.${key}` `` qui contient `'viewDraft'`.
2. Dans `requiredPaths`, après la ligne `if (step.draft) …`, ajouter :

```ts
if (step.summary) paths.push(`journey.dashboard.summary.${step.summary}`);
```

- [ ] **Étape 2 : lancer les tests**

Run: `pnpm --filter @testimona/web test -- src/journey src/modules/dossier/answers`
Expected: FAIL (étapes et `stepEndPath` absents, textes manquants).

- [ ] **Étape 3 : étapes**

`apps/web/src/journey/steps/b-1-attendance.ts` :

```ts
import { defineStep, q } from '../define';

/** Étape B.1 : estimer l'affluence, cercle par cercle, et la durée de la veillée. */
export const attendanceStep = defineStep({
  id: 'attendance',
  questions: [
    q.number('attendance.close', { max: 500 }),
    q.number('attendance.extended', { max: 2000 }),
    q.number('attendance.friends', { max: 2000 }),
    q.number('attendance.community', { max: 2000 }),
    q.number('attendance.nights', { max: 7 }),
  ],
  summary: 'budget',
});
```

`apps/web/src/journey/steps/b-2-budget.ts` :

```ts
import { defineStep, q } from '../define';
import { LEVELS } from '../options';

/**
 * Étape B.2 : le niveau de cérémonie envisagé par la famille.
 * WHY: c'est une préférence ; le budget retenu sera confirmé par un trésorier (lot 2, PR 2).
 */
export const budgetStep = defineStep({
  id: 'budget',
  questions: [q.choice('budget.level', LEVELS)],
  summary: 'budget',
});
```

Dans `apps/web/src/journey/registry.ts`, importer les deux étapes et remplacer `STEPS_BY_ENTRY` et son commentaire par :

```ts
import { attendanceStep } from './steps/b-1-attendance';
import { budgetStep } from './steps/b-2-budget';
```

```ts
/**
 * Étapes proposées, dans l'ordre, selon la porte d'entrée du dossier.
 * WHY: après un décès, prévenir est plus urgent que raconter : les annonces passent en premier,
 * puis l'estimation du budget (on cotise dès les premiers jours), puis la biographie.
 */
const STEPS_BY_ENTRY: Record<EntryPoint, readonly Step[]> = {
  death: [
    broadcastListStep,
    immediateMessageStep,
    emailAnnouncementStep,
    attendanceStep,
    budgetStep,
    biographyStep,
  ],
  prepare: [biographyStep],
  after: [],
};
```

- [ ] **Étape 4 : fin d'étape**

Remplacer `apps/web/src/modules/dossier/answers/redirect.ts` par :

```ts
import { nextQuestionInStep, type Answers } from '@/journey/progress';
import type { Step } from '@/journey/types';

/**
 * Chemin (non localisé) qui conclut une étape : son brouillon (2.2, 2.3), sa page de synthèse
 * (B.1, B.2 → budget), sinon le tableau de bord du dossier.
 *
 * @example
 * stepEndPath(dossierId, attendanceStep); // '/dossier/<id>/budget'
 */
export function stepEndPath(dossierId: string, step: Step): string {
  if (step.draft) return `/dossier/${dossierId}/etape/${step.id}/brouillon`;
  if (step.summary) return `/dossier/${dossierId}/${step.summary}`;
  return `/dossier/${dossierId}`;
}

/**
 * Chemin (non localisé) où aller après avoir enregistré la question `index` de `step` : la
 * prochaine question non traitée ou passée de l'étape, sinon la fin de l'étape
 * (`stepEndPath`).
 *
 * @example
 * answerRedirectTarget(dossierId, biography, answers, 0); // '/dossier/<id>/etape/biography?q=1'
 */
export function answerRedirectTarget(
  dossierId: string,
  step: Step,
  answers: Answers,
  index: number,
): string {
  const next = nextQuestionInStep(step, answers, index);
  if (next !== null) return `/dossier/${dossierId}/etape/${step.id}?q=${next}`;
  return stepEndPath(dossierId, step);
}
```

Dans `apps/web/src/app/[locale]/(dossier)/dossier/[id]/etape/[stepId]/page.tsx` :

1. Importer `import { stepEndPath } from '@/modules/dossier/answers/redirect';`.
2. Remplacer la valeur de `nextHref` par :

```tsx
        nextHref={
          index + 1 < step.questions.length
            ? `${stepPath}?q=${index + 1}`
            : // WHY: un lecteur ne répond pas, mais doit pouvoir lire le brouillon ou la synthèse.
              !canWrite(role) && (step.draft || step.summary)
              ? stepEndPath(id, step)
              : null
        }
```

Dans `apps/web/src/journey/ui/JourneyOverview.tsx`, juste après le bloc `{step.draft && (…)}`, ajouter :

```tsx
{
  step.summary && (
    <Link
      href={`/dossier/${dossierId}/${step.summary}`}
      className="text-primary text-sm font-semibold hover:underline"
    >
      {t(`dashboard.summary.${step.summary}`)} <span className="sr-only">{title}</span>
    </Link>
  );
}
```

- [ ] **Étape 5 : textes**

Dans `apps/web/messages/fr.json` :

1. Sous `journey.steps`, ajouter :

```json
"attendance": {
  "title": "L'affluence",
  "description": "Combien de personnes attendre, pour dimensionner la veillée et les repas."
},
"budget": {
  "title": "Le budget",
  "description": "Le niveau de cérémonie envisagé, parmi trois budgets estimés."
}
```

2. Sous `journey.q`, ajouter :

```json
"attendance": {
  "close": {
    "title": "Combien de proches de {name} (famille directe) seront présents ?",
    "hint": "Conjoint, enfants, parents, frères et sœurs, avec leurs familles. Une estimation suffit."
  },
  "extended": {
    "title": "Et combien de membres de la famille élargie ?",
    "hint": "Oncles, tantes, cousins, belle-famille. Une estimation suffit."
  },
  "friends": {
    "title": "Combien d'amis, voisins et collègues ?",
    "hint": "Une estimation suffit."
  },
  "community": {
    "title": "Combien de membres de la communauté (paroisse, association, village) ?",
    "hint": "Une estimation suffit."
  },
  "nights": {
    "title": "Combien de nuits durera la veillée ?",
    "hint": "0 s'il n'y a pas de veillée. Nous en déduisons le matériel et la restauration."
  }
},
"budget": {
  "level": {
    "title": "Quel niveau de cérémonie envisagez-vous ?",
    "hint": "Les trois budgets estimés sont affichés sur la page Budget. Vous pourrez changer d'avis.",
    "options": {
      "sober": "Sobre",
      "intermediate": "Intermédiaire",
      "full": "Complet"
    }
  }
}
```

3. Sous `journey.dashboard`, ajouter :

```json
"summary": { "budget": "Voir le budget" }
```

Dans `apps/web/messages/en.json`, aux mêmes endroits :

```json
"attendance": {
  "title": "Attendance",
  "description": "How many people to expect, to size the wake and the meals."
},
"budget": {
  "title": "Budget",
  "description": "The level of ceremony you have in mind, among three estimated budgets."
}
```

```json
"attendance": {
  "close": {
    "title": "How many of {name}'s close family will attend?",
    "hint": "Spouse, children, parents, brothers and sisters, with their families. An estimate is enough."
  },
  "extended": {
    "title": "And how many members of the wider family?",
    "hint": "Uncles, aunts, cousins, in-laws. An estimate is enough."
  },
  "friends": {
    "title": "How many friends, neighbours and colleagues?",
    "hint": "An estimate is enough."
  },
  "community": {
    "title": "How many members of the community (parish, association, village)?",
    "hint": "An estimate is enough."
  },
  "nights": {
    "title": "How many nights will the wake last?",
    "hint": "0 if there is no wake. We use it to work out equipment and catering."
  }
},
"budget": {
  "level": {
    "title": "What level of ceremony do you have in mind?",
    "hint": "The three estimated budgets are shown on the Budget page. You can change your mind.",
    "options": {
      "sober": "Simple",
      "intermediate": "Intermediate",
      "full": "Full"
    }
  }
}
```

```json
"summary": { "budget": "See the budget" }
```

Vérifier que les titres existants des questions du lot 1 utilisent bien `{name}` de la même façon (valeurs `{ name, status }` passées par la page étape).

- [ ] **Étape 6 : relancer les tests**

Run: `pnpm --filter @testimona/web test && pnpm --filter @testimona/web typecheck && pnpm --filter @testimona/web lint`
Expected: PASS (dont la garde des textes et la parité FR/EN).

- [ ] **Étape 7 : commit**

```bash
git add apps/web/src/journey apps/web/src/modules/dossier/answers "apps/web/src/app/[locale]/(dossier)/dossier/[id]/etape/[stepId]/page.tsx" apps/web/messages/fr.json apps/web/messages/en.json
git commit -m "feat(journey): add the attendance and budget steps ending on the budget page"
```

---

### Tâche 4 : page « Budget prévisionnel »

**Files:**

- Create: `apps/web/src/modules/budget/ui/BudgetOverview.tsx`
- Create: `apps/web/src/app/[locale]/(dossier)/dossier/[id]/budget/page.tsx`
- Modify: `apps/web/messages/fr.json`, `apps/web/messages/en.json` (nouvel espace `budget`)
- Create: `apps/web/src/modules/budget/messages.test.ts`
- Modify: `apps/web/e2e/smoke.spec.ts`

- [ ] **Étape 1 : écrire la garde des textes (elle échoue)**

`apps/web/src/modules/budget/messages.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import en from '../../../messages/en.json';
import fr from '../../../messages/fr.json';
import { LEVELS } from '@/journey/options';
import { BUDGET_GRID } from './grid';

const get = (messages: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      messages,
    );

const isFilled = (value: unknown): boolean => typeof value === 'string' && value.trim() !== '';

/** Textes lus par la page Budget. */
const PATHS = [
  ...BUDGET_GRID.map((item) => `budget.grid.${item.key}`),
  ...LEVELS.map((level) => `budget.level.${level}`),
  ...[
    'title',
    'intro',
    'estimateNote',
    'attendanceTitle',
    'attendanceRange',
    'noAttendance',
    'answerAttendance',
    'editAttendance',
    'scenariosTitle',
    'total',
    'line',
    'chosen',
    'chooseLevel',
    'changeLevel',
    'backToDossier',
  ].map((key) => `budget.page.${key}`),
];

function leafPaths(node: unknown, prefix = ''): string[] {
  if (node && typeof node === 'object') {
    return Object.entries(node).flatMap(([k, v]) => leafPaths(v, prefix ? `${prefix}.${k}` : k));
  }
  return [prefix];
}

describe.each([
  ['fr', fr],
  ['en', en],
])('textes du budget (%s)', (_locale, messages) => {
  it('couvrent chaque poste, chaque niveau et chaque texte de la page', () => {
    expect(PATHS.filter((path) => !isFilled(get(messages, path)))).toEqual([]);
  });
});

describe('parité FR/EN du budget', () => {
  it("l'espace budget a les mêmes clés dans les deux langues", () => {
    const keys = (messages: unknown) => leafPaths(get(messages, 'budget')).sort();
    expect(keys(en)).toEqual(keys(fr));
  });
});
```

Run: `pnpm --filter @testimona/web test -- src/modules/budget/messages.test.ts`
Expected: FAIL (espace `budget` absent).

- [ ] **Étape 2 : textes**

Dans `apps/web/messages/fr.json`, ajouter l'espace de premier niveau `budget` (à côté de `journey`) :

```json
"budget": {
  "page": {
    "title": "Budget prévisionnel",
    "intro": "Trois budgets estimés à partir de l'affluence attendue. Ils aident à décider ensemble et à lancer les cotisations.",
    "estimateNote": "Prix de référence pour Libreville : ce sont des estimations à vérifier auprès des prestataires.",
    "attendanceTitle": "Affluence attendue",
    "attendanceRange": "Entre {low} et {high} personnes, sur {nights, plural, one {# nuit} other {# nuits}} de calcul.",
    "noAttendance": "L'affluence n'est pas encore estimée : les budgets ne comptent que les postes fixes.",
    "answerAttendance": "Estimer l'affluence",
    "editAttendance": "Modifier l'affluence",
    "scenariosTitle": "Trois budgets",
    "total": "Total",
    "line": "Poste",
    "chosen": "Niveau envisagé",
    "chooseLevel": "Choisir un niveau",
    "changeLevel": "Changer de niveau",
    "backToDossier": "Retour au dossier"
  },
  "level": {
    "sober": "Sobre",
    "intermediate": "Intermédiaire",
    "full": "Complet"
  },
  "grid": {
    "mortuary": "Morgue et conservation",
    "coffin": "Cercueil et mise en bière",
    "hearse": "Corbillard et transport",
    "burial": "Inhumation et caveau",
    "service": "Cérémonie religieuse",
    "tentsChairs": "Tentes et chaises",
    "catering": "Restauration",
    "drinks": "Boissons",
    "sound": "Sonorisation et animation",
    "printing": "Faire-part, livret et affiches",
    "outfits": "Tenues et pagnes",
    "contingency": "Imprévus"
  }
}
```

Dans `apps/web/messages/en.json` :

```json
"budget": {
  "page": {
    "title": "Estimated budget",
    "intro": "Three budgets estimated from the expected attendance. They help you decide together and start the contributions.",
    "estimateNote": "Reference prices for Libreville: these are estimates to check with providers.",
    "attendanceTitle": "Expected attendance",
    "attendanceRange": "Between {low} and {high} people, over {nights, plural, one {# night} other {# nights}} of calculation.",
    "noAttendance": "Attendance is not estimated yet: the budgets only count fixed items.",
    "answerAttendance": "Estimate attendance",
    "editAttendance": "Edit attendance",
    "scenariosTitle": "Three budgets",
    "total": "Total",
    "line": "Item",
    "chosen": "Level in mind",
    "chooseLevel": "Choose a level",
    "changeLevel": "Change level",
    "backToDossier": "Back to the dossier"
  },
  "level": {
    "sober": "Simple",
    "intermediate": "Intermediate",
    "full": "Full"
  },
  "grid": {
    "mortuary": "Mortuary and preservation",
    "coffin": "Coffin and laying in",
    "hearse": "Hearse and transport",
    "burial": "Burial and vault",
    "service": "Religious ceremony",
    "tentsChairs": "Tents and chairs",
    "catering": "Catering",
    "drinks": "Drinks",
    "sound": "Sound and entertainment",
    "printing": "Notices, booklet and posters",
    "outfits": "Outfits and loincloths",
    "contingency": "Contingencies"
  }
}
```

- [ ] **Étape 3 : contenu de la page**

`apps/web/src/modules/budget/ui/BudgetOverview.tsx` :

```tsx
import { getTranslations } from 'next-intl/server';
import { buttonClasses } from '@/components/ui/Button';
import { Link } from '@/i18n/navigation';
import { LEVELS, type Level } from '@/journey/options';
import { formatXaf } from '../format';
import type { Attendance, Scenarios } from '../scenarios';

interface Props {
  dossierId: string;
  locale: string;
  attendance: Attendance;
  scenarios: Scenarios;
  chosen: Level | null;
  canAnswer: boolean;
}

/**
 * Page « Budget prévisionnel » : affluence, trois totaux et détail par poste.
 * Le niveau envisagé (étape B.2) est mis en avant ; rien n'est enregistré ici.
 */
export async function BudgetOverview(props: Props) {
  const { dossierId, locale, attendance, scenarios, chosen, canAnswer } = props;
  const t = await getTranslations('budget');
  const money = (amount: number) => formatXaf(amount, locale);
  const stepHref = (stepId: string) => `/dossier/${dossierId}/etape/${stepId}`;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="font-display text-foreground text-3xl font-bold">{t('page.title')}</h1>
        <p className="text-muted-foreground">{t('page.intro')}</p>
        <p className="text-muted-foreground text-sm">{t('page.estimateNote')}</p>
      </header>

      <section aria-labelledby="attendance-title" className="border-border rounded-2xl border p-5">
        <h2 id="attendance-title" className="text-foreground font-semibold">
          {t('page.attendanceTitle')}
        </h2>
        <p className="text-muted-foreground mt-1">
          {attendance.answered
            ? t('page.attendanceRange', {
                low: attendance.low,
                high: attendance.high,
                nights: attendance.nights,
              })
            : t('page.noAttendance')}
        </p>
        {canAnswer && (
          <Link
            href={stepHref('attendance')}
            className="text-primary mt-3 inline-block text-sm font-semibold hover:underline"
          >
            {attendance.answered ? t('page.editAttendance') : t('page.answerAttendance')}
          </Link>
        )}
      </section>

      <section aria-labelledby="scenarios-title" className="space-y-4">
        <h2 id="scenarios-title" className="text-foreground font-semibold">
          {t('page.scenariosTitle')}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {LEVELS.map((level) => (
            <li
              key={level}
              className={`rounded-2xl border p-4 ${
                chosen === level ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <p className="text-foreground font-semibold">{t(`level.${level}`)}</p>
              <p className="font-display text-foreground mt-1 text-xl font-bold">
                {money(scenarios.totals[level])}
              </p>
              {chosen === level && (
                <p className="text-primary mt-1 text-sm font-semibold">{t('page.chosen')}</p>
              )}
            </li>
          ))}
        </ul>
        {canAnswer && (
          <Link
            href={stepHref('budget')}
            className={buttonClasses({ variant: 'primary', size: 'md' })}
          >
            {chosen ? t('page.changeLevel') : t('page.chooseLevel')}
          </Link>
        )}
      </section>

      <div className="border-border overflow-x-auto rounded-2xl border">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="border-border border-b text-left">
              <th scope="col" className="px-4 py-3 font-semibold">
                {t('page.line')}
              </th>
              {LEVELS.map((level) => (
                <th key={level} scope="col" className="px-4 py-3 text-right font-semibold">
                  {t(`level.${level}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scenarios.lines.map((line) => (
              <tr key={line.key} className="border-border border-b last:border-0">
                <th scope="row" className="px-4 py-2 text-left font-normal">
                  {t(`grid.${line.key}`)}
                </th>
                {LEVELS.map((level) => (
                  <td key={level} className="px-4 py-2 text-right tabular-nums">
                    {money(line.amounts[level])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-border border-t font-semibold">
              <th scope="row" className="px-4 py-3 text-left">
                {t('page.total')}
              </th>
              {LEVELS.map((level) => (
                <td key={level} className="px-4 py-3 text-right tabular-nums">
                  {money(scenarios.totals[level])}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      <Link
        href={`/dossier/${dossierId}`}
        className="text-muted-foreground text-sm hover:underline"
      >
        ← {t('page.backToDossier')}
      </Link>
    </div>
  );
}
```

Vérifier que `buttonClasses` est bien exporté par `@/components/ui/Button` (il est utilisé par `JourneyOverview.tsx`) et que les classes `text-foreground`, `text-muted-foreground`, `border-border`, `text-primary` existent (elles sont utilisées par le tableau de bord).

- [ ] **Étape 4 : page**

`apps/web/src/app/[locale]/(dossier)/dossier/[id]/budget/page.tsx` :

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { z } from 'zod';
import { isStepOpen } from '@/journey/registry';
import { listAnswersResult } from '@/modules/dossier/answers/repo';
import { getDossier, getMyRole } from '@/modules/dossier/repo';
import { canWrite } from '@/modules/dossier/roles';
import {
  ATTENDANCE_KEYS,
  attendanceFrom,
  chosenLevel,
  LEVEL_KEY,
  NIGHTS_KEY,
  scenariosFor,
} from '@/modules/budget/scenarios';
import { BudgetOverview } from '@/modules/budget/ui/BudgetOverview';

export const metadata: Metadata = { robots: { index: false, follow: false } };

const IdSchema = z.string().uuid();

export default async function BudgetPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  if (!IdSchema.safeParse(id).success) notFound();

  const dossier = await getDossier(id);
  if (!dossier || !isStepOpen(dossier.entryPoint, 'attendance')) notFound();

  const [role, answers] = await Promise.all([
    getMyRole(id),
    listAnswersResult(id, [...ATTENDANCE_KEYS, NIGHTS_KEY, LEVEL_KEY]),
  ]);
  // WHY: sur une lecture en échec, des budgets à zéro seraient trompeurs ; error.tsx prend le relais.
  if (answers.error) throw new Error('budget answers unreadable');

  const attendance = attendanceFrom(answers.data);
  return (
    <div className="px-4 py-8 sm:px-6 lg:py-12">
      <BudgetOverview
        dossierId={id}
        locale={locale}
        attendance={attendance}
        scenarios={scenariosFor(attendance)}
        chosen={chosenLevel(answers.data)}
        canAnswer={canWrite(role)}
      />
    </div>
  );
}
```

La page hérite de la protection du groupe `(dossier)` (redirection vers `/login` sans session), comme la page brouillon.

- [ ] **Étape 5 : test e2e de fumée**

Dans `apps/web/e2e/smoke.spec.ts`, à côté du test « Draft screen requires sign-in » (même structure), ajouter :

```ts
test('Budget page requires sign-in', async ({ page }) => {
  await page.goto('/dossier/44444444-4444-4444-8444-444444444444/budget');
  await expect(page).toHaveURL(/\/login\?next=/);
});
```

(Adapter au style exact du test voisin : s'il passe par un tableau de chemins protégés, y ajouter `'/dossier/44444444-4444-4444-8444-444444444444/budget'` plutôt que créer un test.)

- [ ] **Étape 6 : vérifier**

Run: `pnpm --filter @testimona/web test && pnpm --filter @testimona/web typecheck && pnpm --filter @testimona/web lint`
puis le build : `NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder_anon_key_long_enough NEXT_PUBLIC_SITE_URL=https://example.com pnpm build`
Expected: PASS ; la route `/[locale]/dossier/[id]/budget` apparaît dans la sortie du build. `pnpm --filter @testimona/web exec playwright test --list` liste le nouveau test (il ne tourne pas localement sans Supabase).

- [ ] **Étape 7 : commit**

```bash
git add apps/web/src/modules/budget "apps/web/src/app/[locale]/(dossier)/dossier/[id]/budget/page.tsx" apps/web/messages/fr.json apps/web/messages/en.json apps/web/e2e/smoke.spec.ts
git commit -m "feat(budget): add the estimated budget page"
```

---

### Tâche 5 : vérification complète et PR

- [ ] **Étape 1 : vérification locale**

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder_anon_key_long_enough NEXT_PUBLIC_SITE_URL=https://example.com pnpm build
```

Expected : tout vert. Aucune migration : rien à appliquer en production.

- [ ] **Étape 2 : pousser et ouvrir la PR**

Avec l'accord de l'utilisateur : `git push -u origin feature/lot2-pr1-budget`, puis PR vers `main`. Description (Contexte / Changements / Tests effectués / Risques), terminée par la ligne d'attribution habituelle. Y reprendre :

- les décisions de ce plan (pas de table en PR 1, B.2 = niveau envisagé, fin d'étape sur la page Budget, marge de 25 %, au moins une nuit) ;
- que la grille de prix est une **estimation à vérifier** à corriger avant la mise en production ;
- que les dossiers « décès » existants verront deux nouvelles étapes entre l'annonce par e-mail et la biographie ;
- que la spec du lot 2 (commitée sur cette branche) fait partie de la PR.
