# Lot 3 — PR 4 « Cérémonie » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter l'étape 3.4 « Déroulé de la cérémonie » (`ceremony-program`) : date des obsèques, trois lieux, registre, programme d'au plus 40 moments. Un programme type (sans IA) peut préremplir la liste. La synthèse affiche le programme trié par heure, des liens Maps, l'encadré prestataires `funeralHome` et les demandes de devis. La date des obsèques remplace « à préciser » dans les messages de devis de 3.1, 3.2 et 3.4.

**Architecture:**

- Le moteur de questions gagne trois petites capacités, testées seules :
  - un champ de liste `time` (heure `HH:MM`) ;
  - `prefillFrom` sur une question à choix : valeur de départ lue d'une autre clé tant que la question n'a pas de réponse ;
  - `starter` sur une question liste : un bouton « Partir d'un programme type » remplit la liste tant qu'elle est vide.
- Fonctions pures dans `journey/ceremony.ts` (tri du programme, date formatée, lieux) et `journey/templates/ceremony-program.ts` (programme type).
- La synthèse de 3.4 est un composant propre, `CeremonySynthesis`, choisi par la page de synthèse existante. Elle réutilise `ProviderPanel`, `QuoteHistory` et les messages de devis.
- Aucune migration : `quote_request.step_id` accepte déjà `ceremony-program`, et les réponses vivent dans `journey_answer`.

**Tech Stack:** Next.js 15 App Router, React 19, next-intl 3, Zod, Vitest + Testing Library, pnpm.

---

## Contexte pour l'implémenteur

- Dépôt : worktree `/Users/user/Downloads/testimona-lot3-pr4`, branche `feature/lot3-pr4-ceremony` (créée depuis `origin/main`). Ne pas travailler dans `/Users/user/Downloads/testimona`.
- Commandes (depuis la racine du worktree) :
  - tests web : `pnpm --filter @testimona/web test` (ou `pnpm --filter @testimona/web exec vitest run <chemin>` pour un fichier) ;
  - tests SQL : `pnpm --filter @testimona/supabase test` ;
  - typecheck : `pnpm --filter @testimona/web typecheck` ;
  - lint : `pnpm --filter @testimona/web lint` ;
  - format : `pnpm format:check` (Prettier, exécuté en premier par le CI) ; corriger avec `pnpm exec prettier --write <fichiers>`.
- Règles :
  - ne jamais utiliser `git checkout --`, `restore`, `reset --hard`, `stash`, `push`, `merge` ni `add -A` ;
  - ajouter les fichiers par leur chemin ;
  - écrire les fichiers avec les outils d'édition, jamais par une commande shell ;
  - commits conventionnels en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ;
  - commentaires et JSDoc en français, `// WHY:` pour les choix non évidents, comme le code voisin.
- Déjà en place sur `main` :
  - moteur : `journey/types.ts` (`Question`, `ListField`, `answerSchema`), `journey/define.ts` (`q`, `defineStep`), `journey/registry.ts` (`STEPS_BY_ENTRY`), `journey/ui/QuestionScreen.tsx`, `journey/ui/inputs/ListInput.tsx`, `journey/ui/values.ts` (`toEditable`, `isBlank`, `missingRequired`) ;
  - page question : `app/[locale]/(dossier)/dossier/[id]/etape/[stepId]/page.tsx` ;
  - page synthèse : `…/etape/[stepId]/synthese/page.tsx`, qui refuse aujourd'hui toute étape sans estimation (`hasEstimate`) ;
  - `announce.tone` (étape 2.2) et `TONES = ['believer', 'neutral']` dans `journey/options.ts` ;
  - `lib/geo/maps.ts` : `parseLocation`, `mapsDirectionsHref` (adresse libre ou lien Google Maps collé) ;
  - devis : `modules/providers/quote-panel.ts` (`quoteMessages`, `quotePlace`), `quote-message.ts` (`date: string | null`), `quotes/repo.ts` (`QUOTE_STEPS` contient déjà `ceremony-program`) ;
  - `ProviderPanel`, `QuoteHistory`, `providersForPanel`, `quotesForStep`, `panelCity`.
- Écarts assumés avec la spec, à reporter dans la spec à la tâche 8 :
  - les trois lieux (levée du corps, cérémonie, inhumation) sont des textes courts (adresse ou lien Google Maps collé), pas des `place` (ville + pays) : un lien Maps vers une ville seule ne guide personne ;
  - le registre a sa propre clé `ceremony.tone`, préremplie depuis `announce.tone` : une clé ne peut appartenir qu'à une étape (`assertUniqueSteps`) ;
  - l'heure d'un moment est un champ `time` du moteur.

## Fichiers

| Fichier                                                                    | Rôle                                               |
| -------------------------------------------------------------------------- | -------------------------------------------------- |
| `apps/web/src/journey/types.ts` (modifié)                                  | Champ `time`, `prefillFrom`, `starter`             |
| `apps/web/src/journey/define.ts` (modifié)                                 | Fabriques et contrôles des nouvelles options       |
| `apps/web/src/journey/ui/inputs/ListInput.tsx` (modifié)                   | Saisie d'une heure                                 |
| `apps/web/src/journey/ui/QuestionScreen.tsx` (modifié)                     | Bouton « Partir d'un programme type »              |
| Page question `…/etape/[stepId]/page.tsx` (modifiée)                       | Valeur préremplie, programme type traduit          |
| `apps/web/src/journey/steps/3-4-ceremony-program.ts` (créé)                | Définition de l'étape 3.4                          |
| `apps/web/src/journey/registry.ts` (modifié)                               | Étape après 3.2                                    |
| `apps/web/src/journey/templates/ceremony-program.ts` (créé)                | Programme type par registre                        |
| `apps/web/src/journey/ceremony.ts` (créé)                                  | Tri du programme, date des obsèques, lieux         |
| `apps/web/src/journey/ui/CeremonySynthesis.tsx` (créé)                     | Synthèse de 3.4                                    |
| Page synthèse `…/etape/[stepId]/synthese/page.tsx` (modifiée)              | Choix de la synthèse, date des devis               |
| `apps/web/messages/fr.json`, `en.json` (modifiés)                          | Textes de 3.4, du programme type et de la synthèse |
| `docs/superpowers/specs/2026-10-28-lot-3-funerailles-design.md` (modifiée) | Documentation                                      |

---

### Task 1: Champ de liste `time`

**Files:**

- Modify: `apps/web/src/journey/types.ts`, `apps/web/src/journey/ui/inputs/ListInput.tsx`, `apps/web/src/journey/ui/values.ts` si nécessaire
- Test: `apps/web/src/journey/types.test.ts`, test de `ListInput` (créer `journey/ui/inputs/ListInput.test.tsx` s'il n'existe pas)

- [ ] Écrire les tests d'abord :
  - `answerSchema` d'une liste avec `{ name: 'time', kind: 'time', required: true }` accepte `'08:00'`, `'23:59'`, `' 09:30 '` (rogné) ; refuse `'24:00'`, `'8:00'`, `'08:60'`, `''` ;
  - champ `time` facultatif : `''` devient absent (comme `optionalText`) ;
  - `ListInput` affiche un `<input type="time">` avec le libellé `journey.q.<clé>.fields.<nom>.label`, en lecture seule si `readOnly`.
- [ ] Vérifier qu'ils échouent.
- [ ] Implémenter : `ListField` gagne `{ name: string; kind: 'time'; required?: boolean }` ; `fieldSchema` valide `^([01]\d|2[0-3]):[0-5]\d$` après `trim` ; `ListInput` rend `type="time"` ; `emptyItem`, `normalizeItem` et `missingRequired` traitent `time` comme un texte.
- [ ] Tests, typecheck et lint verts ; commit `feat(journey): add a time field to list questions`.

### Task 2: `prefillFrom` sur une question à choix

**Files:**

- Modify: `apps/web/src/journey/types.ts`, `apps/web/src/journey/define.ts`, page question `…/etape/[stepId]/page.tsx`
- Create: `apps/web/src/journey/prefill.ts` (+ test)
- Test: `apps/web/src/journey/define.test.ts`

- [ ] Tests d'abord :
  - `q.choice('a.b', OPTIONS, { prefillFrom: 'c.d' })` produit `prefillFrom: 'c.d'` ; sans option, pas de propriété ;
  - `defineStep` refuse un `prefillFrom` au mauvais format ou égal à la clé de la question ;
  - `initialStored(question, answers)` : renvoie la réponse de la question si elle existe (y compris « passée ») ; sinon la réponse de `prefillFrom` si c'est une option valide de la question ; sinon `undefined`.
- [ ] Implémenter. La page question lit aussi les clés `prefillFrom` des questions de l'étape (`listAnswers(id, [...keys, ...prefillKeys])`) et passe `stored={initialStored(question, answers)}`. `resolveQuestionIndex` continue de recevoir les seules réponses de l'étape : une valeur préremplie ne compte pas comme répondue tant qu'elle n'est pas enregistrée.
- [ ] Tests, typecheck et lint verts ; commit `feat(journey): prefill a choice question from another answer`.

### Task 3: Étape 3.4 et registre

**Files:**

- Create: `apps/web/src/journey/steps/3-4-ceremony-program.ts`
- Modify: `apps/web/src/journey/registry.ts`, `apps/web/messages/fr.json`, `apps/web/messages/en.json`
- Test: `apps/web/src/journey/registry.test.ts`, `apps/web/src/journey/messages.test.ts` (doit couvrir la nouvelle étape ; l'étendre sinon)

- [ ] Définition :

```ts
/** Nombre maximal de moments du programme. */
export const PROGRAM_MAX_ITEMS = 40;
export const CEREMONY_STEP_ID = 'ceremony-program';

/** Étape 3.4 : déroulé de la cérémonie (date, lieux, registre, programme). */
export const ceremonyProgramStep = defineStep({
  id: CEREMONY_STEP_ID,
  questions: [
    q.date('ceremony.date'),
    q.shortText('ceremony.liftPlace'),
    q.shortText('ceremony.servicePlace'),
    q.shortText('ceremony.burialPlace'),
    q.choice('ceremony.tone', TONES, { prefillFrom: 'announce.tone' }),
    q.list(
      'ceremony.program',
      [
        { name: 'time', kind: 'time', required: true },
        { name: 'moment', kind: 'shortText', required: true },
        { name: 'place', kind: 'shortText' },
        { name: 'lead', kind: 'shortText' },
      ],
      PROGRAM_MAX_ITEMS,
    ),
  ],
  summary: 'step',
  providers: ['funeralHome'],
});
```

- [ ] Ajouter l'étape à `STEPS_BY_ENTRY.death`, juste après `vigilCateringStep`.
- [ ] Textes FR/EN : `journey.steps.ceremony-program.*` (mêmes clés que les autres étapes), `journey.q.ceremony.*.title` / `.hint` (indice des lieux : « adresse ou lien Google Maps »), options `believer` / `neutral`, libellés des champs du programme. Suivre la forme des clés de 3.1 et 2.1.
- [ ] Test : 40 moments réalistes (textes accentués de 200 caractères sur `moment`, `place`, `lead`) passent `answerSchema` ; 41 sont refusés. Ajuster `PROGRAM_MAX_ITEMS` et commenter (`// WHY:`) si la taille dépasse 60 000 octets.
- [ ] Tests, typecheck et lint verts ; commit `feat(journey): add the ceremony program step`.

### Task 4: Programme type

**Files:**

- Create: `apps/web/src/journey/templates/ceremony-program.ts` (+ test)
- Modify: `apps/web/src/journey/types.ts`, `apps/web/src/journey/define.ts`, `apps/web/src/journey/steps/3-4-ceremony-program.ts`, `apps/web/src/journey/ui/QuestionScreen.tsx`, page question, `messages/*.json`
- Test: test du modèle, `journey/ui/QuestionScreen.test.tsx` (à créer)

- [ ] Modèle pur, sans IA : `ceremonyProgramTemplate(tone, places, t)` renvoie 8 `ListItem` avec heure, moment traduit et lieu. Moments (clés `journey.templates.ceremony.<moment>`) : accueil des proches, levée du corps (lieu = `liftPlace`), cortège, office religieux (`believer`) ou cérémonie de recueillement (`neutral`) (lieu = `servicePlace`), hommages et témoignages, départ vers le cimetière, inhumation (lieu = `burialPlace`), réception. Heures en constantes nommées, croissantes. Registre inconnu : `neutral`. Lieu absent : champ vide.
- [ ] `ListQuestion` gagne `starter?: 'ceremonyProgram'` (`q.list(key, fields, max, { starter })`) ; `defineStep` vérifie que le modèle tient dans `maxItems`.
- [ ] Page question : pour une question liste avec `starter`, lire `ceremony.tone` (sinon `announce.tone`) et les trois lieux, construire les éléments traduits côté serveur et les passer à `QuestionScreen` (`starter?: ListItem[]`).
- [ ] `QuestionScreen` : bouton « Partir d'un programme type » (`journey.ui.useStarter`) affiché seulement si `starter` est fourni, hors lecture seule, et tant que la valeur est vide (`isBlank`) ; un clic remplace la valeur par les éléments du modèle. Le bouton disparaît dès qu'un moment existe.
- [ ] Tests : modèle par registre (ordre, heures croissantes, lieux repris, 8 éléments, tous valides pour `answerSchema`) ; bouton visible sur liste vide, absent si un moment existe ou en lecture seule, clic qui remplit la liste.
- [ ] Tests, typecheck et lint verts ; commit `feat(journey): start the ceremony program from a template`.

### Task 5: Fonctions pures de la cérémonie

**Files:**

- Create: `apps/web/src/journey/ceremony.ts` (+ `ceremony.test.ts`)

- [ ] `sortedProgram(value: unknown): ProgramItem[]` : ignore une valeur absente, « passée » ou mal formée ; garde les éléments avec `time` et `moment` valides ; tri stable par heure.
- [ ] `ceremonyDate(value: unknown, locale: string): string | null` : date ISO valide formatée en date longue (`Intl.DateTimeFormat(locale, { dateStyle: 'full', timeZone: 'UTC' })`), sinon `null`.
- [ ] `ceremonyPlaces(answers)` : liste ordonnée `{ key: 'liftPlace' | 'servicePlace' | 'burialPlace', text, href }` des lieux répondus, `href = mapsDirectionsHref(text)` si `parseLocation(text).valid`, sinon `null`. Exporter aussi `placeHref(text)` pour les lieux du programme.
- [ ] Tests d'abord, puis implémentation ; commit `feat(journey): sort the ceremony program and format its date`.

### Task 6: Synthèse de 3.4

**Files:**

- Create: `apps/web/src/journey/ui/CeremonySynthesis.tsx` (+ test)
- Modify: page synthèse, `messages/*.json`

- [ ] Page synthèse : accepter `CEREMONY_STEP_ID` en plus des étapes avec estimation ; pour 3.4, lire les réponses de l'étape et rendre `CeremonySynthesis`. Encadré, devis et historique restent calculés comme pour 3.1 et 3.2 (quantités vides). Garder une seule page.
- [ ] `CeremonySynthesis` : titre ; date (`ceremonyDate`) ou « Date à préciser » ; lieux avec lien Maps (`target="_blank" rel="noopener noreferrer"`) ; programme trié en tableau (heure, moment, lieu avec lien Maps si valide, responsable) ; sans programme, message et lien « Écrire le programme » pour qui peut répondre ; puis `ProviderPanel`, `QuoteHistory`, liens « Modifier les réponses » et « Retour au dossier » comme `StepSynthesis`.
- [ ] Tests du composant : ordre par heure, date absente, lien Maps présent ou absent, programme vide, lecteur sans lien d'édition.
- [ ] Tests, typecheck et lint verts ; commit `feat(journey): add the ceremony program summary`.

### Task 7: Date des obsèques dans les messages de devis

**Files:**

- Modify: page synthèse, `apps/web/src/modules/providers/quote-panel.ts` (+ test)

- [ ] Extraire `quoteContext({ answers, city, locale, quantities })` dans `quote-panel.ts` : `place = quotePlace(answers['vigil.place'], city)`, `date = ceremonyDate(answers['ceremony.date'], locale)`. La page lit aussi `ceremony.date` et l'utilise pour 3.1, 3.2 et 3.4. Mettre à jour le commentaire « La date de la cérémonie viendra avec l'étape 3.4 ».
- [ ] Tests : date présente, absente, « passée », invalide.
- [ ] Commit `feat(providers): put the funeral date in quote messages`.

### Task 8: Documentation et vérifications finales

- [ ] Spec du lot 3 : section 2 (3.4), section 3 (la date du message vient de 3.4, plus « à préciser » seulement sans réponse), écarts assumés ci-dessus.
- [ ] `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm --filter @testimona/web test`, `pnpm --filter @testimona/supabase test` verts.
- [ ] Commit `docs(lot3): document the ceremony program step`.
