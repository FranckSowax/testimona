# Lot 1 · PR 3 — Annoncer : plan d'implémentation

> **Pour les agents :** sous-skill requis : superpowers:subagent-driven-development (recommandé) ou
> superpowers:executing-plans, tâche par tâche. Les étapes utilisent des cases `- [ ]`.

**Objectif :** pour un dossier « décès », la famille prépare la liste des personnes à prévenir
(2.1), obtient un message immédiat (2.2) et une annonce par e-mail (2.3) rédigés à partir de ses
réponses, les modifie, les enregistre, les copie et partage le message sur WhatsApp.

**Architecture :** trois nouvelles étapes déclarées dans le moteur `apps/web/src/journey/` (PR 2).
Une étape peut porter un **brouillon** (`draft`) : une clé de réponse supplémentaire
(`announce.whatsapp.text`, `announce.email.text`) remplie à partir de modèles de texte purs
(`journey/templates/`, FR/EN, tons croyant et neutre). Une route
`/dossier/[id]/etape/[stepId]/brouillon` affiche l'éditeur ; l'enregistrement passe par un nouveau
service `saveDraft`. Aucune migration : tout est dans `journey_answer`.

**Stack :** Next.js 15 (App Router, actions serveur), React 19, Supabase (RLS), Zod 3.25,
next-intl 3, Vitest, Playwright.

**Spec :** [`2026-10-27-lot-1-entrer-et-annoncer-design.md`](../specs/2026-10-27-lot-1-entrer-et-annoncer-design.md),
section 2 (étapes 2.1 à 2.3, route brouillon, cercles, tons) et section 3 (`templates/`).
Plan précédent : [`2026-10-27-lot-1-pr2-moteur-et-biographie.md`](./2026-10-27-lot-1-pr2-moteur-et-biographie.md).

---

## Décisions propres à cette PR (à valider en revue)

- **Ordre pour la porte « décès » :** 2.1, 2.2, 2.3, puis la biographie. WHY : dans la semaine qui
  suit un décès, prévenir est plus urgent que raconter une vie. La porte « préparer » garde la
  biographie seule.
- **Valeurs des questions de 2.2 et 2.3** (la spec ne donne que les clés) :
  - `death.date` : date ;
  - `death.mentionCause` : choix `none` | `illness` | `sudden` | `accident` (jamais de texte libre :
    une circonstance reste discrète et formulée avec tact) ;
  - `announce.tone` : `believer` | `neutral` (spec) ;
  - `announce.aboutPerson`, `announce.practicalInfo` : textes longs ;
  - `announce.flowersOrDonations` : choix `flowers` | `donations` | `both` | `noPreference`.
- **Liste de diffusion** `broadcast.contacts` : liste de 80 éléments au plus ; champs `name`
  (obligatoire), `phone`, `circle` (cercles de la spec), `caller` (texte : qui appelle), `priority`
  (case « à appeler en priorité »). 80 éléments restent sous la borne de 60 000 octets.
- **Brouillons :** l'éditeur part du texte enregistré s'il existe, sinon du modèle. « Repartir des
  réponses » remplace le texte par le modèle (sans enregistrer). L'annonce par e-mail stocke le
  corps ; l'objet est recalculé (« Décès de … »). Taille maximale d'un brouillon : 12 000 caractères.
- **Après la dernière question** d'une étape à brouillon, la redirection mène au brouillon au lieu
  du tableau de bord.
- **Libellés des champs de liste par question** (`journey.q.<clé>.fields.<nom>.label`) au lieu de
  `journey.fields.<nom>` partagé, pour éviter les collisions signalées en revue de la PR 2. Un test
  vérifie que chaque libellé du registre existe en FR et en EN.

## Carte des fichiers

| Fichier                                                                              | Rôle                                                          |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `apps/web/src/journey/messages.test.ts`                                              | Garde : tout libellé du registre existe en FR et en EN        |
| `apps/web/src/journey/ui/inputs/ListInput.tsx`                                       | Libellés de champs par question                               |
| `apps/web/src/journey/types.ts`                                                      | `StepDraft`, `DraftKind`, `DRAFT_MAX`, `draftTextSchema`      |
| `apps/web/src/journey/define.ts`                                                     | Validation du brouillon d'une étape                           |
| `apps/web/src/journey/registry.ts`                                                   | Nouvelles étapes, ordre, `allSteps()`, unicité des brouillons |
| `apps/web/src/journey/options.ts`                                                    | Options partagées (cercles, circonstances, tons, fleurs)      |
| `apps/web/src/journey/steps/2-1-broadcast-list.ts`                                   | Étape 2.1                                                     |
| `apps/web/src/journey/steps/2-2-immediate-message.ts`                                | Étape 2.2 (+ brouillon WhatsApp)                              |
| `apps/web/src/journey/steps/2-3-email-announcement.ts`                               | Étape 2.3 (+ brouillon e-mail)                                |
| `apps/web/src/journey/templates/common.ts`                                           | Aides : réponses, nom, date, phrase de décès                  |
| `apps/web/src/journey/templates/immediate-message.ts`                                | Modèle 2.2                                                    |
| `apps/web/src/journey/templates/email-announcement.ts`                               | Modèle 2.3 et objet                                           |
| `apps/web/src/journey/templates/index.ts`                                            | `draftFor(kind, ctx)`                                         |
| `apps/web/src/modules/dossier/answers/service.ts`                                    | + `saveDraft`                                                 |
| `apps/web/src/modules/dossier/answers/actions.ts`                                    | + `saveDraftAction`                                           |
| `apps/web/src/modules/dossier/answers/redirect.ts`                                   | Fin d'étape à brouillon → brouillon                           |
| `apps/web/src/journey/ui/DraftEditor.tsx`                                            | Éditeur de brouillon (client)                                 |
| `apps/web/src/journey/ui/JourneyOverview.tsx`                                        | Lien « Voir le brouillon »                                    |
| `apps/web/src/app/[locale]/(dossier)/dossier/[id]/etape/[stepId]/brouillon/page.tsx` | Route du brouillon                                            |
| `apps/web/messages/fr.json`, `apps/web/messages/en.json`                             | Textes des étapes, questions, options, brouillons             |
| `apps/web/e2e/smoke.spec.ts`, `apps/web/e2e/journey.spec.ts`                         | Redirection anonyme du brouillon ; porte « préparer »         |

Règles du lot 0 : accès base uniquement dans les `repo.ts` ; aucun import de
`@/lib/supabase/admin` ; 300 lignes au maximum par fichier, tests compris ; `pnpm format:check`
vert ; pas de `any`.

Branche : `feature/lot1-pr3-announce`, créée depuis `main` (PR #5 et #6 fusionnées).

Commande de test isolée : `cd apps/web && pnpm vitest run <fichier>`.

---

### Tâche 1 : libellés de liste par question et garde des textes

**Fichiers :**

- Modifier : `apps/web/src/journey/types.ts`, `apps/web/src/journey/registry.ts`,
  `apps/web/src/journey/ui/inputs/ListInput.tsx`, `apps/web/messages/fr.json`,
  `apps/web/messages/en.json`
- Créer : `apps/web/src/journey/messages.test.ts`

- [ ] **Étape 1 : écrire le test qui échoue**

`apps/web/src/journey/messages.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import fr from '../../messages/fr.json';
import { allSteps } from './registry';
import type { Step } from './types';

const get = (messages: unknown, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      messages,
    );

/** Chemins de textes qu'une étape du registre exige. */
function requiredPaths(step: Step): string[] {
  const paths = [`journey.steps.${step.id}.title`, `journey.steps.${step.id}.description`];
  if (step.draft) paths.push(`journey.draft.title.${step.draft.kind}`);
  for (const question of step.questions) {
    const base = `journey.q.${question.key}`;
    paths.push(`${base}.title`, `${base}.hint`);
    if (question.kind === 'choice') {
      paths.push(...question.options.map((o) => `${base}.options.${o}`));
    }
    if (question.kind === 'list') {
      for (const field of question.fields) {
        paths.push(`${base}.fields.${field.name}.label`);
        if (field.kind === 'choice') {
          paths.push(...field.options.map((o) => `${base}.fields.${field.name}.options.${o}`));
        }
      }
    }
  }
  return paths;
}

describe.each([
  ['fr', fr],
  ['en', en],
])('textes du parcours (%s)', (_locale, messages) => {
  it('couvrent chaque étape, question, option et champ du registre', () => {
    const missing = allSteps()
      .flatMap(requiredPaths)
      .filter((path) => typeof get(messages, path) !== 'string');
    expect(missing).toEqual([]);
  });
});
```

Dans `apps/web/src/journey/types.ts`, remplacer l'interface `Step` par :

```ts
export type DraftKind = 'whatsapp' | 'email';

/** Brouillon rédigé à partir des réponses de l'étape, enregistré sous sa propre clé. */
export interface StepDraft {
  key: string;
  kind: DraftKind;
}

/** Une étape du parcours : `id` sert de segment d'URL (`/etape/<id>`). */
export interface Step {
  id: string;
  questions: readonly Question[];
  draft?: StepDraft;
}
```

Dans `apps/web/src/journey/registry.ts`, ajouter après `stepsFor` :

```ts
/** Toutes les étapes du registre, sans doublon (pour les contrôles transverses). */
export function allSteps(): readonly Step[] {
  return ALL_STEPS;
}
```

- [ ] **Étape 2 : lancer le test, constater l'échec**

Run: `cd apps/web && pnpm vitest run src/journey/messages.test.ts`
Expected: FAIL, chemins manquants `journey.q.biography.traits.fields.trait.label` et
`journey.q.biography.traits.fields.anecdote.label` (FR et EN).

- [ ] **Étape 3 : déplacer les libellés de la biographie**

Dans `fr.json`, sous `journey.q.biography.traits`, ajouter :

```json
"fields": {
  "trait": { "label": "Trait de caractère" },
  "anecdote": { "label": "Anecdote (facultatif)" }
}
```

et dans `en.json` :

```json
"fields": {
  "trait": { "label": "Character trait" },
  "anecdote": { "label": "Anecdote (optional)" }
}
```

Retirer `journey.fields.trait` et `journey.fields.anecdote` des deux fichiers (garder
`journey.fields.city` et `journey.fields.country`, utilisés par `PlaceInput`).

- [ ] **Étape 4 : lire les libellés par question dans `ListInput.tsx`**

Dans `ItemFieldProps`, ajouter `questionKey: string;` et le déstructurer dans `ItemField`.
Remplacer `const label = t(\`fields.${field.name}\`);` par :

```tsx
const label = t(`q.${questionKey}.fields.${field.name}.label`);
```

et le libellé d'option `{t(\`fields.options.${field.name}.${option}\`)}` par :

```tsx
{
  t(`q.${questionKey}.fields.${field.name}.options.${option}`);
}
```

Mettre à jour la JSDoc de `ItemField` : « libellés : `journey.q.<clé>.fields.<nom>.label` et
`journey.q.<clé>.fields.<nom>.options.<option>` ». Dans `ListInput`, passer
`questionKey={question.key}` à chaque `<ItemField>`.

- [ ] **Étape 5 : lancer les tests**

Run: `cd apps/web && pnpm vitest run src/journey && pnpm --filter @testimona/web typecheck`
Expected: PASS ; typecheck vert. Vérifier la parité des clés FR/EN (depuis la racine du dépôt) :

```bash
node -e "const f=require('./apps/web/messages/fr.json'),e=require('./apps/web/messages/en.json');const k=(o,p='')=>Object.entries(o).flatMap(([n,v])=>typeof v==='object'?k(v,p+n+'.'):[p+n]);const a=k(f).sort().join('\n'),b=k(e).sort().join('\n');console.log(a===b?'identiques':'DIFFÉRENTES')"
```

- [ ] **Étape 6 : commit**

```bash
git add apps/web/src/journey/messages.test.ts apps/web/src/journey/types.ts apps/web/src/journey/registry.ts apps/web/src/journey/ui/inputs/ListInput.tsx apps/web/messages/fr.json apps/web/messages/en.json
git commit -m "refactor(journey): per-question list labels and a guard on journey texts"
```

---

### Tâche 2 : brouillons d'étape dans le moteur

**Fichiers :**

- Modifier : `apps/web/src/journey/types.ts`, `apps/web/src/journey/define.ts`,
  `apps/web/src/journey/registry.ts`
- Test : `apps/web/src/journey/define.test.ts`, `apps/web/src/journey/registry.test.ts`,
  `apps/web/src/journey/types-limits.test.ts`

- [ ] **Étape 1 : écrire les tests qui échouent**

Ajouter à `apps/web/src/journey/define.test.ts`, dans le `describe('defineStep')` :

```ts
it('accepte un brouillon à clé valide et distincte des questions', () => {
  const step = {
    id: 'demo',
    questions: [q.shortText('demo.one')],
    draft: { key: 'demo.draft.text', kind: 'whatsapp' as const },
  };
  expect(defineStep(step)).toBe(step);
});

it('refuse un brouillon à clé invalide ou reprise d’une question', () => {
  expect(() =>
    defineStep({ id: 'demo', questions: [], draft: { key: 'Demo', kind: 'email' } }),
  ).toThrow(/brouillon/);
  expect(() =>
    defineStep({
      id: 'demo',
      questions: [q.shortText('demo.one')],
      draft: { key: 'demo.one', kind: 'email' },
    }),
  ).toThrow(/brouillon/);
});
```

Ajouter à `apps/web/src/journey/registry.test.ts` (nouveau `describe`) :

```ts
describe('assertUniqueSteps et brouillons', () => {
  it('refuse une clé de brouillon déjà utilisée par une autre étape', () => {
    const a: Step = { id: 'a', questions: [], draft: { key: 'shared.text', kind: 'email' } };
    const b: Step = { id: 'b', questions: [{ kind: 'shortText', key: 'shared.text' }] };
    expect(() => assertUniqueSteps([a, b])).toThrow(/shared\.text/);
  });
});
```

Ajouter à `apps/web/src/journey/types-limits.test.ts` (et `DRAFT_MAX`, `draftTextSchema` à
l'import depuis `./types`) :

```ts
describe('draftTextSchema', () => {
  it('nettoie le texte et le borne à DRAFT_MAX', () => {
    expect(draftTextSchema.parse('  Bonjour  ')).toBe('Bonjour');
    expect(draftTextSchema.safeParse('   ').success).toBe(false);
    expect(draftTextSchema.safeParse('x'.repeat(DRAFT_MAX)).success).toBe(true);
    expect(draftTextSchema.safeParse('x'.repeat(DRAFT_MAX + 1)).success).toBe(false);
    expect(draftTextSchema.safeParse('a\u0000b').success).toBe(false);
  });
});
```

- [ ] **Étape 2 : lancer les tests, constater l'échec**

Run: `cd apps/web && pnpm vitest run src/journey`
Expected: FAIL (`draftTextSchema` inconnu, brouillon non validé, clé partagée non détectée).

- [ ] **Étape 3 : écrire le code**

Dans `apps/web/src/journey/types.ts`, après `MIN_YEAR` :

```ts
/** Taille maximale d'un brouillon (corps d'annonce compris), sous la borne de 60 000 octets. */
export const DRAFT_MAX = 12_000;
```

et juste après la définition existante de `noNul` :

```ts
/** Texte d'un brouillon enregistré : nettoyé, non vide, borné, sans caractère NUL. */
export const draftTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(DRAFT_MAX)
  .refine(noNul, 'invalid character');
```

Dans `apps/web/src/journey/define.ts`, à la fin de `defineStep` (juste avant `return step;`) :

```ts
if (step.draft) {
  const { key } = step.draft;
  if (!ANSWER_KEY_PATTERN.test(key) || seen.has(key)) {
    throw new Error(`Étape ${step.id} : clé de brouillon invalide « ${key} »`);
  }
}
```

Dans `apps/web/src/journey/registry.ts`, dans `assertUniqueSteps`, après la boucle sur
`step.questions` :

```ts
if (step.draft) {
  const owner = keys.get(step.draft.key);
  if (owner !== undefined) {
    throw new Error(
      `Registre : clé « ${step.draft.key} » présente dans les étapes ${owner} et ${step.id}`,
    );
  }
  keys.set(step.draft.key, step.id);
}
```

Mettre à jour le commentaire de `assertUniqueSteps` : « … aucun `id` d'étape ni aucune clé de
question ou de brouillon n'apparaît deux fois ».

- [ ] **Étape 4 : lancer les tests**

Run: `cd apps/web && pnpm vitest run src/journey`
Expected: PASS.

- [ ] **Étape 5 : commit**

```bash
git add apps/web/src/journey/types.ts apps/web/src/journey/define.ts apps/web/src/journey/registry.ts apps/web/src/journey/define.test.ts apps/web/src/journey/registry.test.ts apps/web/src/journey/types-limits.test.ts
git commit -m "feat(journey): let a step carry a draft text"
```

---

### Tâche 3 : étapes 2.1, 2.2 et 2.3

**Fichiers :**

- Créer : `apps/web/src/journey/options.ts`, `apps/web/src/journey/steps/2-1-broadcast-list.ts`,
  `apps/web/src/journey/steps/2-2-immediate-message.ts`,
  `apps/web/src/journey/steps/2-3-email-announcement.ts`
- Modifier : `apps/web/src/journey/registry.ts`, `apps/web/src/journey/registry.test.ts`,
  `apps/web/e2e/journey.spec.ts`

- [ ] **Étape 1 : écrire les tests qui échouent**

Dans `apps/web/src/journey/registry.test.ts`, remplacer le premier test (« propose la biographie
aux portes décès et préparer ») par :

```ts
it('annonce d’abord, puis raconte, pour la porte décès', () => {
  expect(stepsFor('death').map((s) => s.id)).toEqual([
    'broadcast-list',
    'immediate-message',
    'email-announcement',
    'biography',
  ]);
  expect(stepsFor('prepare').map((s) => s.id)).toEqual(['biography']);
  expect(stepsFor('after')).toEqual([]);
  expect(isStepOpen('prepare', 'immediate-message')).toBe(false);
  expect(isStepOpen('death', 'biography')).toBe(true);
});

it('pose les questions des étapes 2.x avec les clés de la spec', () => {
  expect(getStep('broadcast-list')?.questions.map((q) => q.key)).toEqual(['broadcast.contacts']);
  expect(getStep('immediate-message')?.questions.map((q) => q.key)).toEqual([
    'death.date',
    'death.mentionCause',
    'announce.tone',
  ]);
  expect(getStep('email-announcement')?.questions.map((q) => q.key)).toEqual([
    'announce.aboutPerson',
    'announce.practicalInfo',
    'announce.flowersOrDonations',
  ]);
});

it('associe un brouillon WhatsApp à 2.2 et un brouillon e-mail à 2.3', () => {
  expect(getStep('immediate-message')?.draft).toEqual({
    key: 'announce.whatsapp.text',
    kind: 'whatsapp',
  });
  expect(getStep('email-announcement')?.draft).toEqual({
    key: 'announce.email.text',
    kind: 'email',
  });
  expect(getStep('broadcast-list')?.draft).toBeUndefined();
});

it('décrit chaque contact de la liste de diffusion', () => {
  const contacts = findQuestion('broadcast.contacts')?.question;
  expect(contacts).toMatchObject({ kind: 'list', maxItems: 80 });
  expect(contacts?.kind === 'list' && contacts.fields.map((f) => [f.name, f.kind])).toEqual([
    ['name', 'shortText'],
    ['phone', 'shortText'],
    ['circle', 'choice'],
    ['caller', 'shortText'],
    ['priority', 'boolean'],
  ]);
});
```

- [ ] **Étape 2 : lancer le test, constater l'échec**

Run: `cd apps/web && pnpm vitest run src/journey/registry.test.ts`
Expected: FAIL (étapes 2.x absentes).

- [ ] **Étape 3 : écrire les options et les étapes**

`apps/web/src/journey/options.ts` :

```ts
/** Cercles d'une personne à prévenir (spec, section 2). */
export const CIRCLES = [
  'close_family',
  'extended_family',
  'colleagues',
  'parish',
  'village',
  'other',
] as const;

/** Circonstances du décès que l'on accepte de mentionner, toujours formulées avec tact. */
export const CAUSES = ['none', 'illness', 'sudden', 'accident'] as const;
export type Cause = (typeof CAUSES)[number];

/** Tons des annonces (spec, section 2). */
export const TONES = ['believer', 'neutral'] as const;
export type Tone = (typeof TONES)[number];

/** Préférence de la famille pour les fleurs et les dons. */
export const FLOWERS = ['flowers', 'donations', 'both', 'noPreference'] as const;
export type Flowers = (typeof FLOWERS)[number];
```

`apps/web/src/journey/steps/2-1-broadcast-list.ts` :

```ts
import { defineStep, q } from '../define';
import { CIRCLES } from '../options';

/** Étape 2.1 : qui prévenir, et quel membre de la famille s'en charge. */
export const broadcastListStep = defineStep({
  id: 'broadcast-list',
  questions: [
    q.list(
      'broadcast.contacts',
      [
        { name: 'name', kind: 'shortText', required: true },
        { name: 'phone', kind: 'shortText' },
        { name: 'circle', kind: 'choice', options: CIRCLES },
        { name: 'caller', kind: 'shortText' },
        { name: 'priority', kind: 'boolean' },
      ],
      // WHY: 80 contacts complets restent sous la borne de 60 000 octets d'une réponse.
      80,
    ),
  ],
});
```

`apps/web/src/journey/steps/2-2-immediate-message.ts` :

```ts
import { defineStep, q } from '../define';
import { CAUSES, TONES } from '../options';

/** Étape 2.2 : le message immédiat, partagé par WhatsApp ou SMS. */
export const immediateMessageStep = defineStep({
  id: 'immediate-message',
  questions: [
    q.date('death.date'),
    q.choice('death.mentionCause', CAUSES),
    q.choice('announce.tone', TONES),
  ],
  draft: { key: 'announce.whatsapp.text', kind: 'whatsapp' },
});
```

`apps/web/src/journey/steps/2-3-email-announcement.ts` :

```ts
import { defineStep, q } from '../define';
import { FLOWERS } from '../options';

/** Étape 2.3 : l'annonce par e-mail, copiée dans la messagerie de la famille. */
export const emailAnnouncementStep = defineStep({
  id: 'email-announcement',
  questions: [
    q.longText('announce.aboutPerson'),
    q.longText('announce.practicalInfo'),
    q.choice('announce.flowersOrDonations', FLOWERS),
  ],
  draft: { key: 'announce.email.text', kind: 'email' },
});
```

Dans `apps/web/src/journey/registry.ts`, importer les trois étapes et remplacer
`STEPS_BY_ENTRY` :

```ts
import { biographyStep } from './steps/1-6-biography';
import { broadcastListStep } from './steps/2-1-broadcast-list';
import { immediateMessageStep } from './steps/2-2-immediate-message';
import { emailAnnouncementStep } from './steps/2-3-email-announcement';

/**
 * Étapes proposées, dans l'ordre, selon la porte d'entrée du dossier.
 * WHY: après un décès, prévenir est plus urgent que raconter : les annonces passent avant la
 * biographie.
 */
const STEPS_BY_ENTRY: Record<EntryPoint, readonly Step[]> = {
  death: [broadcastListStep, immediateMessageStep, emailAnnouncementStep, biographyStep],
  prepare: [biographyStep],
  after: [],
};
```

- [ ] **Étape 4 : adapter l'e2e du parcours**

Dans `apps/web/e2e/journey.spec.ts`, la porte « décès » ouvre désormais la liste de diffusion en
premier. Le test vise la biographie : passer par la porte « préparer ». Remplacer
`'/login?next=%2Fdossier%2Fnouveau%3Fporte%3Ddeces'` par
`'/login?next=%2Fdossier%2Fnouveau%3Fporte%3Dpreparer'`. Le reste ne change pas (même assistant,
même relation « Enfant », la carte « Répondre » mène à `biography?q=0`).

- [ ] **Étape 5 : lancer les tests**

Run: `cd apps/web && pnpm vitest run src/journey/registry.test.ts && pnpm --filter @testimona/web typecheck`
Expected: PASS. `messages.test.ts` échoue encore (textes des nouvelles étapes) : c'est attendu, la
tâche 5 les ajoute. Le signaler dans le rapport.

- [ ] **Étape 6 : commit**

```bash
git add apps/web/src/journey/options.ts apps/web/src/journey/steps apps/web/src/journey/registry.ts apps/web/src/journey/registry.test.ts apps/web/e2e/journey.spec.ts
git commit -m "feat(journey): add the broadcast list, immediate message and e-mail steps"
```

---

### Tâche 4 : modèles de texte

**Fichiers :**

- Créer : `apps/web/src/journey/templates/common.ts`,
  `apps/web/src/journey/templates/immediate-message.ts`,
  `apps/web/src/journey/templates/email-announcement.ts`, `apps/web/src/journey/templates/index.ts`
- Test : `apps/web/src/journey/templates/immediate-message.test.ts`,
  `apps/web/src/journey/templates/email-announcement.test.ts`

- [ ] **Étape 1 : écrire les tests qui échouent**

`apps/web/src/journey/templates/immediate-message.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { immediateMessage } from './immediate-message';

const person = { firstName: 'Jean', lastName: 'Ndong', nickname: null };

describe('immediateMessage', () => {
  it('rédige le message croyant complet en français', () => {
    const text = immediateMessage({
      locale: 'fr',
      person,
      answers: {
        'death.date': '2026-03-03',
        'death.mentionCause': 'illness',
        'announce.tone': 'believer',
      },
    });
    expect(text).toBe(
      [
        'C’est avec une immense tristesse que nous vous annonçons le décès de Jean Ndong, survenu le 3 mars 2026 des suites d’une maladie.',
        'Que Dieu l’accueille dans sa paix.',
        'Nous vous communiquerons très vite les informations sur les obsèques.',
        'Merci de vos prières pour notre famille.',
        '— La famille Ndong',
      ].join('\n\n'),
    );
  });

  it('reste neutre et sobre sans réponses', () => {
    expect(immediateMessage({ locale: 'fr', person, answers: {} })).toBe(
      [
        'C’est avec une immense tristesse que nous vous annonçons le décès de Jean Ndong.',
        'Nous vous communiquerons très vite les informations sur les obsèques.',
        'Merci de vos pensées pour notre famille.',
        '— La famille Ndong',
      ].join('\n\n'),
    );
  });

  it('ignore les réponses passées, inconnues ou « ne pas mentionner »', () => {
    const text = immediateMessage({
      locale: 'fr',
      person,
      answers: {
        'death.date': { skipped: true },
        'death.mentionCause': 'none',
        'announce.tone': 'joyful',
      },
    });
    expect(text.split('\n\n')[0]).toBe(
      'C’est avec une immense tristesse que nous vous annonçons le décès de Jean Ndong.',
    );
    expect(text).toContain('Merci de vos pensées');
  });

  it('cite le surnom et rédige en anglais', () => {
    const text = immediateMessage({
      locale: 'en',
      person: { ...person, nickname: 'Papa Jean' },
      answers: { 'death.date': '2026-03-03', 'death.mentionCause': 'sudden' },
    });
    expect(text.split('\n\n')[0]).toBe(
      'It is with great sadness that we announce the passing of Jean Ndong ("Papa Jean"), on 3 March 2026, suddenly.',
    );
    expect(text.endsWith('— The Ndong family')).toBe(true);
  });

  it('mentionne la circonstance sans date', () => {
    const text = immediateMessage({
      locale: 'fr',
      person,
      answers: { 'death.mentionCause': 'accident' },
    });
    expect(text.split('\n\n')[0]).toBe(
      'C’est avec une immense tristesse que nous vous annonçons le décès de Jean Ndong, survenu des suites d’un accident.',
    );
  });
});
```

`apps/web/src/journey/templates/email-announcement.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { emailAnnouncement, emailSubject } from './email-announcement';

const person = { firstName: 'Jean', lastName: 'Ndong', nickname: null };

describe('emailAnnouncement', () => {
  it('assemble tous les paragraphes disponibles en français', () => {
    const text = emailAnnouncement({
      locale: 'fr',
      person,
      answers: {
        'death.date': '2026-03-03',
        'announce.tone': 'believer',
        'announce.aboutPerson': 'Instituteur aimé de tout Lambaréné.',
        'announce.practicalInfo': 'Veillée le 6 mars à Libreville, inhumation le 7 à Lambaréné.',
        'announce.flowersOrDonations': 'donations',
      },
    });
    expect(text).toBe(
      [
        'Chers parents, chers amis,',
        'C’est avec une profonde tristesse que nous vous faisons part du décès de Jean Ndong, survenu le 3 mars 2026.',
        'Instituteur aimé de tout Lambaréné.',
        'Veillée le 6 mars à Libreville, inhumation le 7 à Lambaréné.',
        'Plutôt que des fleurs, la famille recevra avec reconnaissance vos dons.',
        'Nous vous remercions de vos prières et de votre soutien.',
        'La famille Ndong',
      ].join('\n\n'),
    );
  });

  it('omet les paragraphes sans réponse et « pas de préférence »', () => {
    const text = emailAnnouncement({
      locale: 'fr',
      person,
      answers: { 'announce.flowersOrDonations': 'noPreference', 'announce.aboutPerson': '   ' },
    });
    expect(text).toBe(
      [
        'Chers parents, chers amis,',
        'C’est avec une profonde tristesse que nous vous faisons part du décès de Jean Ndong.',
        'Nous vous remercions de vos pensées et de votre soutien.',
        'La famille Ndong',
      ].join('\n\n'),
    );
  });

  it('rédige en anglais', () => {
    const text = emailAnnouncement({
      locale: 'en',
      person,
      answers: { 'announce.flowersOrDonations': 'both' },
    });
    expect(text).toContain('Dear family and friends,');
    expect(text).toContain('Flowers and donations will be gratefully received.');
    expect(text.endsWith('The Ndong family')).toBe(true);
  });
});

describe('emailSubject', () => {
  it('nomme la personne dans les deux langues', () => {
    expect(emailSubject({ locale: 'fr', person, answers: {} })).toBe('Décès de Jean Ndong');
    expect(emailSubject({ locale: 'en', person, answers: {} })).toBe('Passing of Jean Ndong');
  });
});
```

- [ ] **Étape 2 : lancer les tests, constater l'échec**

Run: `cd apps/web && pnpm vitest run src/journey/templates`
Expected: FAIL (modules absents).

- [ ] **Étape 3 : écrire le code**

`apps/web/src/journey/templates/common.ts` :

```ts
import { CAUSES, TONES, type Cause, type Tone } from '../options';
import type { Answers } from '../progress';

export type TemplateLocale = 'fr' | 'en';

export interface PersonNames {
  firstName: string;
  lastName: string;
  nickname: string | null;
}

/** Ce dont un modèle a besoin : langue, personne, et réponses du dossier (toutes étapes). */
export interface DraftContext {
  locale: TemplateLocale;
  person: PersonNames;
  answers: Answers;
}

/** Réponse texte utilisable : chaîne non vide (une réponse passée ou absente donne null). */
export function textAnswer(answers: Answers, key: string): string | null {
  const value = answers[key];
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text === '' ? null : text;
}

/** Réponse de choix utilisable : une des options attendues, sinon null. */
export function choiceAnswer<T extends string>(
  answers: Answers,
  key: string,
  options: readonly T[],
): T | null {
  const value = answers[key];
  return typeof value === 'string' && (options as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

export function fullName(person: PersonNames): string {
  return `${person.firstName} ${person.lastName}`.trim();
}

/** Date AAAA-MM-JJ en toutes lettres (« 3 mars 2026 », « 3 March 2026 »), sinon null. */
export function formatDate(iso: string | null, locale: TemplateLocale): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(locale === 'fr' ? 'fr-FR' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** Ton choisi en 2.2 ; neutre par défaut. */
export function toneOf(answers: Answers): Tone {
  return choiceAnswer(answers, 'announce.tone', TONES) ?? 'neutral';
}

const CAUSE_TEXT: Record<TemplateLocale, Record<Exclude<Cause, 'none'>, string>> = {
  fr: {
    illness: 'des suites d’une maladie',
    sudden: 'de manière soudaine',
    accident: 'des suites d’un accident',
  },
  en: { illness: 'after an illness', sudden: 'suddenly', accident: 'following an accident' },
};

/**
 * Phrase d'annonce du décès : `<ouverture> <nom>[, survenu le <date> <circonstance>].`
 * WHY: date et circonstance sont facultatives ; la phrase reste correcte avec l'une, l'autre ou
 * aucune.
 */
export function deathSentence(ctx: DraftContext, opening: string): string {
  const { locale, person, answers } = ctx;
  const nick = person.nickname
    ? locale === 'fr'
      ? ` (« ${person.nickname} »)`
      : ` ("${person.nickname}")`
    : '';
  const date = formatDate(textAnswer(answers, 'death.date'), locale);
  const cause = choiceAnswer(answers, 'death.mentionCause', CAUSES);
  const causeText = cause && cause !== 'none' ? CAUSE_TEXT[locale][cause] : null;
  let suffix = '';
  if (locale === 'fr') {
    const parts = [date ? `le ${date}` : null, causeText].filter(Boolean);
    if (parts.length > 0) suffix = `, survenu ${parts.join(' ')}`;
  } else {
    const parts = [date ? `on ${date}` : null, causeText].filter(Boolean);
    if (parts.length > 0) suffix = `, ${parts.join(', ')}`;
  }
  return `${opening} ${fullName(person)}${nick}${suffix}.`;
}

/** Paragraphes non vides, séparés par une ligne blanche. */
export function paragraphs(parts: readonly (string | null)[]): string {
  return parts.filter((p): p is string => typeof p === 'string' && p !== '').join('\n\n');
}
```

`apps/web/src/journey/templates/immediate-message.ts` :

```ts
import { deathSentence, paragraphs, toneOf, type DraftContext } from './common';

const TEXT = {
  fr: {
    opening: 'C’est avec une immense tristesse que nous vous annonçons le décès de',
    blessing: 'Que Dieu l’accueille dans sa paix.',
    next: 'Nous vous communiquerons très vite les informations sur les obsèques.',
    thanks: {
      believer: 'Merci de vos prières pour notre famille.',
      neutral: 'Merci de vos pensées pour notre famille.',
    },
    signature: (lastName: string) => `La famille ${lastName}`,
  },
  en: {
    opening: 'It is with great sadness that we announce the passing of',
    blessing: 'May God grant them eternal rest.',
    next: 'We will share the funeral arrangements very soon.',
    thanks: {
      believer: 'Thank you for your prayers for our family.',
      neutral: 'Thank you for your thoughts for our family.',
    },
    signature: (lastName: string) => `The ${lastName} family`,
  },
} as const;

/**
 * Message immédiat (2.2), à partager par WhatsApp ou SMS. Tolère toute réponse manquante.
 *
 * @example
 * immediateMessage({ locale: 'fr', person, answers }) // « C’est avec une immense tristesse… »
 */
export function immediateMessage(ctx: DraftContext): string {
  const t = TEXT[ctx.locale];
  const tone = toneOf(ctx.answers);
  return paragraphs([
    deathSentence(ctx, t.opening),
    tone === 'believer' ? t.blessing : null,
    t.next,
    t.thanks[tone],
    `— ${t.signature(ctx.person.lastName)}`,
  ]);
}
```

`apps/web/src/journey/templates/email-announcement.ts` :

```ts
import { FLOWERS } from '../options';
import {
  choiceAnswer,
  deathSentence,
  fullName,
  paragraphs,
  textAnswer,
  toneOf,
  type DraftContext,
} from './common';

const TEXT = {
  fr: {
    greeting: 'Chers parents, chers amis,',
    opening: 'C’est avec une profonde tristesse que nous vous faisons part du décès de',
    flowers: {
      flowers: 'Les fleurs seront les bienvenues.',
      donations: 'Plutôt que des fleurs, la famille recevra avec reconnaissance vos dons.',
      both: 'Fleurs et dons seront reçus avec reconnaissance.',
    },
    thanks: {
      believer: 'Nous vous remercions de vos prières et de votre soutien.',
      neutral: 'Nous vous remercions de vos pensées et de votre soutien.',
    },
    signature: (lastName: string) => `La famille ${lastName}`,
    subject: (name: string) => `Décès de ${name}`,
  },
  en: {
    greeting: 'Dear family and friends,',
    opening: 'It is with deep sadness that we share the news of the passing of',
    flowers: {
      flowers: 'Flowers are welcome.',
      donations: 'In lieu of flowers, the family will gratefully receive donations.',
      both: 'Flowers and donations will be gratefully received.',
    },
    thanks: {
      believer: 'Thank you for your prayers and support.',
      neutral: 'Thank you for your thoughts and support.',
    },
    signature: (lastName: string) => `The ${lastName} family`,
    subject: (name: string) => `Passing of ${name}`,
  },
} as const;

/**
 * Corps de l'annonce par e-mail (2.3) : salutation, annonce, quelques mots sur la personne,
 * informations pratiques, fleurs ou dons, remerciements, signature. Tolère toute réponse manquante.
 */
export function emailAnnouncement(ctx: DraftContext): string {
  const t = TEXT[ctx.locale];
  const flowers = choiceAnswer(ctx.answers, 'announce.flowersOrDonations', FLOWERS);
  return paragraphs([
    t.greeting,
    deathSentence(ctx, t.opening),
    textAnswer(ctx.answers, 'announce.aboutPerson'),
    textAnswer(ctx.answers, 'announce.practicalInfo'),
    flowers && flowers !== 'noPreference' ? t.flowers[flowers] : null,
    t.thanks[toneOf(ctx.answers)],
    t.signature(ctx.person.lastName),
  ]);
}

/** Objet de l'annonce par e-mail (recalculé, jamais enregistré). */
export function emailSubject(ctx: DraftContext): string {
  return TEXT[ctx.locale].subject(fullName(ctx.person));
}
```

`apps/web/src/journey/templates/index.ts` :

```ts
import type { DraftKind } from '../types';
import type { DraftContext } from './common';
import { emailAnnouncement } from './email-announcement';
import { immediateMessage } from './immediate-message';

export type { DraftContext, TemplateLocale } from './common';
export { emailSubject } from './email-announcement';

/** Brouillon proposé pour un type de brouillon, à partir des réponses du dossier. */
export function draftFor(kind: DraftKind, ctx: DraftContext): string {
  return kind === 'whatsapp' ? immediateMessage(ctx) : emailAnnouncement(ctx);
}
```

- [ ] **Étape 4 : lancer les tests**

Run: `cd apps/web && pnpm vitest run src/journey/templates`
Expected: PASS (9 tests). Node 20+ embarque l'ICU complet ; si une date sort autrement
(« 3 mars 2026 »), le signaler au lieu de modifier le test.

- [ ] **Étape 5 : commit**

```bash
git add apps/web/src/journey/templates
git commit -m "feat(journey): add immediate message and e-mail announcement templates"
```

---

### Tâche 5 : textes FR/EN des annonces

**Fichiers :**

- Modifier : `apps/web/messages/fr.json`, `apps/web/messages/en.json`

- [ ] **Étape 1 : ajouter les textes FR**

Dans `apps/web/messages/fr.json`, sous `journey.steps`, ajouter :

```json
"broadcast-list": {
  "title": "La liste de diffusion",
  "description": "Qui prévenir, et qui s'en charge. La liste reste privée au dossier."
},
"immediate-message": {
  "title": "Le message immédiat",
  "description": "Un court message à envoyer par WhatsApp ou SMS dès les premières heures."
},
"email-announcement": {
  "title": "L'annonce par e-mail",
  "description": "Une annonce plus complète, à copier dans votre messagerie."
}
```

Sous `journey.q`, ajouter :

```json
"broadcast": {
  "contacts": {
    "title": "Qui faut-il prévenir ?",
    "hint": "Ajoutez les personnes à appeler ou à qui écrire, avec leur cercle et le membre de la famille qui s'en charge.",
    "fields": {
      "name": { "label": "Nom" },
      "phone": { "label": "Téléphone (facultatif)" },
      "circle": {
        "label": "Cercle",
        "options": {
          "close_family": "Famille proche",
          "extended_family": "Famille élargie",
          "colleagues": "Collègues",
          "parish": "Paroisse ou communauté",
          "village": "Village",
          "other": "Autre"
        }
      },
      "caller": { "label": "Qui l'appelle (facultatif)" },
      "priority": { "label": "À appeler en priorité" }
    }
  }
},
"death": {
  "date": {
    "title": "Date du décès de {name}",
    "hint": "Elle figurera dans les annonces."
  },
  "mentionCause": {
    "title": "Souhaitez-vous mentionner les circonstances du décès ?",
    "hint": "Facultatif : vous pouvez rester discret.",
    "options": {
      "none": "Ne pas les mentionner",
      "illness": "Des suites d'une maladie",
      "sudden": "De manière soudaine",
      "accident": "Des suites d'un accident"
    }
  }
},
"announce": {
  "tone": {
    "title": "Quel ton souhaitez-vous pour les annonces ?",
    "hint": "Les textes proposés s'adapteront ; vous pourrez toujours les modifier.",
    "options": { "believer": "Croyant", "neutral": "Neutre" }
  },
  "aboutPerson": {
    "title": "Quelques mots sur {name} pour l'annonce",
    "hint": "Ce qui caractérisait {name}, ce que l'on retiendra : deux ou trois phrases suffisent."
  },
  "practicalInfo": {
    "title": "Informations pratiques",
    "hint": "Veillée, levée du corps, messe ou cérémonie, inhumation : dates, heures et lieux connus."
  },
  "flowersOrDonations": {
    "title": "Fleurs ou dons ?",
    "hint": "Indiquez la préférence de la famille.",
    "options": {
      "flowers": "Fleurs bienvenues",
      "donations": "Dons plutôt que fleurs",
      "both": "Fleurs et dons",
      "noPreference": "Pas de préférence"
    }
  }
}
```

Sous `journey`, ajouter :

```json
"draft": {
  "title": { "whatsapp": "Votre message immédiat", "email": "Votre annonce par e-mail" },
  "intro": {
    "whatsapp": "Voici un texte préparé à partir de vos réponses. Modifiez-le librement, puis partagez-le.",
    "email": "Voici un texte préparé à partir de vos réponses. Modifiez-le librement, puis copiez-le dans votre messagerie."
  },
  "subject": "Objet",
  "body": "Texte",
  "save": "Enregistrer",
  "saved": "Texte enregistré.",
  "unsaved": "Modifications non enregistrées.",
  "copy": "Copier le texte",
  "copySubject": "Copier l'objet",
  "copied": "Copié.",
  "copyManual": "Le texte est sélectionné : copiez-le avec votre appareil.",
  "shareWhatsapp": "Partager sur WhatsApp",
  "openMail": "Ouvrir dans ma messagerie",
  "regenerate": "Repartir des réponses",
  "editAnswers": "Modifier les réponses",
  "backToDossier": "Retour au dossier",
  "readOnly": "Vous pouvez lire et copier ce texte ; seuls les contributeurs peuvent le modifier."
}
```

Sous `journey.dashboard`, ajouter `"viewDraft": "Voir le brouillon"`.

- [ ] **Étape 2 : ajouter les textes EN**

Même structure dans `apps/web/messages/en.json` :

```json
"broadcast-list": {
  "title": "Who to tell",
  "description": "Who to tell, and who will reach them. The list stays private to the family space."
},
"immediate-message": {
  "title": "The first message",
  "description": "A short message to send by WhatsApp or text in the first hours."
},
"email-announcement": {
  "title": "The e-mail announcement",
  "description": "A fuller announcement to copy into your e-mail."
}
```

```json
"broadcast": {
  "contacts": {
    "title": "Who needs to be told?",
    "hint": "Add the people to call or write to, with their circle and the family member who will reach them.",
    "fields": {
      "name": { "label": "Name" },
      "phone": { "label": "Phone (optional)" },
      "circle": {
        "label": "Circle",
        "options": {
          "close_family": "Close family",
          "extended_family": "Extended family",
          "colleagues": "Colleagues",
          "parish": "Parish or community",
          "village": "Village",
          "other": "Other"
        }
      },
      "caller": { "label": "Who will call (optional)" },
      "priority": { "label": "Call first" }
    }
  }
},
"death": {
  "date": {
    "title": "When did {name} pass away?",
    "hint": "It will appear in the announcements."
  },
  "mentionCause": {
    "title": "Would you like to mention the circumstances?",
    "hint": "Optional: you can stay discreet.",
    "options": {
      "none": "Do not mention them",
      "illness": "After an illness",
      "sudden": "Suddenly",
      "accident": "Following an accident"
    }
  }
},
"announce": {
  "tone": {
    "title": "Which tone would you like for the announcements?",
    "hint": "The suggested texts will adapt; you can always edit them.",
    "options": { "believer": "With faith", "neutral": "Neutral" }
  },
  "aboutPerson": {
    "title": "A few words about {name} for the announcement",
    "hint": "What defined {name}, what people will remember: two or three sentences are enough."
  },
  "practicalInfo": {
    "title": "Practical information",
    "hint": "Wake, viewing, service, burial: known dates, times and places."
  },
  "flowersOrDonations": {
    "title": "Flowers or donations?",
    "hint": "State the family's preference.",
    "options": {
      "flowers": "Flowers welcome",
      "donations": "Donations instead of flowers",
      "both": "Flowers and donations",
      "noPreference": "No preference"
    }
  }
}
```

```json
"draft": {
  "title": { "whatsapp": "Your first message", "email": "Your e-mail announcement" },
  "intro": {
    "whatsapp": "Here is a text prepared from your answers. Edit it freely, then share it.",
    "email": "Here is a text prepared from your answers. Edit it freely, then copy it into your e-mail."
  },
  "subject": "Subject",
  "body": "Text",
  "save": "Save",
  "saved": "Text saved.",
  "unsaved": "Unsaved changes.",
  "copy": "Copy the text",
  "copySubject": "Copy the subject",
  "copied": "Copied.",
  "copyManual": "The text is selected: copy it with your device.",
  "shareWhatsapp": "Share on WhatsApp",
  "openMail": "Open in my e-mail",
  "regenerate": "Start again from the answers",
  "editAnswers": "Edit the answers",
  "backToDossier": "Back to the family space",
  "readOnly": "You can read and copy this text; only contributors can change it."
}
```

et `"viewDraft": "View the draft"` sous `journey.dashboard`.

- [ ] **Étape 3 : vérifier**

Run (depuis la racine) :

```bash
node -e "const f=require('./apps/web/messages/fr.json'),e=require('./apps/web/messages/en.json');const k=(o,p='')=>Object.entries(o).flatMap(([n,v])=>typeof v==='object'?k(v,p+n+'.'):[p+n]);const a=k(f).sort().join('\n'),b=k(e).sort().join('\n');console.log(a===b?'identiques':'DIFFÉRENTES')"
cd apps/web && pnpm vitest run src/journey/messages.test.ts && cd ../.. && pnpm format:check
```

Expected: `identiques` ; `messages.test.ts` PASS (FR et EN) ; format vert. Vérifier aussi les
messages ICU avec `intl-messageformat` (présent dans `node_modules/.pnpm`) : formater chaque titre
et indice de `journey.q.*` avec `{ name: 'Jean', status: 'deceased' }`, sans erreur.

- [ ] **Étape 4 : commit**

```bash
git add apps/web/messages/fr.json apps/web/messages/en.json
git commit -m "feat(i18n): add announcement steps, options and draft texts"
```

---

### Tâche 6 : service et action des brouillons

**Fichiers :**

- Modifier : `apps/web/src/modules/dossier/answers/service.ts`,
  `apps/web/src/modules/dossier/answers/actions.ts`
- Test : `apps/web/src/modules/dossier/answers/draft.test.ts`

- [ ] **Étape 1 : écrire le test qui échoue**

`apps/web/src/modules/dossier/answers/draft.test.ts` :

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

// WHY: vi.mock est remonté en tête de fichier ; les doublures sont créées avec vi.hoisted.
const { answersRepo, dossierRepo } = vi.hoisted(() => ({
  answersRepo: { upsertAnswer: vi.fn(), listAnswers: vi.fn() },
  dossierRepo: { getDossier: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('./repo', () => answersRepo);
vi.mock('../repo', () => dossierRepo);
vi.mock('@/lib/email/resend', () => ({ sendEmail: vi.fn(), dossierInviteEmail: vi.fn() }));

const { saveAnswer, saveDraft } = await import('./service');

const DOSSIER = '44444444-4444-4444-8444-444444444444';
const dossier = (entryPoint: 'death' | 'prepare') => ({
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

describe('saveDraft', () => {
  it('enregistre le texte nettoyé sous la clé du brouillon de l’étape', async () => {
    const res = await saveDraft({
      dossierId: DOSSIER,
      stepId: 'immediate-message',
      text: '  Bonjour  ',
    });
    expect(res).toEqual({ ok: true, data: { key: 'announce.whatsapp.text' } });
    expect(answersRepo.upsertAnswer).toHaveBeenCalledWith({
      dossierId: DOSSIER,
      key: 'announce.whatsapp.text',
      value: 'Bonjour',
    });
  });

  it('refuse une étape inconnue ou sans brouillon', async () => {
    for (const stepId of ['nope', 'biography', 'broadcast-list']) {
      expect(await saveDraft({ dossierId: DOSSIER, stepId, text: 'x' })).toEqual({
        ok: false,
        error: 'validation',
      });
    }
    expect(dossierRepo.getDossier).not.toHaveBeenCalled();
  });

  it('refuse un texte vide ou trop long', async () => {
    const empty = await saveDraft({ dossierId: DOSSIER, stepId: 'email-announcement', text: ' ' });
    expect(empty).toMatchObject({ ok: false, error: 'validation' });
    const long = await saveDraft({
      dossierId: DOSSIER,
      stepId: 'email-announcement',
      text: 'x'.repeat(12_001),
    });
    expect(long).toMatchObject({ ok: false, error: 'validation' });
    expect(answersRepo.upsertAnswer).not.toHaveBeenCalled();
  });

  it('refuse un dossier inaccessible ou une étape fermée pour sa porte', async () => {
    dossierRepo.getDossier.mockResolvedValueOnce(null);
    expect(await saveDraft({ dossierId: DOSSIER, stepId: 'immediate-message', text: 'x' })).toEqual(
      { ok: false, error: 'not_found' },
    );
    dossierRepo.getDossier.mockResolvedValueOnce(dossier('prepare'));
    expect(await saveDraft({ dossierId: DOSSIER, stepId: 'immediate-message', text: 'x' })).toEqual(
      { ok: false, error: 'validation' },
    );
    expect(answersRepo.upsertAnswer).not.toHaveBeenCalled();
  });

  it('traduit le refus RLS d’un lecteur en « forbidden »', async () => {
    answersRepo.upsertAnswer.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'x' },
    });
    expect(await saveDraft({ dossierId: DOSSIER, stepId: 'immediate-message', text: 'x' })).toEqual(
      { ok: false, error: 'forbidden' },
    );
  });

  it('ne laisse pas saveAnswer écrire une clé de brouillon', async () => {
    expect(
      await saveAnswer({ dossierId: DOSSIER, key: 'announce.whatsapp.text', value: 'x' }),
    ).toEqual({ ok: false, error: 'validation' });
    expect(answersRepo.upsertAnswer).not.toHaveBeenCalled();
  });
});
```

- [ ] **Étape 2 : lancer le test, constater l'échec**

Run: `cd apps/web && pnpm vitest run src/modules/dossier/answers/draft.test.ts`
Expected: FAIL (`saveDraft` n'existe pas).

- [ ] **Étape 3 : écrire `saveDraft`**

Dans `apps/web/src/modules/dossier/answers/service.ts`, compléter les imports :

```ts
import { findQuestion, getStep, isStepOpen } from '@/journey/registry';
import { answerSchema, draftTextSchema, isSkipped, SKIPPED } from '@/journey/types';
```

puis ajouter à la fin du fichier :

```ts
const SaveDraftInputSchema = z.object({
  dossierId: z.string().uuid(),
  stepId: z.string().max(50),
  text: z.string(),
});

/**
 * Enregistre le brouillon d'une étape (message immédiat, annonce par e-mail) sous sa clé.
 * Refuse une étape sans brouillon, fermée pour la porte du dossier, ou un texte vide ou trop long.
 *
 * @example
 * await saveDraft({ dossierId, stepId: 'immediate-message', text });
 */
export async function saveDraft(raw: unknown): Promise<Result<{ key: string }>> {
  const input = SaveDraftInputSchema.safeParse(raw);
  if (!input.success) return { ok: false, error: 'validation' };
  const { dossierId, stepId } = input.data;
  const step = getStep(stepId);
  const draft = step?.draft;
  if (!step || !draft) return { ok: false, error: 'validation' };

  const text = draftTextSchema.safeParse(input.data.text);
  if (!text.success) {
    return { ok: false, error: 'validation', fieldErrors: fieldErrors(text.error.issues) };
  }

  const dossier = await getDossier(dossierId);
  if (!dossier) return { ok: false, error: 'not_found' };
  if (!isStepOpen(dossier.entryPoint, step.id)) return { ok: false, error: 'validation' };

  const res = await repo.upsertAnswer({ dossierId, key: draft.key, value: text.data });
  if (res.error) return fromRepo(res.error, 'saveDraft');
  return { ok: true, data: { key: draft.key } };
}
```

- [ ] **Étape 4 : ajouter l'action**

Dans `apps/web/src/modules/dossier/answers/actions.ts`, remplacer
`import { saveAnswer } from './service';` par `import { saveAnswer, saveDraft } from './service';`
et ajouter à la fin :

```ts
export interface DraftState {
  error?: DossierError;
  saved?: boolean;
}

/** Enregistre le brouillon d'une étape ; reste sur la page pour continuer à copier ou partager. */
export async function saveDraftAction(
  _prev: DraftState | null,
  formData: FormData,
): Promise<DraftState> {
  if (!(await getCurrentUser())) return { error: 'unauthenticated' };
  const dossierId = field(formData, 'dossierId');
  const res = await saveDraft({
    dossierId,
    stepId: field(formData, 'stepId'),
    text: field(formData, 'text'),
  });
  if (!res.ok) return { error: res.error };
  revalidatePath(localizedPath(`/dossier/${dossierId}`, await getLocale()));
  return { saved: true };
}
```

- [ ] **Étape 5 : lancer les tests**

Run: `cd apps/web && pnpm vitest run src/modules/dossier && pnpm --filter @testimona/web typecheck`
Expected: PASS ; `service.ts` reste sous 300 lignes.

- [ ] **Étape 6 : commit**

```bash
git add apps/web/src/modules/dossier/answers/service.ts apps/web/src/modules/dossier/answers/actions.ts apps/web/src/modules/dossier/answers/draft.test.ts
git commit -m "feat(dossier): save step drafts"
```

---

### Tâche 7 : redirection vers le brouillon et lien du tableau de bord

**Fichiers :**

- Modifier : `apps/web/src/modules/dossier/answers/redirect.ts`,
  `apps/web/src/journey/ui/JourneyOverview.tsx`
- Test : `apps/web/src/modules/dossier/answers/redirect.test.ts`

- [ ] **Étape 1 : écrire le test qui échoue**

Ajouter à `apps/web/src/modules/dossier/answers/redirect.test.ts` (importer `defineStep` et `q`
depuis `@/journey/define` s'ils ne le sont pas, et réutiliser la constante d'identifiant de dossier
déjà présente dans le fichier, notée ici `DOSSIER`) :

```ts
it('mène au brouillon après la dernière question d’une étape à brouillon', () => {
  const step = defineStep({
    id: 'with-draft',
    questions: [q.shortText('withDraft.a')],
    draft: { key: 'withDraft.text', kind: 'whatsapp' },
  });
  expect(answerRedirectTarget(DOSSIER, step, { 'withDraft.a': 'x' }, 0)).toBe(
    `/dossier/${DOSSIER}/etape/with-draft/brouillon`,
  );
});
```

- [ ] **Étape 2 : lancer le test, constater l'échec**

Run: `cd apps/web && pnpm vitest run src/modules/dossier/answers/redirect.test.ts`
Expected: FAIL (redirection vers le tableau de bord).

- [ ] **Étape 3 : écrire le code**

Dans `apps/web/src/modules/dossier/answers/redirect.ts`, remplacer le `return` final par :

```ts
if (next !== null) return `/dossier/${dossierId}/etape/${step.id}?q=${next}`;
// WHY: une étape à brouillon (2.2, 2.3) se termine sur le texte à partager.
return step.draft ? `/dossier/${dossierId}/etape/${step.id}/brouillon` : `/dossier/${dossierId}`;
```

et compléter la JSDoc : « … sinon le brouillon de l'étape s'il existe, sinon le tableau de bord ».

Dans `apps/web/src/journey/ui/JourneyOverview.tsx`, dans le `<li>` de chaque étape, juste après
le paragraphe de description :

```tsx
{
  step.draft && (
    <Link
      href={`/dossier/${dossierId}/etape/${step.id}/brouillon`}
      className="text-primary text-sm font-semibold hover:underline"
    >
      {t('dashboard.viewDraft')}
    </Link>
  );
}
```

- [ ] **Étape 4 : lancer les tests**

Run: `cd apps/web && pnpm vitest run src/modules/dossier src/journey && pnpm --filter @testimona/web typecheck`
Expected: PASS.

- [ ] **Étape 5 : commit**

```bash
git add apps/web/src/modules/dossier/answers/redirect.ts apps/web/src/modules/dossier/answers/redirect.test.ts apps/web/src/journey/ui/JourneyOverview.tsx
git commit -m "feat(journey): end draft steps on their draft and link it from the dashboard"
```

---

### Tâche 8 : éditeur et route du brouillon

**Fichiers :**

- Créer : `apps/web/src/journey/ui/DraftEditor.tsx`,
  `apps/web/src/app/[locale]/(dossier)/dossier/[id]/etape/[stepId]/brouillon/page.tsx`
- Modifier : `apps/web/e2e/smoke.spec.ts`

- [ ] **Étape 1 : écrire le test e2e (anonyme)**

Ajouter dans `apps/web/e2e/smoke.spec.ts`, après « Question screen requires sign-in » :

```ts
test('Draft screen requires sign-in', async ({ page }) => {
  await page.goto(
    '/dossier/44444444-4444-4444-8444-444444444444/etape/immediate-message/brouillon',
  );
  await expect(page).toHaveURL(/\/login\?next=.*brouillon/);
});
```

- [ ] **Étape 2 : écrire `DraftEditor.tsx`**

```tsx
'use client';

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { saveDraftAction, type DraftState } from '@/modules/dossier/answers/actions';
import { DRAFT_MAX, type DraftKind } from '../types';

interface Props {
  dossierId: string;
  stepId: string;
  kind: DraftKind;
  /** Texte de départ : le brouillon enregistré, sinon le modèle. */
  initialText: string;
  /** Texte du modèle, pour « Repartir des réponses ». */
  generatedText: string;
  /** Vrai si `initialText` est déjà enregistré. */
  initiallySaved: boolean;
  /** Objet de l'e-mail (annonce par e-mail seulement). */
  subject: string | null;
  readOnly: boolean;
}

const SHELL =
  'bg-secondary text-secondary-foreground mx-auto flex max-w-2xl flex-col gap-5 rounded-3xl p-6 sm:p-10';
const BUTTON =
  'rounded-full border border-white/40 px-4 py-2 text-sm font-semibold disabled:opacity-60';
const FIELD = 'w-full rounded-xl border border-white/30 bg-white/10 px-4 py-3 text-white';

/**
 * Éditeur d'un brouillon d'annonce : modifier, enregistrer, copier, partager sur WhatsApp ou
 * ouvrir dans la messagerie. Les lecteurs peuvent lire et copier.
 *
 * @example
 * <DraftEditor dossierId={id} stepId="immediate-message" kind="whatsapp" … />
 */
export function DraftEditor(props: Props) {
  const { dossierId, stepId, kind, readOnly } = props;
  const t = useTranslations('journey.draft');
  const tErrors = useTranslations('dossier.errors');
  const [state, formAction, pending] = useActionState<DraftState | null, FormData>(
    saveDraftAction,
    null,
  );
  const [text, setText] = useState(props.initialText);
  const [savedText, setSavedText] = useState(props.initiallySaved ? props.initialText : null);
  const [status, setStatus] = useState<string | null>(null);
  const submittedRef = useRef<string>(props.initialText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  // WHY: le texte enregistré est celui envoyé au moment de la soumission, pas celui tapé depuis.
  useEffect(() => {
    if (state?.saved) {
      setSavedText(submittedRef.current);
      setStatus(t('saved'));
    }
  }, [state, t]);

  const copy = async (value: string, select: () => void) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(value);
      setStatus(t('copied'));
    } catch {
      // WHY: sans API presse-papiers (HTTP, vieux navigateur), on sélectionne le texte.
      select();
      setStatus(t('copyManual'));
    }
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    submittedRef.current = text;
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };

  const dirty = savedText !== text;
  const encoded = encodeURIComponent(text);
  const message = state?.error
    ? tErrors(state.error)
    : (status ?? (dirty && !readOnly ? t('unsaved') : ''));

  return (
    <form onSubmit={onSubmit} noValidate className={SHELL}>
      <input type="hidden" name="dossierId" value={dossierId} />
      <input type="hidden" name="stepId" value={stepId} />
      <h1 className="font-display text-2xl font-bold">{t(`title.${kind}`)}</h1>
      <p className="text-sm text-white/70">{readOnly ? t('readOnly') : t(`intro.${kind}`)}</p>

      {props.subject && (
        <label className="block space-y-1">
          <span className="text-sm">{t('subject')}</span>
          <input ref={subjectRef} type="text" value={props.subject} readOnly className={FIELD} />
        </label>
      )}

      <label className="block space-y-1">
        <span className="text-sm">{t('body')}</span>
        <textarea
          ref={textareaRef}
          name="text"
          rows={kind === 'email' ? 16 : 10}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setStatus(null);
          }}
          readOnly={readOnly}
          maxLength={DRAFT_MAX}
          className={FIELD}
        />
      </label>

      <p role="status" className="min-h-5 text-sm text-white/80">
        {message}
      </p>

      <div className="flex flex-wrap gap-3">
        {!readOnly && (
          <button
            type="submit"
            disabled={pending || !dirty}
            className="bg-accent rounded-full px-5 py-2 font-semibold text-white disabled:opacity-60"
          >
            {t('save')}
          </button>
        )}
        <button
          type="button"
          onClick={() => copy(text, () => textareaRef.current?.select())}
          className={BUTTON}
        >
          {t('copy')}
        </button>
        {props.subject && (
          <button
            type="button"
            onClick={() => copy(props.subject ?? '', () => subjectRef.current?.select())}
            className={BUTTON}
          >
            {t('copySubject')}
          </button>
        )}
        {kind === 'whatsapp' ? (
          <a
            href={`https://wa.me/?text=${encoded}`}
            target="_blank"
            rel="noopener noreferrer"
            className={BUTTON}
          >
            {t('shareWhatsapp')}
          </a>
        ) : (
          <a
            href={`mailto:?subject=${encodeURIComponent(props.subject ?? '')}&body=${encoded}`}
            className={BUTTON}
          >
            {t('openMail')}
          </a>
        )}
        {!readOnly && (
          <button
            type="button"
            onClick={() => {
              setText(props.generatedText);
              setStatus(null);
            }}
            disabled={text === props.generatedText}
            className={BUTTON}
          >
            {t('regenerate')}
          </button>
        )}
      </div>

      <div className="flex flex-wrap justify-between gap-3 text-sm text-white/70">
        <Link href={`/dossier/${dossierId}/etape/${stepId}?q=0`} className="hover:underline">
          ← {t('editAnswers')}
        </Link>
        <Link href={`/dossier/${dossierId}`} className="hover:underline">
          {t('backToDossier')}
        </Link>
      </div>
    </form>
  );
}
```

- [ ] **Étape 3 : écrire la page**

`apps/web/src/app/[locale]/(dossier)/dossier/[id]/etape/[stepId]/brouillon/page.tsx` :

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { z } from 'zod';
import { getStep, isStepOpen } from '@/journey/registry';
import { draftFor, emailSubject, type DraftContext } from '@/journey/templates';
import { DraftEditor } from '@/journey/ui/DraftEditor';
import { listAnswers } from '@/modules/dossier/answers/repo';
import { getDossier, getMyRole, getPerson } from '@/modules/dossier/repo';
import { canWrite } from '@/modules/dossier/roles';

export const metadata: Metadata = { robots: { index: false, follow: false } };

const IdSchema = z.string().uuid();

export default async function DraftPage({
  params,
}: {
  params: Promise<{ locale: string; id: string; stepId: string }>;
}) {
  const { locale, id, stepId } = await params;
  setRequestLocale(locale);
  const step = getStep(stepId);
  const draft = step?.draft;
  if (!IdSchema.safeParse(id).success || !step || !draft) notFound();

  const dossier = await getDossier(id);
  if (!dossier || !isStepOpen(dossier.entryPoint, step.id)) notFound();

  const [person, role, answers] = await Promise.all([
    getPerson(id),
    getMyRole(id),
    // WHY: l'annonce par e-mail reprend des réponses d'autres étapes (date, ton).
    listAnswers(id),
  ]);
  const ctx: DraftContext = {
    locale: locale === 'en' ? 'en' : 'fr',
    person: person ?? { firstName: dossier.title, lastName: '', nickname: null },
    answers,
  };
  const generated = draftFor(draft.kind, ctx);
  const stored = answers[draft.key];
  const saved = typeof stored === 'string' && stored.trim() !== '' ? stored : null;

  return (
    <div className="px-4 py-8 sm:px-6 lg:py-12">
      <DraftEditor
        dossierId={id}
        stepId={step.id}
        kind={draft.kind}
        initialText={saved ?? generated}
        generatedText={generated}
        initiallySaved={saved !== null}
        subject={draft.kind === 'email' ? emailSubject(ctx) : null}
        readOnly={!canWrite(role)}
      />
    </div>
  );
}
```

- [ ] **Étape 4 : vérifier**

Run: `pnpm --filter @testimona/web typecheck && pnpm --filter @testimona/web lint && pnpm format:check && NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder_anon_key_long_enough NEXT_PUBLIC_SITE_URL=https://example.com pnpm --filter @testimona/web build`
Expected: 0 erreur ; la route `/[locale]/dossier/[id]/etape/[stepId]/brouillon` apparaît dans le
build. Lancer `pnpm exec prettier --write` sur les fichiers créés si le format échoue.

- [ ] **Étape 5 : commit**

```bash
git add apps/web/src/journey/ui/DraftEditor.tsx "apps/web/src/app/[locale]/(dossier)/dossier/[id]/etape/[stepId]/brouillon/page.tsx" apps/web/e2e/smoke.spec.ts
git commit -m "feat(journey): add the draft editor with copy and WhatsApp sharing"
```

---

### Tâche 9 : vérification complète et PR

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

Avec l'accord de l'utilisateur : `git push -u origin feature/lot1-pr3-announce`, puis PR vers
`main`. Description (Contexte / Changements / Tests effectués / Risques), terminée par la ligne
d'attribution habituelle. Mentionner les décisions de ce plan (ordre des étapes, valeurs des
choix) pour validation.

---

## Couverture de la spec (auto-relecture)

| Exigence                                                                                   | Tâche   |
| ------------------------------------------------------------------------------------------ | ------- |
| 2.1 `broadcast.contacts` : nom, téléphone facultatif, cercle, membre qui appelle, priorité | 3, 5    |
| Cercles `close_family` … `other`                                                           | 3, 5    |
| 2.2 `death.date`, `death.mentionCause`, `announce.tone` → `announce.whatsapp.text`         | 3, 4, 6 |
| 2.3 `announce.aboutPerson`, `practicalInfo`, `flowersOrDonations` → `announce.email.text`  | 3, 4, 6 |
| Tons `believer`, `neutral`                                                                 | 3, 4, 5 |
| `templates/` : fonctions pures FR/EN, tolérantes aux réponses manquantes                   | 4       |
| Route `/dossier/[id]/etape/[stepId]/brouillon` : modifier, copier, partager sur WhatsApp   | 8       |
| Brouillons = réponses comme les autres (`journey_answer`)                                  | 6       |
| L'e-mail se copie dans la messagerie ; aucun envoi groupé                                  | 8       |
| Lecteur : lecture seule                                                                    | 6, 8    |
| Tests : modèles (données complètes et manquantes), types de liste                          | 2, 3, 4 |
| « Améliorer avec l'IA »                                                                    | PR 4    |
