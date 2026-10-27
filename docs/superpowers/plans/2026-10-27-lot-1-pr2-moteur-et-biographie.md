# Lot 1 · PR 2 — Moteur de parcours et biographie : plan d'implémentation

> **Pour les agents :** sous-skill requis : superpowers:subagent-driven-development (recommandé) ou
> superpowers:executing-plans, tâche par tâche. Les étapes utilisent des cases `- [ ]`.

**Objectif :** un membre du dossier répond à la biographie (étape 1.6) une question à la fois,
peut passer une question, et voit sur le tableau de bord l'avancement et la prochaine question.

**Architecture :** un moteur déclaratif dans `apps/web/src/journey/` (types et schémas Zod par type
de question, définitions d'étapes, registre par porte, calcul d'avancement en fonctions pures, écran
question). Les réponses vivent dans `journey_answer` (PR 1) et passent par un sous-module
`apps/web/src/modules/dossier/answers/` (`repo.ts`, `service.ts`, `actions.ts`). Aucune migration.

**Stack :** Next.js 15 (App Router, actions serveur), React 19, Supabase (RLS), Zod 3.25, next-intl
3, Vitest, Playwright.

**Spec :** [`2026-10-27-lot-1-entrer-et-annoncer-design.md`](../specs/2026-10-27-lot-1-entrer-et-annoncer-design.md),
sections 2 (routes, étape 1.6) et 3 (`journey/`). Plan précédent :
[`2026-10-27-lot-1-pr1-dossier-et-membres.md`](./2026-10-27-lot-1-pr1-dossier-et-membres.md).

---

## Décisions propres à cette PR

- **Enregistrement :** la réponse est enregistrée quand on quitte la question par « Suivant » ou
  « Passer » (pas à chaque frappe). « Revenir » ne modifie rien.
- **« Passer »** enregistre `{ "skipped": true }` : la prochaine question l'ignore, le tableau de bord
  la compte « à compléter ».
- **Temps des questions :** porte « préparer » = personne vivante. Les titres sensibles au temps
  utilisent une sélection ICU `{status, select, alive {…} other {…}}`, avec
  `status = personStatus(entryPoint)`.
- **Saisies :** les six types du moteur ont leur schéma et leur composant (`shortText`, `longText`,
  `date`, `choice`, `place`, `list`) ; seuls `shortText`, `longText`, `place` et `list` servent à la
  biographie, les autres serviront à la PR 3.
- **Lecteurs (`viewer`) :** l'écran question s'affiche en lecture seule (pas de formulaire), avec une
  navigation Revenir / Suivant par liens.

## Carte des fichiers

| Fichier                                                                    | Rôle                                                        |
| -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `apps/web/src/journey/types.ts`                                            | Types `Question`, `Step`, schémas de réponse, « passée »    |
| `apps/web/src/journey/define.ts`                                           | `defineStep()` et fabriques `q.*`                           |
| `apps/web/src/journey/steps/1-6-biography.ts`                              | Étape 1.6                                                   |
| `apps/web/src/journey/registry.ts`                                         | Étapes par porte, `getStep`, `findQuestion`, `personStatus` |
| `apps/web/src/journey/progress.ts`                                         | Avancement, prochaine question, question à afficher         |
| `apps/web/src/journey/ui/values.ts`                                        | Valeurs éditables (départ, vide, nettoyage avant envoi)     |
| `apps/web/src/journey/ui/field.ts`                                         | Classe CSS et props communes des champs                     |
| `apps/web/src/journey/ui/inputs/*.tsx`                                     | Un composant de saisie par type                             |
| `apps/web/src/journey/ui/AnswerInput.tsx`                                  | Choix du composant selon le type                            |
| `apps/web/src/journey/ui/QuestionScreen.tsx`                               | Écran question (client)                                     |
| `apps/web/src/journey/ui/JourneyOverview.tsx`                              | Carte « Prochaine question » et avancement (serveur)        |
| `apps/web/src/modules/dossier/answers/repo.ts`                             | Lecture et écriture de `journey_answer`                     |
| `apps/web/src/modules/dossier/answers/service.ts`                          | `saveAnswer` (validation, erreurs typées)                   |
| `apps/web/src/modules/dossier/answers/actions.ts`                          | `saveAnswerAction`                                          |
| `apps/web/src/modules/dossier/repo.ts`                                     | + `getMyRole()`                                             |
| `apps/web/src/modules/dossier/service.ts`                                  | `fieldErrors` et `fromRepo` exportés                        |
| `apps/web/src/app/[locale]/(dossier)/dossier/[id]/etape/[stepId]/page.tsx` | Route de l'écran question                                   |
| `apps/web/src/app/[locale]/(dossier)/dossier/[id]/page.tsx`                | Tableau de bord : avancement et prochaine question          |
| `apps/web/messages/fr.json`, `apps/web/messages/en.json`                   | Espace `journey` ; `dossier.overview.journeySoon` retiré    |
| `apps/web/e2e/smoke.spec.ts`, `apps/web/e2e/journey.spec.ts`               | Redirection anonyme ; parcours avec compte de test          |

Règles du lot 0 : accès base uniquement dans les fichiers `repo.ts` (la règle ESLint interdit
`.from('…')` ailleurs) ; aucun import de `@/lib/supabase/admin` ; 300 lignes au maximum par fichier,
tests compris ; `pnpm format:check` vert.

Branche : `feature/lot1-pr2-journey-biography`, créée depuis `feature/lot1-pr1-dossier-membres`
(PR #5 pas encore fusionnée). Une fois la PR #5 fusionnée, rebaser sur `main` avant d'ouvrir la PR.

Commande de test isolée : `cd apps/web && pnpm vitest run <fichier>`.

---

### Tâche 1 : types et schémas des questions

**Fichiers :**

- Créer : `apps/web/src/journey/types.ts`, `apps/web/src/journey/define.ts`
- Test : `apps/web/src/journey/types.test.ts`, `apps/web/src/journey/define.test.ts`

- [ ] **Étape 1 : écrire les tests qui échouent**

`apps/web/src/journey/types.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { answerSchema, isSkipped, SKIPPED, type Question } from './types';

const place: Question = { kind: 'place', key: 'biography.birthPlace' };
const traits: Question = {
  kind: 'list',
  key: 'biography.traits',
  maxItems: 2,
  fields: [
    { name: 'trait', kind: 'shortText', required: true },
    { name: 'anecdote', kind: 'longText' },
  ],
};

describe('answerSchema', () => {
  it('refuse un texte court vide ou trop long, et le nettoie', () => {
    const s = answerSchema({ kind: 'shortText', key: 'biography.motto' });
    expect(s.safeParse('   ').success).toBe(false);
    expect(s.safeParse('x'.repeat(201)).success).toBe(false);
    expect(s.parse('  Toujours debout  ')).toBe('Toujours debout');
  });

  it('accepte un texte long jusqu’à 4000 caractères', () => {
    const s = answerSchema({ kind: 'longText', key: 'biography.career' });
    expect(s.safeParse('x'.repeat(4000)).success).toBe(true);
    expect(s.safeParse('x'.repeat(4001)).success).toBe(false);
  });

  it('n’accepte qu’une vraie date du calendrier au format AAAA-MM-JJ', () => {
    const s = answerSchema({ kind: 'date', key: 'death.date' });
    expect(s.safeParse('2026-02-28').success).toBe(true);
    expect(s.safeParse('2026-02-30').success).toBe(false);
    expect(s.safeParse('28/02/2026').success).toBe(false);
  });

  it('limite un choix à ses options', () => {
    const s = answerSchema({
      kind: 'choice',
      key: 'announce.tone',
      options: ['believer', 'neutral'],
    });
    expect(s.safeParse('neutral').success).toBe(true);
    expect(s.safeParse('joyful').success).toBe(false);
  });

  it('normalise un lieu et refuse les champs inconnus', () => {
    const s = answerSchema(place);
    expect(s.parse({ city: ' Libreville ', countryCode: 'ga' })).toEqual({
      city: 'Libreville',
      countryCode: 'GA',
    });
    expect(s.safeParse({ city: 'Libreville', countryCode: 'GA', extra: 1 }).success).toBe(false);
    expect(s.safeParse({ city: '', countryCode: 'GA' }).success).toBe(false);
  });

  it('valide les éléments d’une liste et leur nombre', () => {
    const s = answerSchema(traits);
    expect(s.parse([{ trait: 'Généreux', anecdote: '' }])).toEqual([{ trait: 'Généreux' }]);
    expect(s.safeParse([]).success).toBe(false);
    expect(s.safeParse([{ trait: 'a' }, { trait: 'b' }, { trait: 'c' }]).success).toBe(false);
    expect(s.safeParse([{ anecdote: 'sans trait' }]).success).toBe(false);
  });

  it('accepte une case à cocher et un choix facultatif dans une liste', () => {
    const s = answerSchema({
      kind: 'list',
      key: 'broadcast.contacts',
      maxItems: 5,
      fields: [
        { name: 'name', kind: 'shortText', required: true },
        { name: 'circle', kind: 'choice', options: ['close_family', 'other'] },
        { name: 'priority', kind: 'boolean' },
      ],
    });
    expect(s.parse([{ name: 'Marie' }])).toEqual([{ name: 'Marie', priority: false }]);
    expect(s.safeParse([{ name: 'Marie', circle: 'unknown' }]).success).toBe(false);
  });
});

describe('isSkipped', () => {
  it('reconnaît exactement la réponse « passée »', () => {
    expect(isSkipped(SKIPPED)).toBe(true);
    expect(isSkipped({ skipped: false })).toBe(false);
    expect(isSkipped({ skipped: true, extra: 1 })).toBe(false);
    expect(isSkipped('skipped')).toBe(false);
  });
});
```

`apps/web/src/journey/define.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { defineStep, q } from './define';

describe('defineStep', () => {
  it('renvoie l’étape telle quelle si ses clés sont valides', () => {
    const step = { id: 'demo', questions: [q.shortText('demo.one'), q.place('demo.two')] };
    expect(defineStep(step)).toBe(step);
  });

  it('refuse une clé au mauvais format', () => {
    expect(() => defineStep({ id: 'demo', questions: [q.shortText('Demo')] })).toThrow(/invalide/);
  });

  it('refuse une clé en double', () => {
    expect(() =>
      defineStep({ id: 'demo', questions: [q.shortText('demo.one'), q.longText('demo.one')] }),
    ).toThrow(/double/);
  });

  it('fixe 20 éléments au plus par défaut pour une liste', () => {
    const list = q.list('demo.list', [{ name: 'name', kind: 'shortText', required: true }]);
    expect(list).toMatchObject({ kind: 'list', maxItems: 20 });
  });
});
```

- [ ] **Étape 2 : lancer les tests, constater l'échec**

Run: `cd apps/web && pnpm vitest run src/journey/types.test.ts src/journey/define.test.ts`
Expected: FAIL (« Failed to load url ./types » et « ./define »).

- [ ] **Étape 3 : écrire le code**

`apps/web/src/journey/types.ts` :

```ts
import { z } from 'zod';

/** Motif des clés de réponse, identique à la contrainte SQL de `journey_answer.key`. */
export const ANSWER_KEY_PATTERN = /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/;

export const SHORT_TEXT_MAX = 200;
export const LONG_TEXT_MAX = 4000;
export const CITY_MAX = 120;

export type ListField =
  | { name: string; kind: 'shortText' | 'longText'; required?: boolean }
  | { name: string; kind: 'choice'; options: readonly string[]; required?: boolean }
  | { name: string; kind: 'boolean' };

export type ListQuestion = {
  kind: 'list';
  key: string;
  fields: readonly ListField[];
  maxItems: number;
};
export type ChoiceQuestion = { kind: 'choice'; key: string; options: readonly string[] };
export type Question =
  | { kind: 'shortText' | 'longText' | 'date' | 'place'; key: string }
  | ChoiceQuestion
  | ListQuestion;

/** Une étape du parcours : `id` sert de segment d'URL (`/etape/<id>`). */
export interface Step {
  id: string;
  questions: readonly Question[];
}

export interface PlaceValue {
  city: string;
  countryCode: string;
}
export type ListItem = Record<string, string | boolean | undefined>;

/** Réponse « passée » : la prochaine question l'ignore, le tableau de bord la garde à compléter. */
export const SKIPPED = { skipped: true } as const;
const SkippedSchema = z.object({ skipped: z.literal(true) }).strict();

export function isSkipped(value: unknown): boolean {
  return SkippedSchema.safeParse(value).success;
}

const requiredText = (max: number) => z.string().trim().min(1).max(max);
// WHY: un champ facultatif laissé vide n'est pas enregistré, plutôt que stocké en chaîne vide.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const date = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === s;
  }, 'invalid date');

const oneOf = (options: readonly string[]) =>
  z.string().refine((v) => options.includes(v), 'invalid option');

function fieldSchema(field: ListField): z.ZodTypeAny {
  switch (field.kind) {
    case 'shortText':
      return field.required ? requiredText(SHORT_TEXT_MAX) : optionalText(SHORT_TEXT_MAX);
    case 'longText':
      return field.required ? requiredText(LONG_TEXT_MAX) : optionalText(LONG_TEXT_MAX);
    case 'choice':
      return field.required ? oneOf(field.options) : oneOf(field.options).optional();
    case 'boolean':
      return z.boolean().default(false);
  }
}

/** Schéma d'une vraie réponse à la question (« passée » exclue). */
export function answerSchema(question: Question): z.ZodTypeAny {
  switch (question.kind) {
    case 'shortText':
      return requiredText(SHORT_TEXT_MAX);
    case 'longText':
      return requiredText(LONG_TEXT_MAX);
    case 'date':
      return isoDate;
    case 'choice':
      return oneOf(question.options);
    case 'place':
      return z
        .object({
          city: requiredText(CITY_MAX),
          countryCode: z
            .string()
            .transform((s) => s.trim().toUpperCase())
            .pipe(z.string().regex(/^[A-Z]{2}$/)),
        })
        .strict();
    case 'list':
      return z
        .array(
          z
            .object(Object.fromEntries(question.fields.map((f) => [f.name, fieldSchema(f)])))
            .strict(),
        )
        .min(1)
        .max(question.maxItems);
  }
}
```

`apps/web/src/journey/define.ts` :

```ts
import { ANSWER_KEY_PATTERN, type ListField, type Question, type Step } from './types';

/** Fabriques de questions, pour des définitions d'étapes lisibles. */
export const q = {
  shortText: (key: string): Question => ({ kind: 'shortText', key }),
  longText: (key: string): Question => ({ kind: 'longText', key }),
  date: (key: string): Question => ({ kind: 'date', key }),
  place: (key: string): Question => ({ kind: 'place', key }),
  choice: (key: string, options: readonly string[]): Question => ({ kind: 'choice', key, options }),
  list: (key: string, fields: readonly ListField[], maxItems = 20): Question => ({
    kind: 'list',
    key,
    fields,
    maxItems,
  }),
};

/**
 * Vérifie une étape au chargement : clés au format de la base et sans doublon.
 *
 * @example
 * export const demoStep = defineStep({ id: 'demo', questions: [q.shortText('demo.motto')] });
 */
export function defineStep(step: Step): Step {
  const seen = new Set<string>();
  for (const question of step.questions) {
    if (!ANSWER_KEY_PATTERN.test(question.key)) {
      throw new Error(`Étape ${step.id} : clé invalide « ${question.key} »`);
    }
    if (seen.has(question.key)) {
      throw new Error(`Étape ${step.id} : clé en double « ${question.key} »`);
    }
    seen.add(question.key);
  }
  return step;
}
```

- [ ] **Étape 4 : lancer les tests**

Run: `cd apps/web && pnpm vitest run src/journey/types.test.ts src/journey/define.test.ts`
Expected: PASS (12 tests).

- [ ] **Étape 5 : commit**

```bash
git add apps/web/src/journey/types.ts apps/web/src/journey/define.ts apps/web/src/journey/types.test.ts apps/web/src/journey/define.test.ts
git commit -m "feat(journey): add question types and answer schemas"
```

---

### Tâche 2 : étape 1.6 et registre

**Fichiers :**

- Créer : `apps/web/src/journey/steps/1-6-biography.ts`, `apps/web/src/journey/registry.ts`
- Test : `apps/web/src/journey/registry.test.ts`

- [ ] **Étape 1 : écrire le test qui échoue**

`apps/web/src/journey/registry.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { findQuestion, getStep, isStepOpen, personStatus, stepsFor } from './registry';

describe('registre du parcours', () => {
  it('propose la biographie aux portes décès et préparer', () => {
    expect(stepsFor('death').map((s) => s.id)).toEqual(['biography']);
    expect(stepsFor('prepare').map((s) => s.id)).toEqual(['biography']);
    expect(stepsFor('after')).toEqual([]);
    expect(isStepOpen('death', 'biography')).toBe(true);
    expect(isStepOpen('after', 'biography')).toBe(false);
  });

  it('pose les six questions de la biographie dans l’ordre de la spec', () => {
    expect(getStep('biography')?.questions.map((q) => q.key)).toEqual([
      'biography.birthPlace',
      'biography.parents',
      'biography.career',
      'biography.traits',
      'biography.passions',
      'biography.motto',
    ]);
  });

  it('retrouve une question par sa clé', () => {
    const found = findQuestion('biography.traits');
    expect(found?.step.id).toBe('biography');
    expect(found?.index).toBe(3);
    expect(found?.question.kind).toBe('list');
  });

  it('ignore une clé ou une étape inconnue', () => {
    expect(findQuestion('biography.unknown')).toBeUndefined();
    expect(findQuestion('creator.relationship')).toBeUndefined();
    expect(getStep('nope')).toBeUndefined();
  });

  it('considère la personne vivante seulement pour la porte préparer', () => {
    expect(personStatus('prepare')).toBe('alive');
    expect(personStatus('death')).toBe('deceased');
    expect(personStatus('after')).toBe('deceased');
  });
});
```

- [ ] **Étape 2 : lancer le test, constater l'échec**

Run: `cd apps/web && pnpm vitest run src/journey/registry.test.ts`
Expected: FAIL (« Failed to load url ./registry »).

- [ ] **Étape 3 : écrire le code**

`apps/web/src/journey/steps/1-6-biography.ts` :

```ts
import { defineStep, q } from '../define';

/** Étape 1.6 : la biographie, que l'on peut remplir « à sa place ». */
export const biographyStep = defineStep({
  id: 'biography',
  questions: [
    q.place('biography.birthPlace'),
    q.longText('biography.parents'),
    q.longText('biography.career'),
    q.list(
      'biography.traits',
      [
        { name: 'trait', kind: 'shortText', required: true },
        { name: 'anecdote', kind: 'longText' },
      ],
      10,
    ),
    q.longText('biography.passions'),
    q.shortText('biography.motto'),
  ],
});
```

`apps/web/src/journey/registry.ts` :

```ts
import type { EntryPoint } from '@/modules/dossier/schema';
import { biographyStep } from './steps/1-6-biography';
import type { Question, Step } from './types';

const ALL_STEPS: readonly Step[] = [biographyStep];

/** Étapes proposées, dans l'ordre, selon la porte d'entrée du dossier. */
const STEPS_BY_ENTRY: Record<EntryPoint, readonly Step[]> = {
  death: [biographyStep],
  prepare: [biographyStep],
  after: [],
};

export interface FoundQuestion {
  step: Step;
  question: Question;
  index: number;
}

export function stepsFor(entryPoint: EntryPoint): readonly Step[] {
  return STEPS_BY_ENTRY[entryPoint];
}

export function getStep(id: string): Step | undefined {
  return ALL_STEPS.find((step) => step.id === id);
}

export function isStepOpen(entryPoint: EntryPoint, stepId: string): boolean {
  return stepsFor(entryPoint).some((step) => step.id === stepId);
}

/** Question du registre portant cette clé, avec son étape et sa position. */
export function findQuestion(key: string): FoundQuestion | undefined {
  for (const step of ALL_STEPS) {
    const index = step.questions.findIndex((question) => question.key === key);
    const question = step.questions[index];
    if (question) return { step, question, index };
  }
  return undefined;
}

/**
 * Temps des questions : porte « préparer » = personne vivante.
 * WHY: les textes utilisent `{status, select, alive {…} other {…}}` pour passer au présent.
 */
export function personStatus(entryPoint: EntryPoint): 'alive' | 'deceased' {
  return entryPoint === 'prepare' ? 'alive' : 'deceased';
}
```

- [ ] **Étape 4 : lancer le test**

Run: `cd apps/web && pnpm vitest run src/journey/registry.test.ts`
Expected: PASS (5 tests).

- [ ] **Étape 5 : commit**

```bash
git add apps/web/src/journey/steps/1-6-biography.ts apps/web/src/journey/registry.ts apps/web/src/journey/registry.test.ts
git commit -m "feat(journey): add the biography step and the step registry"
```

---

### Tâche 3 : avancement

**Fichiers :**

- Créer : `apps/web/src/journey/progress.ts`
- Test : `apps/web/src/journey/progress.test.ts`

- [ ] **Étape 1 : écrire le test qui échoue**

`apps/web/src/journey/progress.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { defineStep, q } from './define';
import { nextQuestion, resolveQuestionIndex, stepProgress } from './progress';
import { SKIPPED } from './types';

const first = defineStep({
  id: 'first',
  questions: [q.shortText('first.a'), q.shortText('first.b'), q.shortText('first.c')],
});
const second = defineStep({ id: 'second', questions: [q.shortText('second.a')] });

describe('stepProgress', () => {
  it('compte les réponses et les questions passées séparément', () => {
    expect(stepProgress(first, { 'first.a': 'oui', 'first.b': SKIPPED })).toEqual({
      stepId: 'first',
      total: 3,
      answered: 1,
      skipped: 1,
    });
  });

  it('ignore les réponses d’autres étapes', () => {
    expect(stepProgress(first, { 'second.a': 'x' })).toMatchObject({ answered: 0, skipped: 0 });
  });
});

describe('nextQuestion', () => {
  it('renvoie la première question sans réponse, les passées comptant comme traitées', () => {
    expect(nextQuestion([first, second], { 'first.a': 'x', 'first.b': SKIPPED })).toEqual({
      stepId: 'first',
      index: 2,
    });
  });

  it('passe à l’étape suivante quand la première est traitée', () => {
    const answers = { 'first.a': 'x', 'first.b': 'y', 'first.c': SKIPPED };
    expect(nextQuestion([first, second], answers)).toEqual({ stepId: 'second', index: 0 });
  });

  it('renvoie null quand tout est répondu ou passé', () => {
    const answers = { 'first.a': 'x', 'first.b': 'y', 'first.c': 'z', 'second.a': SKIPPED };
    expect(nextQuestion([first, second], answers)).toBeNull();
  });
});

describe('resolveQuestionIndex', () => {
  it('suit ?q= quand il désigne une question de l’étape', () => {
    expect(resolveQuestionIndex(first, {}, '2')).toBe(2);
    expect(resolveQuestionIndex(first, {}, ['1', '2'])).toBe(1);
  });

  it('ouvre sinon la première question sans réponse', () => {
    expect(resolveQuestionIndex(first, { 'first.a': 'x' }, undefined)).toBe(1);
    expect(resolveQuestionIndex(first, { 'first.a': 'x' }, '9')).toBe(1);
    expect(resolveQuestionIndex(first, { 'first.a': 'x' }, '-1')).toBe(1);
  });

  it('revient à la première question quand tout est traité', () => {
    const answers = { 'first.a': 'x', 'first.b': SKIPPED, 'first.c': 'z' };
    expect(resolveQuestionIndex(first, answers, undefined)).toBe(0);
  });
});
```

- [ ] **Étape 2 : lancer le test, constater l'échec**

Run: `cd apps/web && pnpm vitest run src/journey/progress.test.ts`
Expected: FAIL (« Failed to load url ./progress »).

- [ ] **Étape 3 : écrire le code**

`apps/web/src/journey/progress.ts` :

```ts
import { isSkipped, type Step } from './types';

/** Réponses du dossier, indexées par clé (valeur JSON telle qu'enregistrée). */
export type Answers = Readonly<Record<string, unknown>>;

export interface StepProgress {
  stepId: string;
  total: number;
  answered: number;
  skipped: number;
}

export interface QuestionRef {
  stepId: string;
  index: number;
}

const has = (answers: Answers, key: string) => Object.prototype.hasOwnProperty.call(answers, key);

export function stepProgress(step: Step, answers: Answers): StepProgress {
  let answered = 0;
  let skipped = 0;
  for (const { key } of step.questions) {
    if (!has(answers, key)) continue;
    if (isSkipped(answers[key])) skipped += 1;
    else answered += 1;
  }
  return { stepId: step.id, total: step.questions.length, answered, skipped };
}

/** Prochaine question à poser : la première qui n'est ni répondue ni passée. */
export function nextQuestion(steps: readonly Step[], answers: Answers): QuestionRef | null {
  for (const step of steps) {
    const index = step.questions.findIndex(({ key }) => !has(answers, key));
    if (index >= 0) return { stepId: step.id, index };
  }
  return null;
}

/** Question à afficher : `?q=` s'il est valide, sinon la première sans réponse, sinon la première. */
export function resolveQuestionIndex(
  step: Step,
  answers: Answers,
  q: string | string[] | undefined,
): number {
  const raw = Array.isArray(q) ? q[0] : q;
  if (raw !== undefined && /^\d+$/.test(raw) && Number(raw) < step.questions.length) {
    return Number(raw);
  }
  const open = step.questions.findIndex(({ key }) => !has(answers, key));
  return open >= 0 ? open : 0;
}
```

- [ ] **Étape 4 : lancer le test**

Run: `cd apps/web && pnpm vitest run src/journey/progress.test.ts`
Expected: PASS (8 tests).

- [ ] **Étape 5 : commit**

```bash
git add apps/web/src/journey/progress.ts apps/web/src/journey/progress.test.ts
git commit -m "feat(journey): compute step progress and the next question"
```

---

### Tâche 4 : accès base des réponses

**Fichiers :**

- Créer : `apps/web/src/modules/dossier/answers/repo.ts`
- Modifier : `apps/web/src/modules/dossier/repo.ts` (ajout de `getMyRole`)

Ces fonctions ne contiennent que des requêtes : la RLS est couverte par les tests SQL de la PR 1
(`supabase/tests/dossier-person-answers.test.ts`), l'usage par les tests du service (tâche 5).

- [ ] **Étape 1 : écrire `answers/repo.ts`**

```ts
import 'server-only';
import { getSupabaseServer } from '@/lib/supabase/server';
import type { RepoResult } from '../repo';

/**
 * Réponses du parcours d'un dossier, indexées par clé (toutes, ou seulement `keys`).
 * Une erreur de lecture est journalisée (code seulement) et donne un objet vide.
 */
export async function listAnswers(
  dossierId: string,
  keys?: readonly string[],
): Promise<Record<string, unknown>> {
  const db = await getSupabaseServer();
  let query = db.from('journey_answer').select('key, value').eq('dossier_id', dossierId);
  if (keys) query = query.in('key', [...keys]);
  const { data, error } = await query.returns<{ key: string; value: unknown }[]>();
  if (error) console.error('[dossier/answers] listAnswers impossible', { code: error.code });
  return Object.fromEntries((data ?? []).map((row) => [row.key, row.value]));
}

/** Crée ou remplace une réponse ; la RLS exige le rôle contributor ou plus. */
export async function upsertAnswer(args: {
  dossierId: string;
  key: string;
  value: unknown;
}): Promise<RepoResult<true>> {
  const db = await getSupabaseServer();
  const { error } = await db
    .from('journey_answer')
    .upsert(
      { dossier_id: args.dossierId, key: args.key, value: args.value },
      { onConflict: 'dossier_id,key' },
    );
  if (error) {
    return {
      data: null,
      error: { code: error.code || 'unknown', message: error.message || 'upsert failed' },
    };
  }
  return { data: true, error: null };
}
```

- [ ] **Étape 2 : ajouter `getMyRole` à `modules/dossier/repo.ts`**

Ajouter après `listMembers` :

```ts
/** Rôle de l'utilisateur courant dans le dossier, ou null s'il n'en est pas membre. */
export async function getMyRole(dossierId: string): Promise<DossierRole | null> {
  const db = await getSupabaseServer();
  const { data: auth } = await db.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await db
    .from('dossier_member')
    .select('role')
    .eq('dossier_id', dossierId)
    .eq('user_id', auth.user.id)
    .maybeSingle<{ role: DossierRole }>();
  logRead('getMyRole', error);
  return data?.role ?? null;
}
```

- [ ] **Étape 3 : vérifier types et lint**

Run: `pnpm --filter @testimona/web typecheck && pnpm --filter @testimona/web lint`
Expected: 0 erreur ; `modules/dossier/repo.ts` reste sous 300 lignes (environ 260).

- [ ] **Étape 4 : commit**

```bash
git add apps/web/src/modules/dossier/answers/repo.ts apps/web/src/modules/dossier/repo.ts
git commit -m "feat(dossier): read and write journey answers"
```

---

### Tâche 5 : service `saveAnswer`

**Fichiers :**

- Créer : `apps/web/src/modules/dossier/answers/service.ts`
- Modifier : `apps/web/src/modules/dossier/service.ts` (exporter `fieldErrors` et `fromRepo`)
- Test : `apps/web/src/modules/dossier/answers/service.test.ts`

- [ ] **Étape 1 : écrire le test qui échoue**

`apps/web/src/modules/dossier/answers/service.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

// WHY: vi.mock est remonté en tête de fichier ; les doublures sont créées avec vi.hoisted.
const { answersRepo, dossierRepo } = vi.hoisted(() => ({
  answersRepo: { upsertAnswer: vi.fn() },
  dossierRepo: { getDossier: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('./repo', () => answersRepo);
vi.mock('../repo', () => dossierRepo);
vi.mock('@/lib/email/resend', () => ({ sendEmail: vi.fn(), dossierInviteEmail: vi.fn() }));

const { saveAnswer } = await import('./service');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const dossier = (entryPoint: 'death' | 'prepare' | 'after') => ({
  id: DOSSIER,
  title: 'Jean Ndong',
  city: 'Libreville',
  countryCode: 'GA',
  entryPoint,
  createdAt: '2026-10-27T00:00:00Z',
});

beforeEach(() => {
  vi.clearAllMocks();
  dossierRepo.getDossier.mockResolvedValue(dossier('death'));
  answersRepo.upsertAnswer.mockResolvedValue({ data: true, error: null });
});

describe('saveAnswer', () => {
  it('refuse une clé absente du registre sans toucher la base', async () => {
    const res = await saveAnswer({ dossierId: DOSSIER, key: 'creator.relationship', value: 'x' });
    expect(res).toEqual({ ok: false, error: 'validation' });
    expect(answersRepo.upsertAnswer).not.toHaveBeenCalled();
  });

  it('refuse un identifiant de dossier invalide', async () => {
    const res = await saveAnswer({ dossierId: 'abc', key: 'biography.motto', value: 'x' });
    expect(res).toEqual({ ok: false, error: 'validation' });
  });

  it('renvoie les erreurs de champ d’une réponse invalide', async () => {
    const res = await saveAnswer({
      dossierId: DOSSIER,
      key: 'biography.birthPlace',
      value: { city: '', countryCode: 'GA' },
    });
    expect(res).toMatchObject({ ok: false, error: 'validation' });
    expect(res.ok === false && res.fieldErrors?.city).toBeTruthy();
    expect(answersRepo.upsertAnswer).not.toHaveBeenCalled();
  });

  it('enregistre la réponse nettoyée', async () => {
    const res = await saveAnswer({
      dossierId: DOSSIER,
      key: 'biography.birthPlace',
      value: { city: ' Lambaréné ', countryCode: 'ga' },
    });
    expect(res).toEqual({ ok: true, data: { key: 'biography.birthPlace' } });
    expect(answersRepo.upsertAnswer).toHaveBeenCalledWith({
      dossierId: DOSSIER,
      key: 'biography.birthPlace',
      value: { city: 'Lambaréné', countryCode: 'GA' },
    });
  });

  it('enregistre « passée »', async () => {
    await saveAnswer({ dossierId: DOSSIER, key: 'biography.motto', value: { skipped: true } });
    expect(answersRepo.upsertAnswer).toHaveBeenCalledWith({
      dossierId: DOSSIER,
      key: 'biography.motto',
      value: { skipped: true },
    });
  });

  it('renvoie « not_found » si le dossier est inaccessible', async () => {
    dossierRepo.getDossier.mockResolvedValue(null);
    const res = await saveAnswer({ dossierId: DOSSIER, key: 'biography.motto', value: 'x' });
    expect(res).toEqual({ ok: false, error: 'not_found' });
    expect(answersRepo.upsertAnswer).not.toHaveBeenCalled();
  });

  it('refuse une étape fermée pour la porte du dossier', async () => {
    dossierRepo.getDossier.mockResolvedValue(dossier('after'));
    const res = await saveAnswer({ dossierId: DOSSIER, key: 'biography.motto', value: 'x' });
    expect(res).toEqual({ ok: false, error: 'validation' });
  });

  it('traduit le refus RLS d’un lecteur en « forbidden »', async () => {
    answersRepo.upsertAnswer.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'x' },
    });
    const res = await saveAnswer({ dossierId: DOSSIER, key: 'biography.motto', value: 'x' });
    expect(res).toEqual({ ok: false, error: 'forbidden' });
  });
});
```

- [ ] **Étape 2 : lancer le test, constater l'échec**

Run: `cd apps/web && pnpm vitest run src/modules/dossier/answers/service.test.ts`
Expected: FAIL (« Failed to load url ./service »).

- [ ] **Étape 3 : exporter les aides de `modules/dossier/service.ts`**

Dans `apps/web/src/modules/dossier/service.ts`, remplacer `function fromRepo(` par
`export function fromRepo(` et `function fieldErrors(` par `export function fieldErrors(`. Rien
d'autre ne change.

- [ ] **Étape 4 : écrire `answers/service.ts`**

```ts
import 'server-only';
import { z } from 'zod';
import { findQuestion, isStepOpen } from '@/journey/registry';
import { answerSchema, isSkipped, SKIPPED } from '@/journey/types';
import { getDossier } from '../repo';
import { fieldErrors, fromRepo, type Result } from '../service';
import * as repo from './repo';

const SaveAnswerInputSchema = z.object({
  dossierId: z.string().uuid(),
  key: z.string().max(100),
  value: z.unknown(),
});

/**
 * Enregistre une réponse du parcours, ou « passée ».
 * Refuse une clé absente du registre, une étape fermée pour la porte du dossier et une valeur qui
 * ne passe pas le schéma de sa question. Le rôle (contributor ou plus) est vérifié par la RLS.
 *
 * @example
 * await saveAnswer({ dossierId, key: 'biography.motto', value: 'Toujours debout' });
 */
export async function saveAnswer(raw: unknown): Promise<Result<{ key: string }>> {
  const input = SaveAnswerInputSchema.safeParse(raw);
  if (!input.success) return { ok: false, error: 'validation' };
  const { dossierId, key } = input.data;
  const found = findQuestion(key);
  if (!found) return { ok: false, error: 'validation' };

  let value: unknown = SKIPPED;
  if (!isSkipped(input.data.value)) {
    const parsed = answerSchema(found.question).safeParse(input.data.value);
    if (!parsed.success) {
      return { ok: false, error: 'validation', fieldErrors: fieldErrors(parsed.error.issues) };
    }
    value = parsed.data;
  }

  const dossier = await getDossier(dossierId);
  if (!dossier) return { ok: false, error: 'not_found' };
  if (!isStepOpen(dossier.entryPoint, found.step.id)) return { ok: false, error: 'validation' };

  const res = await repo.upsertAnswer({ dossierId, key, value });
  if (res.error) return fromRepo(res.error, 'saveAnswer');
  return { ok: true, data: { key } };
}
```

- [ ] **Étape 5 : lancer les tests du module**

Run: `cd apps/web && pnpm vitest run src/modules/dossier`
Expected: PASS (les tests existants du service et les 8 nouveaux).

- [ ] **Étape 6 : commit**

```bash
git add apps/web/src/modules/dossier/service.ts apps/web/src/modules/dossier/answers/service.ts apps/web/src/modules/dossier/answers/service.test.ts
git commit -m "feat(dossier): validate and save journey answers"
```

---

### Tâche 6 : action serveur

**Fichiers :**

- Créer : `apps/web/src/modules/dossier/answers/actions.ts`

- [ ] **Étape 1 : écrire l'action**

```ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { findQuestion } from '@/journey/registry';
import { SKIPPED } from '@/journey/types';
import { localizedPath } from '@/lib/auth/redirect-target';
import { getCurrentUser } from '@/lib/supabase/server';
import type { DossierError } from '../service';
import { saveAnswer } from './service';

export interface AnswerState {
  error?: DossierError;
  fieldErrors?: Record<string, string>;
}

const field = (formData: FormData, name: string) => String(formData.get(name) ?? '');

/**
 * Enregistre la réponse (ou « passée » si `intent=skip`) puis passe à la question suivante de
 * l'étape, ou revient au tableau de bord après la dernière.
 */
export async function saveAnswerAction(
  _prev: AnswerState | null,
  formData: FormData,
): Promise<AnswerState> {
  if (!(await getCurrentUser())) return { error: 'unauthenticated' };
  const dossierId = field(formData, 'dossierId');
  const key = field(formData, 'key');

  let value: unknown = SKIPPED;
  if (field(formData, 'intent') !== 'skip') {
    try {
      value = JSON.parse(field(formData, 'value'));
    } catch {
      return { error: 'validation' };
    }
  }

  const res = await saveAnswer({ dossierId, key, value });
  if (!res.ok) return { error: res.error, fieldErrors: res.fieldErrors };

  const found = findQuestion(key);
  const locale = await getLocale();
  revalidatePath(localizedPath(`/dossier/${dossierId}`, locale));
  const nextIndex = (found?.index ?? 0) + 1;
  const target =
    found && nextIndex < found.step.questions.length
      ? `/dossier/${dossierId}/etape/${found.step.id}?q=${nextIndex}`
      : `/dossier/${dossierId}`;
  redirect(localizedPath(target, locale));
}
```

- [ ] **Étape 2 : vérifier types et lint**

Run: `pnpm --filter @testimona/web typecheck && pnpm --filter @testimona/web lint`
Expected: 0 erreur.

- [ ] **Étape 3 : commit**

```bash
git add apps/web/src/modules/dossier/answers/actions.ts
git commit -m "feat(dossier): add the save answer action"
```

---

### Tâche 7 : textes FR/EN

**Fichiers :**

- Modifier : `apps/web/messages/fr.json`, `apps/web/messages/en.json`

- [ ] **Étape 1 : ajouter l'espace `journey` (FR)**

Ajouter au premier niveau de `apps/web/messages/fr.json`, après `dossier` :

```json
"journey": {
  "steps": {
    "biography": {
      "title": "Sa biographie",
      "description": "Racontez sa vie, une question à la fois. Vous pouvez répondre à sa place, et passer une question pour y revenir plus tard."
    }
  },
  "q": {
    "biography": {
      "birthPlace": {
        "title": "Dans quelle ville {name} a-t-il ou elle vu le jour ?",
        "hint": "La ville et le pays de naissance."
      },
      "parents": {
        "title": "Parlez-nous des parents de {name}.",
        "hint": "Leurs noms, leur village ou leur région d'origine, ce que vous savez de la famille."
      },
      "career": {
        "title": "{status, select, alive {Quel est le parcours professionnel de {name} ?} other {Quel a été le parcours professionnel de {name} ?}}",
        "hint": "Ses métiers, les lieux où {name} a travaillé, ses fiertés."
      },
      "traits": {
        "title": "Quels traits de caractère décrivent le mieux {name} ?",
        "hint": "Un trait par élément, avec une anecdote si un souvenir vous vient."
      },
      "passions": {
        "title": "{status, select, alive {Qu'est-ce qui passionne {name} ?} other {Qu'est-ce qui passionnait {name} ?}}",
        "hint": "Musique, sport, cuisine, foi, jardin, voyages…"
      },
      "motto": {
        "title": "Une phrase ou une devise que l'on associe à {name} ?",
        "hint": "Quelques mots que ses proches reconnaîtront."
      }
    }
  },
  "fields": {
    "trait": "Trait de caractère",
    "anecdote": "Anecdote (facultatif)",
    "city": "Ville",
    "country": "Pays"
  },
  "ui": {
    "progress": "Question {current} sur {total}",
    "back": "Revenir",
    "backToDossier": "Retour au dossier",
    "skip": "Passer",
    "next": "Suivant",
    "finish": "Terminer",
    "required": "Répondez, ou choisissez « Passer » pour y revenir plus tard.",
    "readOnly": "Vous pouvez lire les réponses ; seuls les contributeurs peuvent les modifier.",
    "addItem": "Ajouter",
    "removeItem": "Retirer",
    "item": "Élément {n}",
    "chooseOption": "Choisir…"
  },
  "dashboard": {
    "nextTitle": "Prochaine question",
    "answer": "Répondre",
    "allDone": "Toutes les questions ont une réponse ou ont été passées.",
    "stepProgress": "{answered} sur {total} réponses",
    "toComplete": "{count, plural, =1 {1 question à compléter} other {# questions à compléter}}"
  }
}
```

Retirer `dossier.overview.journeySoon` (remplacé par l'avancement réel).

- [ ] **Étape 2 : ajouter l'espace `journey` (EN)**

Même structure dans `apps/web/messages/en.json` :

```json
"journey": {
  "steps": {
    "biography": {
      "title": "Their life story",
      "description": "Tell their story, one question at a time. You can answer on their behalf, and skip a question to come back to it later."
    }
  },
  "q": {
    "biography": {
      "birthPlace": {
        "title": "In which town was {name} born?",
        "hint": "The town and country of birth."
      },
      "parents": {
        "title": "Tell us about {name}'s parents.",
        "hint": "Their names, their home village or region, what you know about the family."
      },
      "career": {
        "title": "{status, select, alive {What is {name}'s working life?} other {What was {name}'s working life?}}",
        "hint": "Their jobs, the places where {name} worked, what made them proud."
      },
      "traits": {
        "title": "Which character traits describe {name} best?",
        "hint": "One trait per item, with an anecdote if a memory comes to mind."
      },
      "passions": {
        "title": "{status, select, alive {What is {name} passionate about?} other {What was {name} passionate about?}}",
        "hint": "Music, sport, cooking, faith, gardening, travel…"
      },
      "motto": {
        "title": "A phrase or motto people associate with {name}?",
        "hint": "A few words their loved ones will recognise."
      }
    }
  },
  "fields": {
    "trait": "Character trait",
    "anecdote": "Anecdote (optional)",
    "city": "Town",
    "country": "Country"
  },
  "ui": {
    "progress": "Question {current} of {total}",
    "back": "Back",
    "backToDossier": "Back to the family space",
    "skip": "Skip",
    "next": "Next",
    "finish": "Finish",
    "required": "Answer, or choose “Skip” to come back to it later.",
    "readOnly": "You can read the answers; only contributors can change them.",
    "addItem": "Add",
    "removeItem": "Remove",
    "item": "Item {n}",
    "chooseOption": "Choose…"
  },
  "dashboard": {
    "nextTitle": "Next question",
    "answer": "Answer",
    "allDone": "Every question has been answered or skipped.",
    "stepProgress": "{answered} of {total} answered",
    "toComplete": "{count, plural, =1 {1 question to complete} other {# questions to complete}}"
  }
}
```

Retirer aussi `dossier.overview.journeySoon` côté EN.

- [ ] **Étape 3 : vérifier la parité des clés et le format**

Run :

```bash
node -e "const f=require('./apps/web/messages/fr.json'),e=require('./apps/web/messages/en.json');const k=(o,p='')=>Object.entries(o).flatMap(([n,v])=>typeof v==='object'?k(v,p+n+'.'):[p+n]);const a=k(f).sort().join('\n'),b=k(e).sort().join('\n');console.log(a===b?'identiques':'DIFFÉRENTES')"
pnpm format:check
```

Expected: `identiques`, puis format vert. La page du dossier lit encore `overview.journeySoon`
jusqu'à la tâche 10 ; next-intl affiche alors la clé brute sans planter, et la tâche 10 la retire.

- [ ] **Étape 4 : commit**

```bash
git add apps/web/messages/fr.json apps/web/messages/en.json
git commit -m "feat(i18n): add journey and biography texts"
```

---

### Tâche 8 : composants de saisie et écran question

**Fichiers :**

- Créer : `apps/web/src/journey/ui/values.ts`, `apps/web/src/journey/ui/field.ts`,
  `apps/web/src/journey/ui/inputs/ShortTextInput.tsx`, `LongTextInput.tsx`, `DateInput.tsx`,
  `ChoiceInput.tsx`, `PlaceInput.tsx`, `ListInput.tsx`, `apps/web/src/journey/ui/AnswerInput.tsx`,
  `apps/web/src/journey/ui/QuestionScreen.tsx`
- Test : `apps/web/src/journey/ui/values.test.ts`

- [ ] **Étape 1 : écrire le test qui échoue**

`apps/web/src/journey/ui/values.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { SKIPPED, type ListQuestion, type Question } from '../types';
import { compact, isBlank, toEditable } from './values';

const traits: ListQuestion = {
  kind: 'list',
  key: 'biography.traits',
  maxItems: 10,
  fields: [
    { name: 'trait', kind: 'shortText', required: true },
    { name: 'anecdote', kind: 'longText' },
    { name: 'priority', kind: 'boolean' },
  ],
};
const place: Question = { kind: 'place', key: 'biography.birthPlace' };

describe('toEditable', () => {
  it('reprend la réponse enregistrée', () => {
    expect(toEditable({ kind: 'shortText', key: 'a.b' }, 'Debout', 'GA')).toBe('Debout');
    expect(toEditable(place, { city: 'Oyem', countryCode: 'GA' }, 'CM')).toEqual({
      city: 'Oyem',
      countryCode: 'GA',
    });
  });

  it('part d’un champ vide pour une question passée ou sans réponse', () => {
    expect(toEditable({ kind: 'longText', key: 'a.b' }, SKIPPED, 'GA')).toBe('');
    expect(toEditable(place, undefined, 'GA')).toEqual({ city: '', countryCode: 'GA' });
    expect(toEditable(traits, SKIPPED, 'GA')).toEqual([
      { trait: '', anecdote: '', priority: false },
    ]);
  });
});

describe('isBlank et compact', () => {
  it('considère vide un texte d’espaces, un lieu sans ville, une liste sans saisie', () => {
    expect(isBlank('   ')).toBe(true);
    expect(isBlank({ city: ' ', countryCode: 'GA' })).toBe(true);
    expect(isBlank([{ trait: '', anecdote: ' ', priority: true }])).toBe(true);
    expect(isBlank([{ trait: 'Drôle', anecdote: '' }])).toBe(false);
  });

  it('retire les éléments vides d’une liste avant l’envoi', () => {
    expect(compact([{ trait: 'Drôle' }, { trait: '', anecdote: '' }])).toEqual([
      { trait: 'Drôle' },
    ]);
    expect(compact('texte')).toBe('texte');
  });
});
```

- [ ] **Étape 2 : lancer le test, constater l'échec**

Run: `cd apps/web && pnpm vitest run src/journey/ui/values.test.ts`
Expected: FAIL (« Failed to load url ./values »).

- [ ] **Étape 3 : écrire `values.ts` et `field.ts`**

`apps/web/src/journey/ui/values.ts` :

```ts
import {
  isSkipped,
  type ListItem,
  type ListQuestion,
  type PlaceValue,
  type Question,
} from '../types';

/** Valeur manipulée par un champ de saisie, avant validation par le serveur. */
export type EditableValue = string | PlaceValue | ListItem[];

const isPlace = (v: unknown): v is PlaceValue =>
  typeof v === 'object' && v !== null && 'city' in v && 'countryCode' in v;

export function emptyItem(question: ListQuestion): ListItem {
  return Object.fromEntries(
    question.fields.map((field) => [field.name, field.kind === 'boolean' ? false : '']),
  );
}

/** Valeur de départ : la réponse enregistrée, sinon un champ vide (aussi pour « passée »). */
export function toEditable(
  question: Question,
  stored: unknown,
  defaultCountry: string,
): EditableValue {
  const known = stored !== undefined && !isSkipped(stored);
  switch (question.kind) {
    case 'place':
      return known && isPlace(stored) ? stored : { city: '', countryCode: defaultCountry };
    case 'list':
      return known && Array.isArray(stored) ? (stored as ListItem[]) : [emptyItem(question)];
    default:
      return known && typeof stored === 'string' ? stored : '';
  }
}

const itemIsBlank = (item: ListItem) =>
  Object.values(item).every((v) => typeof v !== 'string' || v.trim() === '');

/** Vrai si rien n'a été saisi : « Suivant » demande alors une réponse ou « Passer ». */
export function isBlank(value: EditableValue): boolean {
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.every(itemIsBlank);
  return value.city.trim() === '';
}

/** Valeur envoyée au serveur : les éléments de liste laissés vides sont retirés. */
export function compact(value: EditableValue): EditableValue {
  return Array.isArray(value) ? value.filter((item) => !itemIsBlank(item)) : value;
}
```

`apps/web/src/journey/ui/field.ts` :

```ts
export const FIELD_CLASS =
  'w-full rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-white placeholder:text-white/50 aria-[invalid=true]:border-accent-soft read-only:opacity-80';

/** Props communes des champs : le titre de la question sert de nom accessible. */
export interface FieldProps<T> {
  id: string;
  value: T;
  onChange: (value: T) => void;
  readOnly: boolean;
  invalid: boolean;
  labelledBy: string;
  describedBy: string | undefined;
}
```

- [ ] **Étape 4 : lancer le test**

Run: `cd apps/web && pnpm vitest run src/journey/ui/values.test.ts`
Expected: PASS (4 tests).

- [ ] **Étape 5 : écrire les composants de saisie**

`apps/web/src/journey/ui/inputs/ShortTextInput.tsx` :

```tsx
import { SHORT_TEXT_MAX } from '../../types';
import { FIELD_CLASS, type FieldProps } from '../field';

export function ShortTextInput(props: FieldProps<string>) {
  return (
    <input
      id={props.id}
      type="text"
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      readOnly={props.readOnly}
      maxLength={SHORT_TEXT_MAX}
      autoComplete="off"
      aria-invalid={props.invalid}
      aria-labelledby={props.labelledBy}
      aria-describedby={props.describedBy}
      className={FIELD_CLASS}
    />
  );
}
```

`apps/web/src/journey/ui/inputs/LongTextInput.tsx` :

```tsx
import { LONG_TEXT_MAX } from '../../types';
import { FIELD_CLASS, type FieldProps } from '../field';

export function LongTextInput(props: FieldProps<string>) {
  return (
    <textarea
      id={props.id}
      rows={6}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      readOnly={props.readOnly}
      maxLength={LONG_TEXT_MAX}
      aria-invalid={props.invalid}
      aria-labelledby={props.labelledBy}
      aria-describedby={props.describedBy}
      className={FIELD_CLASS}
    />
  );
}
```

`apps/web/src/journey/ui/inputs/DateInput.tsx` :

```tsx
import { FIELD_CLASS, type FieldProps } from '../field';

export function DateInput(props: FieldProps<string>) {
  return (
    <input
      id={props.id}
      type="date"
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      readOnly={props.readOnly}
      aria-invalid={props.invalid}
      aria-labelledby={props.labelledBy}
      aria-describedby={props.describedBy}
      className={FIELD_CLASS}
    />
  );
}
```

`apps/web/src/journey/ui/inputs/ChoiceInput.tsx` :

```tsx
import { useTranslations } from 'next-intl';
import type { ChoiceQuestion } from '../../types';
import type { FieldProps } from '../field';

/** Choix unique en boutons radio ; libellés : `journey.q.<clé>.options.<option>`. */
export function ChoiceInput({
  question,
  ...props
}: FieldProps<string> & { question: ChoiceQuestion }) {
  const t = useTranslations('journey.q');
  return (
    <div
      role="radiogroup"
      aria-labelledby={props.labelledBy}
      aria-describedby={props.describedBy}
      aria-invalid={props.invalid}
      className="space-y-3"
    >
      {question.options.map((option, i) => (
        <label
          key={option}
          className={`has-[:focus-visible]:ring-accent-soft block cursor-pointer rounded-xl border px-4 py-3 has-[:focus-visible]:ring-2 ${
            props.value === option
              ? 'text-foreground border-white bg-white font-semibold'
              : 'border-white/30'
          }`}
        >
          <input
            id={i === 0 ? props.id : undefined}
            type="radio"
            name={`choice-${question.key}`}
            value={option}
            checked={props.value === option}
            onChange={() => props.onChange(option)}
            disabled={props.readOnly}
            className="sr-only"
          />
          {t(`${question.key}.options.${option}`)}
        </label>
      ))}
    </div>
  );
}
```

`apps/web/src/journey/ui/inputs/PlaceInput.tsx` :

```tsx
import { useTranslations } from 'next-intl';
import { CITY_MAX, type PlaceValue } from '../../types';
import { FIELD_CLASS, type FieldProps } from '../field';

export interface Country {
  code: string;
  label: string;
}

export function PlaceInput({
  countries,
  ...props
}: FieldProps<PlaceValue> & { countries: Country[] }) {
  const t = useTranslations('journey.fields');
  return (
    <div className="space-y-3" role="group" aria-labelledby={props.labelledBy}>
      <label className="block space-y-1">
        <span className="text-sm">{t('city')}</span>
        <input
          id={props.id}
          type="text"
          value={props.value.city}
          onChange={(e) => props.onChange({ ...props.value, city: e.target.value })}
          readOnly={props.readOnly}
          maxLength={CITY_MAX}
          autoComplete="off"
          aria-invalid={props.invalid}
          aria-describedby={props.describedBy}
          className={FIELD_CLASS}
        />
      </label>
      <label className="block space-y-1">
        <span className="text-sm">{t('country')}</span>
        <select
          value={props.value.countryCode}
          onChange={(e) => props.onChange({ ...props.value, countryCode: e.target.value })}
          disabled={props.readOnly}
          className={FIELD_CLASS}
        >
          {countries.map((c) => (
            <option key={c.code} value={c.code} className="text-foreground">
              {c.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
```

`apps/web/src/journey/ui/inputs/ListInput.tsx` :

```tsx
import { useTranslations } from 'next-intl';
import {
  LONG_TEXT_MAX,
  SHORT_TEXT_MAX,
  type ListField,
  type ListItem,
  type ListQuestion,
} from '../../types';
import { FIELD_CLASS, type FieldProps } from '../field';
import { emptyItem } from '../values';

interface ItemFieldProps {
  id: string;
  field: ListField;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
  readOnly: boolean;
}

/** Un champ d'un élément ; libellés : `journey.fields.<nom>` et `journey.fields.options.<nom>.<option>`. */
function ItemField({ id, field, value, onChange, readOnly }: ItemFieldProps) {
  const t = useTranslations('journey');
  const label = t(`fields.${field.name}`);
  if (field.kind === 'boolean') {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input
          id={id}
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
          disabled={readOnly}
        />
        {label}
      </label>
    );
  }
  const text = typeof value === 'string' ? value : '';
  return (
    <label className="block space-y-1">
      <span className="text-sm">{label}</span>
      {field.kind === 'choice' ? (
        <select
          id={id}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          className={FIELD_CLASS}
        >
          <option value="">{t('ui.chooseOption')}</option>
          {field.options.map((option) => (
            <option key={option} value={option} className="text-foreground">
              {t(`fields.options.${field.name}.${option}`)}
            </option>
          ))}
        </select>
      ) : field.kind === 'longText' ? (
        <textarea
          id={id}
          rows={3}
          value={text}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          maxLength={LONG_TEXT_MAX}
          className={FIELD_CLASS}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          maxLength={SHORT_TEXT_MAX}
          autoComplete="off"
          className={FIELD_CLASS}
        />
      )}
    </label>
  );
}

export function ListInput({
  question,
  ...props
}: FieldProps<ListItem[]> & { question: ListQuestion }) {
  const t = useTranslations('journey.ui');
  const items = props.value;
  const update = (index: number, name: string, value: string | boolean) =>
    props.onChange(items.map((item, i) => (i === index ? { ...item, [name]: value } : item)));

  return (
    <div
      className="space-y-4"
      role="group"
      aria-labelledby={props.labelledBy}
      aria-describedby={props.describedBy}
    >
      {items.map((item, index) => (
        // WHY: les éléments n'ont pas d'identifiant ; les champs sont contrôlés, l'index suffit.
        <fieldset key={index} className="space-y-3 rounded-2xl border border-white/20 p-4">
          <legend className="px-1 text-sm text-white/70">{t('item', { n: index + 1 })}</legend>
          {question.fields.map((field, f) => (
            <ItemField
              key={field.name}
              id={index === 0 && f === 0 ? props.id : `${props.id}-${index}-${field.name}`}
              field={field}
              value={item[field.name]}
              onChange={(value) => update(index, field.name, value)}
              readOnly={props.readOnly}
            />
          ))}
          {!props.readOnly && items.length > 1 && (
            <button
              type="button"
              onClick={() => props.onChange(items.filter((_, i) => i !== index))}
              className="text-sm text-white/70 underline"
            >
              {t('removeItem')}
            </button>
          )}
        </fieldset>
      ))}
      {!props.readOnly && items.length < question.maxItems && (
        <button
          type="button"
          onClick={() => props.onChange([...items, emptyItem(question)])}
          className="rounded-full border border-white/40 px-4 py-2 text-sm"
        >
          {t('addItem')}
        </button>
      )}
    </div>
  );
}
```

`apps/web/src/journey/ui/AnswerInput.tsx` :

```tsx
import type { ListItem, PlaceValue, Question } from '../types';
import type { FieldProps } from './field';
import { ChoiceInput } from './inputs/ChoiceInput';
import { DateInput } from './inputs/DateInput';
import { ListInput } from './inputs/ListInput';
import { LongTextInput } from './inputs/LongTextInput';
import { PlaceInput, type Country } from './inputs/PlaceInput';
import { ShortTextInput } from './inputs/ShortTextInput';
import type { EditableValue } from './values';

type Props = FieldProps<EditableValue> & { question: Question; countries: Country[] };

/**
 * Champ de saisie adapté au type de la question.
 * WHY: `toEditable` garantit que la valeur a la forme attendue par le type, d'où les conversions.
 */
export function AnswerInput({ question, countries, ...props }: Props) {
  const text = { ...props, value: props.value as string };
  switch (question.kind) {
    case 'shortText':
      return <ShortTextInput {...text} />;
    case 'longText':
      return <LongTextInput {...text} />;
    case 'date':
      return <DateInput {...text} />;
    case 'choice':
      return <ChoiceInput {...text} question={question} />;
    case 'place':
      return <PlaceInput {...props} value={props.value as PlaceValue} countries={countries} />;
    case 'list':
      return <ListInput {...props} value={props.value as ListItem[]} question={question} />;
  }
}
```

- [ ] **Étape 6 : écrire `QuestionScreen.tsx`**

```tsx
'use client';

import { startTransition, useActionState, useEffect, useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { saveAnswerAction, type AnswerState } from '@/modules/dossier/answers/actions';
import type { Question } from '../types';
import { AnswerInput } from './AnswerInput';
import type { Country } from './inputs/PlaceInput';
import { compact, isBlank, toEditable, type EditableValue } from './values';

interface Props {
  dossierId: string;
  question: Question;
  index: number;
  total: number;
  title: string;
  hint: string;
  stored: unknown;
  readOnly: boolean;
  countries: Country[];
  backHref: string;
  nextHref: string | null;
}

const SHELL =
  'bg-secondary text-secondary-foreground mx-auto flex min-h-[70dvh] max-w-xl flex-col gap-6 rounded-3xl p-6 sm:p-10';
const LINK_CLASS = 'text-sm text-white/70 underline-offset-4 hover:underline';

/**
 * Écran d'une question, plein écran : Revenir, Passer, Suivant.
 * La réponse est enregistrée au passage à la question suivante (Suivant ou Passer).
 *
 * @example
 * <QuestionScreen key={question.key} dossierId={id} question={question} index={0} total={6} … />
 */
export function QuestionScreen(props: Props) {
  const { dossierId, question, index, total, readOnly } = props;
  const t = useTranslations('journey.ui');
  const tErrors = useTranslations('dossier.errors');
  const [state, formAction, pending] = useActionState<AnswerState | null, FormData>(
    saveAnswerAction,
    null,
  );
  const [value, setValue] = useState<EditableValue>(() =>
    toEditable(question, props.stored, props.countries[0]?.code ?? ''),
  );
  const [blank, setBlank] = useState(false);
  const fieldId = `answer-${question.key.replace(/\./g, '-')}`;
  const errorText = blank ? t('required') : state?.error ? tErrors(state.error) : null;

  // WHY: le focus revient au champ une fois l'erreur rendue, pour qu'elle soit annoncée avec lui.
  useEffect(() => {
    if (errorText) document.getElementById(fieldId)?.focus();
  }, [errorText, fieldId]);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(e.currentTarget, submitter);
    if (data.get('intent') !== 'skip') {
      if (isBlank(value)) return setBlank(true);
      data.set('value', JSON.stringify(compact(value)));
    }
    startTransition(() => formAction(data));
  };

  const describedBy =
    [props.hint ? 'question-hint' : null, errorText ? 'question-error' : null]
      .filter(Boolean)
      .join(' ') || undefined;
  const backLink = (
    <Link href={props.backHref} className={LINK_CLASS}>
      ← {index > 0 ? t('back') : t('backToDossier')}
    </Link>
  );

  const body = (
    <>
      <p className="text-sm text-white/60">{t('progress', { current: index + 1, total })}</p>
      <div className="space-y-2">
        <h1 id="question-title" className="font-display text-2xl font-bold">
          {props.title}
        </h1>
        {props.hint && (
          <p id="question-hint" className="text-sm text-white/70">
            {props.hint}
          </p>
        )}
      </div>
      {readOnly && <p className="text-sm text-white/70">{t('readOnly')}</p>}
      <AnswerInput
        id={fieldId}
        question={question}
        value={value}
        onChange={(next) => {
          setValue(next);
          setBlank(false);
        }}
        readOnly={readOnly}
        invalid={errorText !== null}
        labelledBy="question-title"
        describedBy={describedBy}
        countries={props.countries}
      />
      {errorText && (
        <p id="question-error" role="alert" className="text-accent-soft text-sm">
          {errorText}
        </p>
      )}
    </>
  );

  if (readOnly) {
    return (
      <div className={SHELL}>
        {body}
        <div className="mt-auto flex items-center justify-between gap-3">
          {backLink}
          {props.nextHref && (
            <Link href={props.nextHref} className={LINK_CLASS}>
              {t('next')} →
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className={SHELL}>
      <input type="hidden" name="dossierId" value={dossierId} />
      <input type="hidden" name="key" value={question.key} />
      {body}
      <div className="mt-auto flex items-center justify-between gap-3">
        {backLink}
        {/* WHY: « Suivant » est premier dans le DOM pour être le bouton par défaut de la touche
            Entrée ; flex-row-reverse le place visuellement à droite de « Passer ». */}
        <div className="flex flex-row-reverse items-center gap-4">
          <button
            type="submit"
            name="intent"
            value="next"
            disabled={pending}
            className="bg-accent rounded-full px-6 py-3 font-semibold text-white disabled:opacity-60"
          >
            {index + 1 < total ? t('next') : t('finish')}
          </button>
          <button
            type="submit"
            name="intent"
            value="skip"
            disabled={pending}
            className="text-sm text-white/80 underline disabled:opacity-60"
          >
            {t('skip')}
          </button>
        </div>
      </div>
    </form>
  );
}
```

- [ ] **Étape 7 : vérifier**

Run: `pnpm --filter @testimona/web typecheck && pnpm --filter @testimona/web lint && pnpm format:check`
Expected: 0 erreur ; chaque fichier sous 300 lignes. Si Prettier signale un écart, lancer
`pnpm exec prettier --write apps/web/src/journey` puis revérifier.

- [ ] **Étape 8 : commit**

```bash
git add apps/web/src/journey/ui
git commit -m "feat(journey): add the question screen and answer inputs"
```

---

### Tâche 9 : route de l'écran question

**Fichiers :**

- Créer : `apps/web/src/app/[locale]/(dossier)/dossier/[id]/etape/[stepId]/page.tsx`
- Modifier : `apps/web/e2e/smoke.spec.ts`

- [ ] **Étape 1 : écrire le test e2e (anonyme)**

Ajouter dans `apps/web/e2e/smoke.spec.ts`, à la suite de « New dossier requires sign-in » :

```ts
test('Question screen requires sign-in', async ({ page }) => {
  await page.goto('/dossier/44444444-4444-4444-8444-444444444444/etape/biography?q=2');
  await expect(page).toHaveURL(/\/login\?next=.*etape%2Fbiography/);
});
```

Run: `pnpm --filter @testimona/web test:e2e -- e2e/smoke.spec.ts` (variables Supabase requises).
Expected: PASS, car le middleware protège déjà `/dossier` : le test fixe ce comportement pour la
nouvelle route. Sans variables Supabase, noter « non lancé » dans le rapport.

- [ ] **Étape 2 : écrire la page**

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { z } from 'zod';
import { resolveQuestionIndex } from '@/journey/progress';
import { getStep, isStepOpen, personStatus } from '@/journey/registry';
import { QuestionScreen } from '@/journey/ui/QuestionScreen';
import { listAnswers } from '@/modules/dossier/answers/repo';
import { getDossier, getMyRole, getPerson } from '@/modules/dossier/repo';
import { canWrite } from '@/modules/dossier/roles';
import { COUNTRY_CODES } from '@/modules/dossier/schema';

export const metadata: Metadata = { robots: { index: false, follow: false } };

const IdSchema = z.string().uuid();

export default async function StepPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string; stepId: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const [{ locale, id, stepId }, { q }] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);
  const step = getStep(stepId);
  if (!IdSchema.safeParse(id).success || !step) notFound();

  const [t, dossier] = await Promise.all([getTranslations('journey'), getDossier(id)]);
  if (!dossier || !isStepOpen(dossier.entryPoint, step.id)) notFound();

  const keys = step.questions.map((question) => question.key);
  const [person, role, answers] = await Promise.all([
    getPerson(id),
    getMyRole(id),
    listAnswers(id, keys),
  ]);
  const index = resolveQuestionIndex(step, answers, q);
  const question = step.questions[index];
  if (!question) notFound();

  const values = {
    name: person?.firstName ?? dossier.title,
    status: personStatus(dossier.entryPoint),
  };
  const names = new Intl.DisplayNames([locale], { type: 'region' });
  const countries = COUNTRY_CODES.map((code) => ({ code, label: names.of(code) ?? code }));
  const stepPath = `/dossier/${id}/etape/${step.id}`;

  return (
    <div className="px-4 py-8 sm:px-6 lg:py-12">
      <QuestionScreen
        key={question.key}
        dossierId={id}
        question={question}
        index={index}
        total={step.questions.length}
        title={t(`q.${question.key}.title`, values)}
        hint={t(`q.${question.key}.hint`, values)}
        stored={answers[question.key]}
        readOnly={!canWrite(role)}
        countries={countries}
        backHref={index > 0 ? `${stepPath}?q=${index - 1}` : `/dossier/${id}`}
        nextHref={index + 1 < step.questions.length ? `${stepPath}?q=${index + 1}` : null}
      />
    </div>
  );
}
```

- [ ] **Étape 3 : vérifier**

Run: `pnpm --filter @testimona/web typecheck && pnpm --filter @testimona/web lint && NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder_anon_key_long_enough NEXT_PUBLIC_SITE_URL=https://example.com pnpm --filter @testimona/web build`
Expected: 0 erreur ; la route `/[locale]/dossier/[id]/etape/[stepId]` apparaît dans le build.

- [ ] **Étape 4 : commit**

```bash
git add "apps/web/src/app/[locale]/(dossier)/dossier/[id]/etape/[stepId]/page.tsx" apps/web/e2e/smoke.spec.ts
git commit -m "feat(dossier): add the journey question route"
```

---

### Tâche 10 : avancement sur le tableau de bord

**Fichiers :**

- Créer : `apps/web/src/journey/ui/JourneyOverview.tsx`
- Modifier : `apps/web/src/app/[locale]/(dossier)/dossier/[id]/page.tsx`

- [ ] **Étape 1 : écrire `JourneyOverview.tsx`**

```tsx
import { getTranslations } from 'next-intl/server';
import { buttonClasses } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Link } from '@/i18n/navigation';
import { nextQuestion, stepProgress, type Answers } from '../progress';
import type { Step } from '../types';

interface Props {
  dossierId: string;
  steps: readonly Step[];
  answers: Answers;
  name: string;
  status: 'alive' | 'deceased';
}

/** Carte « Prochaine question » et avancement de chaque étape (questions passées « à compléter »). */
export async function JourneyOverview({ dossierId, steps, answers, name, status }: Props) {
  const t = await getTranslations('journey');
  const next = nextQuestion(steps, answers);
  const nextKey = next
    ? steps.find((step) => step.id === next.stepId)?.questions[next.index]?.key
    : undefined;

  return (
    <div className="space-y-4">
      <div className="bg-secondary text-secondary-foreground rounded-2xl p-6">
        <h3 className="font-display text-lg font-semibold">{t('dashboard.nextTitle')}</h3>
        {next && nextKey ? (
          <>
            <p className="mt-2 text-white/80">{t(`q.${nextKey}.title`, { name, status })}</p>
            <Link
              href={`/dossier/${dossierId}/etape/${next.stepId}?q=${next.index}`}
              className={`${buttonClasses({ variant: 'primary', size: 'md' })} mt-4`}
            >
              {t('dashboard.answer')}
            </Link>
          </>
        ) : (
          <p className="mt-2 text-white/80">{t('dashboard.allDone')}</p>
        )}
      </div>

      <ul className="border-border divide-border divide-y rounded-2xl border">
        {steps.map((step) => {
          const progress = stepProgress(step, answers);
          const title = t(`steps.${step.id}.title`);
          return (
            <li key={step.id} className="space-y-2 px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  href={`/dossier/${dossierId}/etape/${step.id}`}
                  className="text-foreground font-semibold hover:underline"
                >
                  {title}
                </Link>
                <span className="text-muted-foreground text-sm">
                  {t('dashboard.stepProgress', {
                    answered: progress.answered,
                    total: progress.total,
                  })}
                </span>
              </div>
              <ProgressBar value={progress.answered} max={progress.total} ariaLabel={title} />
              {progress.skipped > 0 && (
                <p className="text-muted-foreground text-sm">
                  {t('dashboard.toComplete', { count: progress.skipped })}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Étape 2 : brancher le tableau de bord**

Dans `apps/web/src/app/[locale]/(dossier)/dossier/[id]/page.tsx` :

1. Ajouter les imports :

```tsx
import { personStatus, stepsFor } from '@/journey/registry';
import { JourneyOverview } from '@/journey/ui/JourneyOverview';
import { listAnswers } from '@/modules/dossier/answers/repo';
```

2. Remplacer `const [person, members] = await Promise.all([getPerson(id), listMembers(id)]);`
   par :

```tsx
const [person, members, answers] = await Promise.all([
  getPerson(id),
  listMembers(id),
  listAnswers(id),
]);
```

3. Remplacer la section du parcours (celle qui affiche `overview.journeyTitle` et
   `overview.journeySoon`) par :

```tsx
<section className="space-y-4">
  <h2 className="font-display text-foreground text-lg font-semibold">
    {t('overview.journeyTitle')}
  </h2>
  <JourneyOverview
    dossierId={id}
    steps={stepsFor(dossier.entryPoint)}
    answers={answers}
    name={person?.firstName ?? dossier.title}
    status={personStatus(dossier.entryPoint)}
  />
</section>
```

- [ ] **Étape 3 : vérifier**

Run: `grep -rn journeySoon apps/web/src apps/web/messages; pnpm --filter @testimona/web typecheck && pnpm --filter @testimona/web lint && pnpm --filter @testimona/web test`
Expected: aucune occurrence de `journeySoon` ; 0 erreur ; tous les tests verts.

- [ ] **Étape 4 : commit**

```bash
git add apps/web/src/journey/ui/JourneyOverview.tsx "apps/web/src/app/[locale]/(dossier)/dossier/[id]/page.tsx"
git commit -m "feat(dossier): show journey progress and the next question on the dashboard"
```

---

### Tâche 11 : e2e « répondre à une question »

**Fichiers :**

- Créer : `apps/web/e2e/journey.spec.ts`

Le test crée un vrai dossier : il ne tourne qu'avec un compte de test (`E2E_EMAIL`,
`E2E_PASSWORD`) sur une base de test, jamais sur la production.

- [ ] **Étape 1 : écrire le test**

```ts
import { test, expect } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL ?? '';
const PASSWORD = process.env.E2E_PASSWORD ?? '';

test.describe('Parcours (compte de test)', () => {
  test.skip(!EMAIL || !PASSWORD, 'Définir E2E_EMAIL et E2E_PASSWORD (compte et base de test).');

  test('créer un dossier, répondre à une question, voir l’avancement', async ({ page }) => {
    await page.goto('/login?next=%2Fdossier%2Fnouveau%3Fporte%3Ddeces');
    await page.locator('input[name="email"]').fill(EMAIL);
    await page.locator('input[name="password"]').fill(PASSWORD);
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
    await expect(page).toHaveURL(/\/dossier\/nouveau/);

    await page.locator('#wizard-firstName').fill('Test');
    await page.locator('#wizard-lastName').fill(`E2E ${Date.now()}`);
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.locator('#wizard-city').fill('Libreville');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByText('Enfant', { exact: true }).click();
    await page.getByRole('button', { name: 'Ouvrir le dossier' }).click();
    await expect(page).toHaveURL(/\/dossier\/[0-9a-f-]{36}$/);
    const dossierUrl = page.url();

    await page.getByRole('link', { name: 'Répondre' }).click();
    await expect(page).toHaveURL(/\/etape\/biography\?q=0$/);
    await page.locator('#answer-biography-birthPlace').fill('Lambaréné');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await expect(page).toHaveURL(/\/etape\/biography\?q=1$/);

    await page.getByRole('button', { name: 'Passer' }).click();
    await expect(page).toHaveURL(/\/etape\/biography\?q=2$/);

    await page.goto(dossierUrl);
    await expect(page.getByText('1 sur 6 réponses')).toBeVisible();
    await expect(page.getByText('1 question à compléter')).toBeVisible();
  });
});
```

- [ ] **Étape 2 : lancer**

Run: `pnpm --filter @testimona/web test:e2e -- e2e/journey.spec.ts`
Expected: « skipped » sans les variables ; PASS avec un compte de test.

- [ ] **Étape 3 : commit**

```bash
git add apps/web/e2e/journey.spec.ts
git commit -m "test(e2e): answer a journey question with a test account"
```

---

### Tâche 12 : vérification complète et PR

- [ ] **Étape 1 : vérification locale**

```bash
pnpm install --frozen-lockfile
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder_anon_key_long_enough NEXT_PUBLIC_SITE_URL=https://example.com pnpm build
```

Expected : tout vert. Aucune migration dans cette PR : rien à appliquer en production.

- [ ] **Étape 2 : rebaser puis pousser**

Si la PR #5 est fusionnée : `git fetch origin && git rebase origin/main`, puis relancer l'étape 1.
Sinon, ouvrir la PR avec `feature/lot1-pr1-dossier-membres` comme base. Pousser avec
`git push -u origin feature/lot1-pr2-journey-biography`, avec l'accord de l'utilisateur.

- [ ] **Étape 3 : ouvrir la PR**

Description (Contexte / Changements / Tests effectués / Risques), terminée par la ligne
d'attribution habituelle.

---

## Couverture de la spec (auto-relecture)

| Exigence                                                                         | Tâche       |
| -------------------------------------------------------------------------------- | ----------- |
| `types.ts` : union des six types, schéma Zod par type                            | 1           |
| `define.ts` : `defineStep()` et fabriques                                        | 1           |
| `steps/1-6-biography.ts` : six clés de la spec, `traits` en liste trait+anecdote | 2           |
| `registry.ts` : étapes par porte, `getStep`, `findQuestion`                      | 2           |
| `progress.ts` : avancement, prochaine question non répondue et non passée        | 3           |
| « Passer » = `{ "skipped": true }`, listé « à compléter »                        | 1, 3, 5, 10 |
| `saveAnswer` : clé du registre, valeur validée                                   | 5           |
| Route `/dossier/[id]/etape/[stepId]?q=<n>`, Revenir / Passer / Suivant           | 8, 9        |
| Écran plein écran navy, une question à la fois                                   | 8           |
| Lecteur : lecture seule                                                          | 8, 9        |
| Tableau de bord : avancement par étape, carte « Prochaine question »             | 10          |
| Réponse refusée : message sous la question, saisie conservée                     | 8           |
| Journalisation : code seulement, jamais le contenu                               | 4, 5        |
| Tests unitaires (schémas, `progress.ts`, service) et e2e « répondre »            | 1-5, 8, 11  |
