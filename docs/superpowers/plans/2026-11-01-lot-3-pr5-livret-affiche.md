# Lot 3 — PR 5 « Livret et affiche » Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter l'étape 3.5 « Livret et affiche » (`funeral-documents`). La famille envoie, si elle le souhaite, une photo de la personne (`dossier_photo`, bucket privé `dossier-photos`). Elle choisit une variante « sobre » ou « couleur ». Elle obtient de l'IA trois textes : une phrase de couverture, un hommage d'environ 150 mots et un mot de remerciement. Ces textes sont relus, modifiables et enregistrés dans `journey_answer`. Tout membre du dossier télécharge ensuite le livret (PDF A5), l'affiche (PDF A4) et l'affiche carrée (PNG 1080 px pour WhatsApp). Les noms, dates, heures et lieux imprimés viennent de la fiche et de l'étape 3.4, jamais de l'IA.

**Architecture:**

- Migration `20261101000100_dossier_photos.sql` : table `dossier_photo`, RPC `set_dossier_photo` et bucket privé `dossier-photos`. Elle suit le modèle des reçus (`20261028000100_receipts.sql`) : on prépare une ligne, le navigateur envoie la photo par un lien signé, puis la photo devient la photo courante. Elle ne le devient que si le fichier existe au stockage. Testée sur PGlite, **jamais appliquée en production dans cette PR**.
- Nouveau module `apps/web/src/modules/documents/` :
  - `photo/` : envoi, photo courante, lecture des octets côté serveur ;
  - `texts.ts` : clés et bornes des trois textes, enregistrement ;
  - `model.ts` : données passées aux modèles (fonctions pures) et contrôle « document prêt » ;
  - `pdf/` et `png/` : modèles fixes `@react-pdf/renderer` et `next/og` ;
  - `http.ts` : réponse de téléchargement.
- IA : un seul appel produit les trois textes en JSON (`modules/ai/documents.ts`). Il réutilise `completeChat`, `takeAiQuota` et `isAiEnabled`. Les faits envoyés passent par une liste blanche (`documentFacts`) : prénom, surnom, registre et réponses de la biographie 1.6. Ni date, ni heure, ni lieu, ni programme.
- L'étape 3.5 est une étape du moteur avec une seule question (`documents.style`) et `summary: 'step'`. Sa synthèse est un composant propre, `DocumentsSynthesis`. On y trouve la photo, les trois textes, l'état « prêt / manque » et les liens de téléchargement. La page de synthèse existante le choisit, comme `CeremonySynthesis`.
- Téléchargement : route `GET /api/dossiers/[dossierId]/documents/[doc]` (`runtime = 'nodejs'`), réservée aux membres du dossier. Elle répond avec `Cache-Control: no-store` et `X-Content-Type-Options: nosniff`, comme l'export CSV. Tout passe par le client utilisateur et la RLS ; aucun client service-role.

**Tech Stack:** Next.js 15.5 App Router (runtime Node pour la route), React 19, next-intl 3, Zod, Supabase (Postgres, Storage, RLS), `@react-pdf/renderer` 4.x (nouvelle dépendance, MIT), `next/og` (fourni avec Next), Vitest + Testing Library, PGlite pour les tests SQL, pnpm.

---

## Contexte pour l'implémenteur

- Dépôt : worktree `/Users/user/Downloads/testimona-lot3-pr5`, branche `feature/lot3-pr5-documents`. Elle part de `feature/lot3-pr4-ceremony`, pas encore fusionnée : rebaser sur `main` une fois la PR 4 fusionnée. Ne pas travailler dans `/Users/user/Downloads/testimona`.
- Commandes (depuis la racine du worktree) :
  - tests web : `pnpm --filter @testimona/web test` (ou `pnpm --filter @testimona/web exec vitest run <chemin>` pour un fichier) ;
  - tests SQL : `pnpm --filter @testimona/supabase test` (ou `pnpm --filter @testimona/supabase exec vitest run tests/<fichier>`) ;
  - typecheck : `pnpm typecheck` (ou `pnpm --filter @testimona/web typecheck`) ;
  - lint : `pnpm lint` ;
  - format : `pnpm format:check` (Prettier, exécuté en premier par le CI) ; corriger avec `pnpm exec prettier --write <fichiers>`.
- Règles :
  - ne jamais utiliser `git checkout --`, `restore`, `reset --hard`, `stash`, `push`, `merge` ni `add -A` ;
  - ajouter les fichiers par leur chemin ;
  - écrire les fichiers avec les outils d'édition, jamais par une commande shell (exception : le téléchargement des fichiers de police à la tâche 2, après accord) ;
  - ne jamais appliquer la migration en production ni lancer `supabase db push` : l'utilisateur décide ;
  - aucun client service-role (`getSupabaseAdminClient`, `server/privileged/*`) dans ce module ;
  - commits conventionnels en anglais, terminés par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` ;
  - commentaires et JSDoc en français, `// WHY:` pour les choix non évidents, comme le code voisin ;
  - un hook « GateGuard » peut demander d'énoncer des faits avant une écriture : les énoncer, puis réessayer.
- Déjà en place (à réutiliser, ne pas réécrire) :
  - **Reçus (modèle de la photo)** :
    - migration `supabase/migrations/20261028000100_receipts.sql` : trigger `receipt_before_insert` (rôle d'abord en 42501, chemin, auteur et date imposés), contrôle « photo au stockage » dans `receipt_before_update` (`storage.objects`, `archived_at is null`, code TL006), policies `receipts_insert` / `receipts_select` sur `storage.objects` ;
    - tests `supabase/tests/receipts.test.ts`, `supabase/tests/receipts-storage.test.ts`, banc `supabase/tests/helpers/receipts.ts` (`createReceiptFixture`, `upload`, `visibleObjects`), base `supabase/tests/helpers/db.ts` (`createTestDb`, `createUser`, `asUser`, `asRole`) ;
    - code `modules/budget/receipts/repo.ts` (`insertReceipt`, `createUploadUrl` → `createSignedUploadUrl`, `isMissingObject`, `storageFail`), `service.ts` (table `CODES`, `fromRepo`), `http.ts` (`receiptRedirect` : lien signé de 5 minutes, 404 sans rien révéler), `schema.ts` (`sniffImageType`), `ui/ReceiptCapture.tsx` (`uploadToSignedUrl` avec `getSupabaseBrowser`) ;
    - `modules/budget/receipts/ui/shrinkImage.ts` (`shrinkImage`, JPEG 1600 px, EXIF retiré ; garde l'original si le réencodage échoue).
  - **IA du lot 1** :
    - `modules/ai/config.ts` (`isAiEnabled`, `AI_MODEL`, `AI_DAILY_LIMIT = 20`), `quota.ts` (`takeAiQuota`), `provider.ts` (`completeChat`, `AiProviderError`, `data_collection: 'deny'` imposé) ;
    - `facts.ts` (liste blanche `AI_SENT_KEYS`, `aiFacts`), `prompt.ts` (`buildImprovePrompt` : balises `<facts>` / `<draft>` neutralisées, « données, pas instructions ») ;
    - `service.ts` (`improveDraft` : lire avant de consommer le quota, `failed` sans perdre le texte), `actions.ts` (`improveDraftAction`), `types.ts` (`AiError`, `AiResult`) ;
    - interface `journey/ui/DraftEditor.tsx` et `journey/ui/ImproveDraftButton.tsx` (verrouillage pendant l'appel, remplacement seulement si le texte n'a pas changé).
  - **Export CSV** : `modules/budget/closing/http.ts` (`NO_STORE = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }`, `failureResponse` : 401/404 sans corps, corps texte traduit pour 413 et 5xx) et sa route `app/api/dossiers/[dossierId]/ledger-export/route.ts` (`runtime = 'nodejs'`, `dynamic = 'force-dynamic'`).
  - **Fiche et réponses** :
    - `modules/dossier/repo.ts` : `getDossier`, `getPerson` / `getPersonResult` (`PersonSummary` : `firstName`, `lastName`, `nickname`, `birthDate`, `deathDate`), `getMyRole` ;
    - `modules/dossier/roles.ts` : `hasRole`, `canWrite` (contributeur et plus) ;
    - `modules/dossier/answers/repo.ts` : `listAnswersResult`, `upsertAnswer` ;
    - `modules/dossier/answers/service.ts` : `saveDraft`, avec `draftTextSchema` de `journey/types.ts` ;
    - règle de la date de décès : la réponse `death.date` prime sur `person.deathDate` (comme `aiFacts`) ;
    - biographie 1.6 : `journey/steps/1-6-biography.ts` (`biography.birthPlace`, `.parents`, `.career`, `.traits` [`trait`, `anecdote`], `.passions`, `.motto`).
  - **Cérémonie (PR 4)** :
    - `journey/ceremony.ts` : `sortedProgram`, `ceremonyDate(value, locale)`, `ceremonyPlaces(answers)`, `ProgramItem` ;
    - `journey/steps/3-4-ceremony-program.ts` : `CEREMONY_STEP_ID`, `ceremony.tone` prérempli depuis `announce.tone` ;
    - `journey/templates/starters.ts`, `journey/prefill.ts` ;
    - page synthèse `app/[locale]/(dossier)/dossier/[id]/etape/[stepId]/synthese/page.tsx`, qui choisit déjà `CeremonySynthesis`.
  - **Image PNG** : `next/og` est déjà utilisé, en runtime Node, par `app/api/og/memorial/[slug]/route.tsx`. Ce fichier lit avec le client service-role, ce qu'on **ne** reprend **pas**.
  - **Couleurs Testimona** : `app/globals.css` (`--color-foreground: #2d3250`, `--color-primary: #50aac3`, `--color-accent: #db8186`, `--color-muted-foreground: #788199`). Polices de l'interface : PT Sans et Montserrat (`app/[locale]/layout.tsx`, `next/font/google`), toutes deux sous licence OFL.
  - **Base de test** : `supabase/tests/migrations.test.ts` vérifie que 100 % des tables `public` ont la RLS et que les noms de migration sont uniques. Dernière migration : `20261029000200_provider_whatsapp_private.sql`. Codes d'erreur déjà pris : TL001 à TL010.
  - **Types** : `packages/shared/src/database.types.ts`. Ils sont régénérés depuis la production par `pnpm --filter @testimona/supabase db:types`, ce qui n'est pas possible tant que la migration n'y est pas appliquée. On les complète donc à la main dans le format généré, puis on les régénère après l'application, comme le commit `e70e222`. Le client web n'est pas typé par `Database` ; les repos typent leurs lignes eux-mêmes.
- Vérifié pour `@react-pdf/renderer` : version 4.9.0, licence MIT, `peerDependencies.react` inclut `^19.0.0`. Next 15.5 l'inscrit dans sa liste `serverExternalPackages` par défaut (`next/dist/lib/server-external-packages.json`) : rien à changer dans `next.config.mjs`. Il tourne dans une route en runtime Node, jamais en Edge. La production démarre par `pnpm --filter @testimona/web start` : `process.cwd()` vaut `apps/web`, et un fichier sous `apps/web/assets/` se lit donc par `path.join(process.cwd(), 'assets', …)`.
- Ordre de déploiement (spec §6) : la migration est appliquée en production **avant** la fusion. Le code lit la nouvelle table `dossier_photo`, appelle `set_dossier_photo` et écrit dans le bucket `dossier-photos`. Sans migration, l'envoi de photo échoue et la lecture de la photo renvoie une erreur. La synthèse et les documents restent utilisables sans photo (tâche 4), mais l'envoi ne l'est pas. Après l'application : régénérer les types dans un commit `chore(db): …`, comme `e70e222`.
- Écarts assumés avec la spec, sous réserve des « Points à valider », à reporter dans la spec à la tâche 10 :
  - **photo courante en deux temps** : la ligne est préparée avant l'envoi, puis désignée comme photo courante par `set_dossier_photo`, qui exige le fichier au stockage. La spec dit « le fichier doit exister avant l'insertion de la ligne ». C'est impossible avec une policy de stockage qui n'autorise que le chemin d'une ligne préparée. C'est bien « le même contrôle que les reçus » : il porte sur le rattachement, pas sur l'insertion. La table gagne `activated_at` ; l'index unique devient `dossier_id where activated_at is not null and archived_at is null` ;
  - **JPEG seul** : la spec annonce un bucket JPEG, PNG ou WebP, mais impose le chemin `<dossier_id>/<id>.jpg`. `shrinkImage` produit toujours du JPEG, et `@react-pdf/renderer` ne lit pas le WebP. Le bucket n'accepte donc que `image/jpeg`. Une photo que le navigateur ne sait pas réencoder est refusée avec un message ;
  - **pas de clé `documents.poster.*`** : l'affiche reprend la phrase de couverture du livret (`documents.booklet.cover`) et n'a pas de texte propre ;
  - **modèles sans IA** : quand l'IA est absente, épuisée ou en échec, la phrase de couverture et le remerciement ont un texte de départ fixe, selon le registre. L'hommage reste à écrire par la famille.

## Fichiers

| Fichier                                                                             | Rôle                                                        |
| ----------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `supabase/migrations/20261101000100_dossier_photos.sql` (créé)                      | Table, RPC, bucket, policies                                |
| `supabase/tests/helpers/dossier-photos.ts` (créé)                                   | Banc : dossier, rôles, préparer, envoyer, désigner          |
| `supabase/tests/dossier-photos.test.ts` (créé)                                      | Table, trigger, RPC, RLS                                    |
| `supabase/tests/dossier-photos-storage.test.ts` (créé)                              | Bucket et policies `storage.objects`                        |
| `supabase/README.md` (modifié)                                                      | Ligne de la migration                                       |
| `packages/shared/src/database.types.ts` (modifié)                                   | `dossier_photo`, `set_dossier_photo` (à la main)            |
| `apps/web/package.json`, `pnpm-lock.yaml` (modifiés)                                | `@react-pdf/renderer`                                       |
| `apps/web/assets/fonts/PTSans-Regular.ttf`, `PTSans-Bold.ttf`, `OFL.txt` (créés)    | Police avec accents, licence                                |
| `apps/web/src/modules/documents/fonts.ts` (créé)                                    | Chemins et lecture des polices, enregistrement react-pdf    |
| `apps/web/src/journey/steps/3-5-funeral-documents.ts` (créé)                        | Définition de l'étape 3.5                                   |
| `apps/web/src/journey/options.ts`, `journey/registry.ts` (modifiés)                 | `DOCUMENT_STYLES`, étape après 3.4                          |
| `apps/web/src/modules/documents/texts.ts`, `texts-service.ts`, `actions.ts` (créés) | Clés, bornes, enregistrement des textes                     |
| `apps/web/src/modules/documents/photo/*` (créés)                                    | Schéma, repo, service, actions, `PhotoCapture`, redirection |
| `apps/web/src/app/api/dossiers/[dossierId]/photo/route.ts` (créé)                   | Miniature : lien signé de 5 minutes                         |
| `apps/web/src/modules/documents/model.ts` (créé)                                    | Données des modèles, contrôle « prêt »                      |
| `apps/web/src/modules/documents/templates.ts` (créé)                                | Textes de départ sans IA                                    |
| `apps/web/src/modules/ai/documents-facts.ts`, `documents-prompt.ts` (créés)         | Liste blanche, prompt                                       |
| `apps/web/src/modules/ai/documents.ts`, `modules/ai/actions.ts` (créé, modifié)     | `generateDocumentTexts` et son action                       |
| `apps/web/src/modules/documents/theme.ts` (créé)                                    | Couleurs des variantes sobre et couleur                     |
| `apps/web/src/modules/documents/pdf/Booklet.tsx`, `PosterPdf.tsx` (créés)           | Modèles PDF                                                 |
| `apps/web/src/modules/documents/png/PosterImage.tsx` (créé)                         | Modèle PNG (`next/og`)                                      |
| `apps/web/src/modules/documents/render.ts` (créé)                                   | `renderBooklet`, `renderPosterPdf`, `renderPosterPng`       |
| `apps/web/src/modules/documents/http.ts` (créé)                                     | Réponse de téléchargement                                   |
| `apps/web/src/app/api/dossiers/[dossierId]/documents/[doc]/route.ts` (créé)         | Route de téléchargement                                     |
| `apps/web/src/modules/documents/ui/DocumentsSynthesis.tsx`, `DocumentTexts.tsx`     | Synthèse de 3.5, éditeur des trois textes                   |
| Page synthèse `…/etape/[stepId]/synthese/page.tsx` (modifiée)                       | Choix de `DocumentsSynthesis`                               |
| `apps/web/messages/fr.json`, `en.json` (modifiés)                                   | Textes de 3.5, des documents, erreurs                       |
| `docs/superpowers/specs/2026-10-28-lot-3-funerailles-design.md` (modifiée)          | Documentation, écarts                                       |

---

### Task 1: Migration `dossier_photo` et bucket `dossier-photos`

**Files:**

- Create: `supabase/migrations/20261101000100_dossier_photos.sql`, `supabase/tests/helpers/dossier-photos.ts`, `supabase/tests/dossier-photos.test.ts`, `supabase/tests/dossier-photos-storage.test.ts`
- Modify: `supabase/README.md`, `packages/shared/src/database.types.ts`

- [ ] Écrire les tests d'abord (banc sur le modèle de `helpers/receipts.ts` : un dossier avec un membre de chaque rôle, un second dossier tenu par un non-membre, raccourcis `prepare`, `upload`, `setCurrent`, `visibleRows`, `visibleObjects`) :
  - **bucket** : privé, `file_size_limit = 5242880`, `allowed_mime_types = ['image/jpeg']` ;
  - **préparation** :
    - coordinateur et propriétaire peuvent préparer ; trésorier, contributeur, lecteur et non-membre reçoivent 42501, vérifié **avant** tout comptage ;
    - `path = <dossier_id>/<id>.jpg`, `created_by = auth.uid()`, `created_at` récent, `activated_at` et `archived_at` nuls, même si le client envoie d'autres valeurs ;
  - **limite** : au-delà de 20 photos préparées en 24 heures pour un dossier, refus TL011. Une photo désignée compte toujours ; une préparation de plus de 24 heures jamais désignée ne compte plus (voir « Points à valider ») ;
  - **envoi au stockage** : permis seulement sur le chemin d'une photo préparée, ni désignée ni archivée, par un coordinateur et plus. Un chemin libre, un autre rôle ou un non-membre reçoivent 42501. Le même chemin envoyé deux fois bute sur 23505. Aucun `update` ni `delete` de l'objet ne passe ;
  - **`set_dossier_photo(p_photo_id)`** :
    - sans utilisateur : 28000 ;
    - rôle insuffisant, ou photo d'un autre dossier vue par un non-membre : 42501 ;
    - photo inexistante, déjà désignée ou archivée : TL012 (refus définitif) ;
    - fichier absent du stockage, ou seulement en version archivée : TL006 (retentable, comme pour les reçus) ;
    - succès : `activated_at` est posé, la photo courante précédente reçoit `archived_at`, et il reste exactement une photo courante (index unique) ;
  - **lecture** :
    - un membre de tout rôle voit la photo courante et son objet ;
    - seul un coordinateur et plus voit une photo préparée ou archivée et son objet ;
    - un non-membre ne voit rien ;
  - **droits** : ni `update` ni `delete` sur `dossier_photo` pour `authenticated` ; `anon` n'a aucun droit ; les fonctions de trigger ne sont pas exécutables par `public`, `anon` ni `authenticated` ; `set_dossier_photo` est exécutable par `authenticated` seulement ;
  - `migrations.test.ts` reste vert : la nouvelle table a la RLS, le nom est unique.
- [ ] Vérifier qu'ils échouent.
- [ ] Écrire la migration, avec en tête un bloc `WHY (choix assumés)` comme celui des reçus :
  - table `public.dossier_photo` :
    - `id uuid primary key default gen_random_uuid()` ;
    - `dossier_id uuid not null references public.dossier (id) on delete cascade` ;
    - `path text not null unique`, avec `check (path = dossier_id::text || '/' || id::text || '.jpg')` ;
    - `created_by uuid default auth.uid() references auth.users (id) on delete set null` ;
    - `created_at timestamptz not null default now()`, `activated_at timestamptz`, `archived_at timestamptz` ;
    - `check (archived_at is null or activated_at is not null)` ;
  - index : unique `dossier_photo_current_idx on (dossier_id) where activated_at is not null and archived_at is null` ; `(dossier_id, created_at desc)` ; `(created_by)` ;
  - trigger `dossier_photo_before_insert` (`security definer`, `set search_path = ''`) : rôle d'abord (`is_dossier_member(new.dossier_id, 'coordinator')`, sinon 42501) ; verrou `for no key update` sur le dossier ; limite TL011 ; puis chemin, auteur et dates imposés ;
  - RPC `public.set_dossier_photo(p_photo_id uuid) returns void` (`security definer`, `search_path = ''`) :
    - `auth.uid()` nul : 28000 ;
    - lit la photo `for update`, puis vérifie le rôle coordinateur sur son dossier : 42501, y compris si la ligne n'existe pas, pour ne rien révéler ;
    - photo déjà désignée ou archivée : TL012 ;
    - vérifie `storage.objects` (`bucket_id = 'dossier-photos'`, `name = path`, `archived_at is null`), sinon TL006 ;
    - verrouille le dossier, archive la photo courante, pose `activated_at = now()` ;
  - RLS et droits :
    - `enable row level security` ; `revoke all … from anon` ; `revoke update, delete, truncate, trigger, references … from authenticated` ;
    - policy `select` : `is_dossier_member(dossier_id) and ((activated_at is not null and archived_at is null) or is_dossier_member(dossier_id, 'coordinator'))` ;
    - policy `insert` : `with check (is_dossier_member(dossier_id, 'coordinator'))` ;
    - `revoke execute` des fonctions de trigger ; `grant execute on function set_dossier_photo(uuid) to authenticated` après `revoke … from public, anon` ;
  - bucket `dossier-photos` (`insert … on conflict (id) do update`, comme `receipts`) ; policies `dossier_photos_insert` et `dossier_photos_select` sur `storage.objects`, calquées sur `receipts_insert` et `receipts_select`. La lecture passe par la RLS de `dossier_photo`.
- [ ] Ajouter la ligne de la migration au tableau de `supabase/README.md`.
- [ ] Compléter à la main `packages/shared/src/database.types.ts` (`Tables.dossier_photo` : `Row`, `Insert`, `Update`, `Relationships` ; `Functions.set_dossier_photo`) dans le format généré. Ajouter un commentaire dans le message de commit : « à régénérer après application en production ».
- [ ] Ne **pas** appliquer la migration (ni MCP Supabase, ni CLI).
- [ ] `pnpm --filter @testimona/supabase test` vert ; commit `feat(db): add the dossier photo table and private bucket`.

### Task 2: Dépendance `@react-pdf/renderer` et police embarquée

**Files:**

- Modify: `apps/web/package.json`, `pnpm-lock.yaml`
- Create: `apps/web/assets/fonts/PTSans-Regular.ttf`, `apps/web/assets/fonts/PTSans-Bold.ttf`, `apps/web/assets/fonts/OFL.txt`, `apps/web/src/modules/documents/fonts.ts` (+ `fonts.test.ts`), `apps/web/src/modules/documents/render-smoke.test.tsx`

- [ ] Installer : `pnpm --filter @testimona/web add @react-pdf/renderer@4.9.0` (version exacte). Vérifier dans le lockfile que les dépendances transitives sont sous licence permissive (MIT, BSD, Apache, ISC ; pas de copyleft) : `pnpm --filter @testimona/web licenses list --prod` et chercher GPL, AGPL ou LGPL. Noter le résultat dans le message de commit.
- [ ] Police : PT Sans Regular et Bold (OFL 1.1, celle de l'interface), en **TTF**. `@react-pdf/renderer` et `next/og` ne lisent pas le WOFF2. Source : dépôt officiel `google/fonts`, dossier `ofl/ptsans`. Demander l'accord de l'utilisateur avant le téléchargement, avec le nom, la source et la taille des fichiers. Copier `OFL.txt` à côté.
- [ ] `fonts.ts` (`import 'server-only'`) :
  - `FONT_FAMILY = 'PT Sans'` et `fontFile(weight)`, qui renvoie `path.join(process.cwd(), 'assets', 'fonts', …)` ;
  - `readFontData()` : lecture une seule fois des deux `ArrayBuffer`, pour `next/og` ;
  - `registerPdfFonts()` : idempotent ; appelle `Font.register` avec les deux graisses, puis `Font.registerHyphenationCallback((word) => [word])`. WHY : la césure par défaut est anglaise et coupe mal le français.
- [ ] Tests d'abord :
  - les deux fichiers existent et commencent par la signature TrueType `00 01 00 00` ;
  - `OFL.txt` est présent ;
  - test de fumée en `// @vitest-environment node` : `renderToBuffer` d'un `<Document><Page size="A5"><Text>Évêché, Noël, ç, œ</Text></Page></Document>` avec la police enregistrée renvoie un tampon qui commence par `%PDF-`. Le PDF produit contient la police embarquée : on cherche `/FontFile2` dans le tampon.
- [ ] Si le test de fumée échoue sous Vitest pour une raison d'environnement (ESM, WASM de Yoga), l'isoler (`vi` ou `pool: 'forks'` pour ce fichier) et documenter la cause en `// WHY:`. Ne pas affaiblir le test.
- [ ] `pnpm --filter @testimona/web build` passe aussi : le paquet reste externe côté serveur et n'entre dans aucun paquet client.
- [ ] Tests, typecheck, lint et build verts ; commit `chore(web): add @react-pdf/renderer and embed the PT Sans font`.

### Task 3: Étape 3.5 et enregistrement des textes

**Files:**

- Create: `apps/web/src/journey/steps/3-5-funeral-documents.ts`, `apps/web/src/modules/documents/texts.ts` (+ test), `apps/web/src/modules/documents/texts-service.ts` (+ test), `apps/web/src/modules/documents/actions.ts`
- Modify: `apps/web/src/journey/options.ts`, `apps/web/src/journey/registry.ts`, `apps/web/messages/fr.json`, `apps/web/messages/en.json`
- Test: `apps/web/src/journey/registry.test.ts`, `apps/web/src/journey/messages.test.ts`

- [ ] Définition :

```ts
/** Identifiant de l'étape 3.5 (segment d'URL). */
export const DOCUMENTS_STEP_ID = 'funeral-documents';

/** Étape 3.5 : livret et affiche (variante ; photo et textes sur la synthèse). */
export const funeralDocumentsStep = defineStep({
  id: DOCUMENTS_STEP_ID,
  questions: [q.choice('documents.style', DOCUMENT_STYLES)],
  summary: 'step',
});
```

- [ ] `DOCUMENT_STYLES = ['sober', 'color'] as const` dans `journey/options.ts`. Ajouter l'étape à `STEPS_BY_ENTRY.death`, juste après `ceremonyProgramStep`, et mettre à jour le commentaire `WHY` de l'ordre.
- [ ] `texts.ts` (sans `server-only`, partagé avec l'interface) :
  - `DOCUMENT_TEXTS = { cover: 'documents.booklet.cover', tribute: 'documents.booklet.tribute', thanks: 'documents.booklet.thanks' } as const` ;
  - bornes : `cover` 200 caractères, `tribute` 1 500, `thanks` 600. WHY : les modèles ont une mise en page fixe, l'hommage doit tenir sur une page A5 ;
  - `documentTextSchema(kind)` : même nettoyage que `draftTextSchema` (CRLF → LF, trim, sans NUL, non vide), avec la borne du texte ;
  - `readDocumentTexts(answers)` : `{ cover, tribute, thanks }`, chaque texte enregistré et valide, sinon `null`.
- [ ] `texts-service.ts` (`server-only`), `saveDocumentText({ dossierId, kind, text })` :
  - valide l'entrée ;
  - vérifie que le dossier existe et que l'étape 3.5 est ouverte (`isStepOpen`) ;
  - écrit par `upsertAnswer`. La RLS de `journey_answer` exige contributeur et plus ; 42501 donne `forbidden` ;
  - codes d'erreur et forme de résultat comme `saveDraft`.
- [ ] `actions.ts` : `saveDocumentTextAction`, avec session exigée et entrée réduite à un objet, comme `improveDraftAction`.
- [ ] Test de registre : aucune question d'aucune étape n'utilise une clé de `DOCUMENT_TEXTS`. WHY : ces clés n'appartiennent pas au moteur ; on garde la garantie de `assertUniqueSteps`.
- [ ] Textes FR/EN :
  - `journey.steps.funeral-documents.*`, avec les mêmes clés que les autres étapes ;
  - `journey.q.documents.style.title` / `.hint` ;
  - options `sober` / `color` (FR « Sobre », « Couleur » ; EN « Simple », « Colour »).
- [ ] Tests d'abord, puis implémentation ; tests, typecheck et lint verts ; commit `feat(journey): add the booklet and poster step and save its texts`.

### Task 4: Photo de la personne (module `documents/photo`)

**Files:**

- Create, dans `apps/web/src/modules/documents/photo/` : `schema.ts`, `repo.ts`, `service.ts`, `actions.ts`, `http.ts`, `ui/PhotoCapture.tsx`, `ui/photoError.ts` (+ tests de chacun)
- Create: `apps/web/src/app/api/dossiers/[dossierId]/photo/route.ts`
- Modify: `apps/web/messages/fr.json`, `apps/web/messages/en.json`

- [ ] `schema.ts` :
  - `PHOTO_BUCKET = 'dossier-photos'`, `PHOTO_MAX_BYTES = 5 * 1024 * 1024`, type unique `image/jpeg` ;
  - schémas Zod `PreparePhotoSchema` (`dossierId`, `mimeType`, `sizeBytes`) et `PhotoRefSchema` (`dossierId`, `photoId`) ;
  - pour la signature JPEG, réutiliser `sniffImageType` de `modules/budget/receipts/schema.ts` (import direct) et n'accepter que `'image/jpeg'`.
- [ ] `repo.ts` (`server-only`, client utilisateur `getSupabaseServer`) :
  - `insertPhoto(dossierId)` ;
  - `createPhotoUploadUrl(path)` ;
  - `setCurrentPhoto(photoId)`, par `rpc('set_dossier_photo')` ;
  - `getCurrentPhoto(dossierId)`, qui lit la photo courante sous la RLS ;
  - `downloadPhoto(path)`, qui renvoie des octets ;
  - `createPhotoReadUrl(path)` (5 minutes).
  - Reprendre `fail`, `storageFail` et `isMissingObject` des reçus : les copier dans un petit module partagé seulement si la copie dépasse quelques lignes. Sinon, les dupliquer avec un `// WHY:` qui cite l'original.
- [ ] `service.ts` :
  - `preparePhotoUpload(raw)` et `setDossierPhoto(raw)` : rôle coordinateur et plus contrôlé par `getMyRole` + `hasRole` avant l'écriture. La RLS reste la règle de référence ;
  - `currentPhotoBytes(dossierId)` : `{ ok: true; data: Uint8Array | null }`. Il renvoie `null` sans photo, et aussi quand la signature n'est pas JPEG (avec une trace sans contenu). Une erreur de lecture est journalisée et vaut « sans photo » : un document sans photo vaut mieux qu'un échec ;
  - table `CODES` : 42501 → `forbidden`, 28000 et PGRST301 → `unauthenticated`, TL006 → `photo_missing`, TL011 → `too_many_photos`, TL012 → `not_found`.
- [ ] `actions.ts` : `preparePhotoAction` et `setDossierPhotoAction`, qui appelle `revalidatePath` de la synthèse.
- [ ] `http.ts` + route `photo/route.ts` (`runtime = 'nodejs'`, `dynamic = 'force-dynamic'`) : redirection 303 vers un lien signé de 5 minutes, comme `receiptRedirect`. Elle sert la miniature de la synthèse : 401 sans session, 404 sans photo ou sans droit, `no-store`, `nosniff`, `Referrer-Policy: no-referrer`.
- [ ] `PhotoCapture` (client), sur le modèle de `ReceiptCapture` :
  - `<input type="file" accept="image/*">` ; `shrinkImage` (import direct depuis `modules/budget/receipts/ui/shrinkImage`) ;
  - si le résultat n'est pas un JPEG, message « photo illisible » et aucun envoi ;
  - puis `preparePhotoAction`, `uploadToSignedUrl` (`getSupabaseBrowser`) et `setDossierPhotoAction`. Sur TL006, un seul nouvel essai après une courte pause, puis un message ;
  - affiché seulement pour un coordinateur et plus ; les autres membres voient la photo, sans bouton ;
  - texte d'aide : « Facultatif. Les documents fonctionnent sans photo. »
- [ ] Tests d'abord :
  - service : rôles, codes, signature non JPEG → `null`, lecture en échec → `null` journalisé ;
  - repo : appels du client simulé, comme `receipts/repo.test.ts` ;
  - réponse HTTP : statuts et en-têtes ;
  - `PhotoCapture` (jsdom) : chemin réussi, photo non JPEG refusée, TL006 réessayé une fois, lecteur sans bouton ;
  - messages FR/EN de chaque erreur, typés comme `receiptError`.
- [ ] Tests, typecheck et lint verts ; commit `feat(documents): upload the person's photo`.

### Task 5: Données des modèles et contrôle « prêt » (fonctions pures)

**Files:**

- Create: `apps/web/src/modules/documents/model.ts` (+ `model.test.ts`)

- [ ] Types :
  - `DocumentKind = 'booklet.pdf' | 'poster.pdf' | 'poster.png'` (liste `DOCUMENT_KINDS`) ;
  - `DocumentStyle` ;
  - `BookletData` : `style`, `photo` (`Uint8Array | null`), `fullName`, `nickname`, `lifeDates` (« 3 mars 1950 – 12 octobre 2026 » ou une seule date), `cover`, `tribute`, `thanks`, `ceremonyDate`, `places` (libellé et texte), `program` (`ProgramItem[]`), `labels` (titres traduits) ;
  - `PosterData` : `style`, `photo`, `fullName`, `lifeDates`, `cover`, `ceremonyDate`, `moments` (au plus 5) et `labels`.
- [ ] `documentInputs({ person, dossierTitle, answers, locale })` lit les faits **directement** :
  - nom : `firstName` + `lastName` de la fiche, sinon le titre du dossier, comme la page brouillon ;
  - naissance : `person.birthDate` ;
  - décès : la réponse `death.date` prime sur `person.deathDate` ;
  - date des obsèques : `ceremonyDate(answers['ceremony.date'], locale)` ;
  - lieux : `ceremonyPlaces(answers)` ;
  - programme : `sortedProgram(answers['ceremony.program'])` ;
  - textes : `readDocumentTexts(answers)` ;
  - variante : `answers['documents.style']` si c'est une option valide, sinon `sober`.
- [ ] `posterMoments(program)` : les 5 premiers moments par heure. WHY : une affiche carrée lisible sur un téléphone ne tient pas plus de 5 lignes. Sans programme, la liste est vide.
- [ ] `documentReadiness(kind, inputs)` renvoie la liste des manques, vide si le document est prêt :
  - `name`, si ni fiche ni titre ;
  - `ceremonyDate` ;
  - `program`, si aucun moment valide ;
  - pour le livret seulement : `cover`, `tribute`, `thanks`.
- [ ] `bookletData(inputs, labels, photo)` / `posterData(…)` ne lèvent jamais d'erreur sur des données prêtes. Les libellés traduits sont passés en paramètre : le modèle n'importe pas `next-intl`.
- [ ] Tests d'abord :
  - nom de repli ;
  - priorité de `death.date` ;
  - dates formatées FR et EN ;
  - variante inconnue → `sober` ;
  - 5 moments au plus, triés ;
  - chaque manque isolé ; livret prêt, affiche prête sans textes ;
  - aucun texte de l'IA ne remplace un fait : l'entrée `cover` ne modifie ni `fullName`, ni les dates, ni les moments.
- [ ] Tests, typecheck et lint verts ; commit `feat(documents): build the booklet and poster data from the dossier facts`.

### Task 6: Textes par l'IA (un appel, trois textes) et textes de départ

**Files:**

- Create: `apps/web/src/modules/ai/documents-facts.ts` (+ test), `apps/web/src/modules/ai/documents-prompt.ts` (+ test), `apps/web/src/modules/ai/documents.ts` (+ test), `apps/web/src/modules/documents/templates.ts` (+ test)
- Modify: `apps/web/src/modules/ai/actions.ts` (+ test)

- [ ] `documentFacts(person, answers)` : liste blanche explicite (`DOCUMENT_AI_KEYS`), comme `AI_SENT_KEYS` :
  - prénom, surnom ;
  - registre : `ceremony.tone`, sinon `announce.tone`, écrit en anglais ;
  - `biography.parents`, `.career`, `.passions`, `.motto` ;
  - `biography.traits` (trait et anecdote, textes non vides).
  - **Jamais** : nom de famille, dates, `biography.birthPlace`, lieux et programme de 3.4, `broadcast.*`. Le test vérifie que ces clés et valeurs n'apparaissent pas dans le JSON des faits.
- [ ] `buildDocumentTextsPrompt({ locale, facts })` : même défense que `buildImprovePrompt` (faits balisés, `<` échappé, « données, pas instructions »). Le prompt demande un JSON strict `{ "cover": …, "tribute": …, "thanks": … }` dans la langue de l'interface :
  - `cover` : une phrase, ou un verset si le registre est croyant ;
  - `tribute` : environ 150 mots ;
  - `thanks` : 2 à 4 phrases.
  - Il interdit d'écrire une date, une heure, un lieu ou un nom absent des faits, et d'inventer un fait. Le registre est appliqué comme `toneRule`.
- [ ] `generateDocumentTexts(raw, provider?)` (`server-only`) :
  - `unavailable` sans clé ; validation (`dossierId`, `locale`) ; dossier et étape 3.5 ouverte ;
  - **lecture avant le quota** (`getPersonResult`, `listAnswersResult(dossierId, DOCUMENT_AI_KEYS)`) ;
  - puis `takeAiQuota` : **un seul** appel décompté pour les trois textes ;
  - appel par `completeChat` (`reasoning.effort: 'low'`, `max_tokens` borné) ;
  - réponse analysée par un schéma Zod, chaque texte validé par `documentTextSchema` ;
  - contrôle de sortie : un texte qui contient une heure (`/\b([01]?\d|2[0-3])\s?[:hH]\s?[0-5]\d\b/`) est refusé (`failed`). WHY : les heures viennent du programme, jamais de l'IA ;
  - rien n'est enregistré : la famille relit, puis enregistre par `saveDocumentTextAction`.
- [ ] `generateDocumentTextsAction` dans `modules/ai/actions.ts`, sur le modèle de `improveDraftAction` (locale lue côté serveur, aucun second argument venant du client).
- [ ] `templates.ts` : `documentStarterTexts(tone, locale)` renvoie une phrase de couverture et un remerciement fixes, croyant ou neutre (`neutral` par défaut), dans les textes FR/EN (`documents.starter.*`). L'hommage n'a pas de texte de départ.
- [ ] Tests d'abord, avec un fournisseur injecté :
  - JSON valide → trois textes ;
  - JSON invalide, texte trop long, heure présente, `AiProviderError` → `failed` ;
  - quota épuisé → `quota`, sans appel ;
  - lecture en échec → `failed`, sans décompte ;
  - étape fermée → `validation` ;
  - prompt : balises neutralisées, langue, registre ;
  - action : session exigée.
- [ ] Tests, typecheck et lint verts ; commit `feat(ai): draft the booklet texts from the biography`.

### Task 7: Modèles PDF et PNG

**Files:**

- Create: `apps/web/src/modules/documents/theme.ts`, `apps/web/src/modules/documents/pdf/Booklet.tsx`, `apps/web/src/modules/documents/pdf/PosterPdf.tsx`, `apps/web/src/modules/documents/png/PosterImage.tsx`, `apps/web/src/modules/documents/render.ts` (+ `render.test.tsx`)

- [ ] `theme.ts` : `DOCUMENT_THEMES: Record<DocumentStyle, { ink, accent, muted, background }>`. Les couleurs viennent de `globals.css` : sobre = `#2d3250` / `#788199` sur blanc ; couleur = `#50aac3` et `#db8186` en accents. Une constante commentée par couleur.
- [ ] `Booklet` (A5, 4 pages, `registerPdfFonts()`) :
  1. couverture : photo si présente (cadre fixe, `objectFit: 'cover'`), nom, surnom, dates de vie, phrase de couverture ;
  2. hommage ;
  3. programme : date des obsèques, lieux, tableau heure / moment / lieu / responsable ;
  4. remerciements.
  - Un programme de 40 moments doit tenir : `wrap` autorisé sur la page 3, en-tête de tableau répété (`fixed`). Le document compte alors plus de 4 pages ; c'est accepté.
- [ ] `PosterPdf` (A4) : photo, nom, dates de vie, phrase de couverture, date des obsèques, au plus 5 moments (heure, moment, lieu).
- [ ] `PosterImage` (1080 × 1080, JSX `next/og`, flexbox uniquement) : mêmes données que l'affiche PDF. La photo est passée en URL `data:image/jpeg;base64,…`, et la police est lue par `readFontData()`.
- [ ] `render.ts` (`server-only`) : `renderBooklet(data)` et `renderPosterPdf(data)` (`renderToBuffer`, renvoient un `Uint8Array`), `renderPosterPng(data)` (`new ImageResponse(...).arrayBuffer()`).
- [ ] Tests d'abord, sur les **données** et sur les signatures, pas au pixel :
  - les composants reçoivent bien `BookletData` / `PosterData` : rendu avec des données types, sans exception, avec et sans photo, en sobre et en couleur, avec 40 moments aux textes accentués de 200 caractères ;
  - sortie PDF : commence par `%PDF-` ; le livret compte au moins 4 pages (`/Type /Page`, sans `/Pages`) ; l'affiche en compte 1 ;
  - sortie PNG : signature `89 50 4E 47`, dimensions lues dans l'en-tête IHDR égales à 1080 × 1080. Si `ImageResponse` ne tourne pas sous Vitest (WASM de resvg), le documenter en `// WHY:`, garder le test des données, et noter la vérification manuelle à la tâche 10.
- [ ] Mesurer le temps et la taille d'un livret de 40 moments avec photo de 1600 px. Les noter dans le message de commit (repère : moins de 3 s et moins de 2 Mo).
- [ ] Tests, typecheck et lint verts ; commit `feat(documents): render the booklet and poster templates`.

### Task 8: Route de téléchargement

**Files:**

- Create: `apps/web/src/modules/documents/http.ts` (+ `http.test.ts`), `apps/web/src/app/api/dossiers/[dossierId]/documents/[doc]/route.ts`
- Modify: `apps/web/messages/fr.json`, `apps/web/messages/en.json`

- [ ] Route (`runtime = 'nodejs'`, `dynamic = 'force-dynamic'`) : `GET` lit `dossierId`, `doc` et `?lang=`, puis délègue à `documentResponse(dossierId, doc, lang)`.
- [ ] `documentResponse` :
  - sans session : 401 ;
  - `dossierId` non UUID, `doc` hors de `DOCUMENT_KINDS`, dossier absent, pas membre (`getMyRole` nul) ou étape 3.5 fermée : 404 sans corps. On ne révèle pas l'existence du dossier ;
  - lit la fiche, les réponses (`listAnswersResult`) et la photo (`currentPhotoBytes`) avec le client utilisateur. Une lecture en échec (hors photo) donne 502, avec un corps traduit ;
  - `documentReadiness` non vide : **409**, avec un corps texte traduit qui liste les manques (`documents.missing.*`). Jamais de document vide ;
  - succès : `Content-Type` (`application/pdf` ou `image/png`) ; `Content-Disposition: attachment; filename="<nom ASCII traduit>.<ext>"` (FR `livret-obseques.pdf`, `affiche-obseques.pdf`, `affiche-obseques.png`) ;
  - en-têtes `Cache-Control: no-store` et `X-Content-Type-Options: nosniff` sur **toutes** les réponses ;
  - exception : 500 avec un corps générique traduit ; seul le nom de l'erreur est journalisé, jamais un nom ni un texte du dossier (comme `ledgerExportResponse`).
- [ ] Tests d'abord, services et rendu simulés :
  - chaque statut ;
  - en-têtes sur chaque statut ;
  - lecteur (`viewer`) autorisé ; non-membre en 404 ;
  - 409 avec les manques traduits FR et EN ;
  - `lang` invalide → FR ;
  - aucun import du client service-role : test qui lit le source de `http.ts` et de `route.ts` et refuse `admin` / `privileged`, comme les tests existants s'il y en a, sinon par `vi.mock` qui échoue.
- [ ] Tests, typecheck et lint verts ; commit `feat(documents): download the booklet and poster`.

### Task 9: Synthèse de 3.5

**Files:**

- Create: `apps/web/src/modules/documents/ui/DocumentsSynthesis.tsx` (+ test), `apps/web/src/modules/documents/ui/DocumentTexts.tsx` (+ test)
- Modify: page synthèse `app/[locale]/(dossier)/dossier/[id]/etape/[stepId]/synthese/page.tsx`, `apps/web/messages/fr.json`, `apps/web/messages/en.json`

- [ ] Page synthèse :
  - accepter `DOCUMENTS_STEP_ID` ;
  - lire le rôle, la fiche, les réponses et la présence d'une photo (`getCurrentPhoto`) ;
  - calculer `documentReadiness` pour chaque format ;
  - rendre `DocumentsSynthesis` avant tout calcul de prestataires ou de devis (l'étape n'en a pas) ;
  - les textes de départ (`documentStarterTexts`) sont construits côté serveur et passés au composant ;
  - garder une seule page ; si elle dépasse sa taille raisonnable, extraire le chargement de 3.5 dans `modules/documents/load.ts`.
- [ ] `DocumentsSynthesis` :
  - titre et variante choisie, avec le lien « Modifier » vers la question ;
  - bloc photo : miniature (`/api/dossiers/<id>/photo`), sinon « Pas de photo » ; `PhotoCapture` pour un coordinateur et plus ;
  - `DocumentTexts` ;
  - un bloc par format : liste des manques avec un lien vers l'endroit où compléter (fiche, 3.4, textes), sinon le lien de téléchargement (`/api/dossiers/<id>/documents/<doc>?lang=<locale>`, attribut `download`) ;
  - liens « Retour au dossier » comme `StepSynthesis`.
- [ ] `DocumentTexts` (client), inspiré de `DraftEditor` :
  - trois zones de texte (couverture, hommage, remerciement), avec compteur et borne ;
  - départ : texte enregistré, sinon texte de départ (hommage vide) ;
  - « Proposer les textes avec l'IA » : `generateDocumentTextsAction`, saisie verrouillée pendant l'appel. Un texte n'est remplacé que s'il n'a pas changé depuis l'envoi ; le résultat n'est pas enregistré ;
  - bouton masqué si `aiEnabled` est faux ;
  - « Enregistrer » par texte (`saveDocumentTextAction`) ;
  - erreurs `unavailable` / `quota` / `failed` avec les messages existants (`journey.draft.ai.*`) ;
  - lecture seule pour un lecteur.
- [ ] Tests (jsdom) :
  - manques affichés et liens de téléchargement absents ; liens présents quand c'est prêt ;
  - lecteur sans bouton d'envoi ni d'enregistrement ;
  - IA masquée sans clé ;
  - texte modifié pendant l'appel non écrasé ;
  - erreur de quota affichée ;
  - enregistrement d'un texte.
- [ ] Tests, typecheck et lint verts ; commit `feat(documents): add the booklet and poster summary`.

### Task 10: Documentation et vérifications finales

- [ ] Spec du lot 3 :
  - section 1 : colonnes et RPC de `dossier_photo`, JPEG seul, TL011, TL012, TL006 réutilisé ;
  - section 4 : étape `funeral-documents`, clés des textes, un appel d'IA, liste blanche des faits, textes de départ, 409 quand un document n'est pas prêt ;
  - section 5 : tests ajoutés ;
  - section 6 : ordre de déploiement ;
  - écarts assumés ci-dessus et décisions prises sur les « Points à valider ».
- [ ] Vérification manuelle en local (`pnpm --filter @testimona/web dev`, base locale ou de préproduction **où la migration a été appliquée par l'utilisateur**) : envoyer une photo ; proposer, modifier et enregistrer les textes ; télécharger les trois formats ; ouvrir le PDF et vérifier les accents, puis le PNG dans WhatsApp Web. Sans base migrée, le noter dans la description de la PR.
- [ ] `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm --filter @testimona/web test`, `pnpm --filter @testimona/supabase test` et `pnpm --filter @testimona/web build` verts.
- [ ] Description de PR : rappeler que la migration `20261101000100_dossier_photos.sql` doit être appliquée en production **avant** la fusion, puis les types régénérés.
- [ ] Commit `docs(lot3): document the booklet and poster step`.

---

## Points à valider (avant ou pendant l'implémentation)

1. **Photo courante en deux temps** (`activated_at` et RPC `set_dossier_photo`), au lieu de « fichier avant la ligne ». Option proposée : celle du plan, calquée sur les reçus. Autre option : un chemin d'envoi libre sous `<dossier_id>/`, contrôlé par `storage.foldername`, puis une ligne qui exige l'objet. Le stockage accepterait alors des fichiers orphelins sans ligne.
2. **JPEG seul** dans le bucket (la spec dit JPEG, PNG ou WebP). Proposé : JPEG seul.
3. **Faits envoyés à l'IA.** La spec dit que l'IA rédige « à partir de la fiche, de la biographie 1.6, du programme 3.4 et du registre ». Le plan n'envoie que le prénom, le surnom, le registre et les réponses de la biographie, sans nom de famille, dates, lieux ni programme, pour que l'IA ne puisse ni reformuler ni inventer un fait. À confirmer, ou à élargir (ajout du nom de famille ?).
4. **Un appel d'IA pour les trois textes** (un seul décompte du quota de 20 par jour), au lieu d'un appel par texte. Il n'y a pas de bouton « Améliorer » par texte dans cette PR.
5. **Textes de départ sans IA** (couverture et remerciement), quand l'IA est absente ou épuisée : ajout par rapport à la spec. Les formulations FR/EN sont à relire par le produit, en particulier le verset proposé pour le registre croyant.
6. **Limite d'envoi de photos** : 20 préparations par dossier et par 24 heures (TL011), et nouveau code TL012 (photo déjà désignée ou absente). Valeurs et codes à confirmer.
7. **Contenu de l'affiche** : les 5 premiers moments du programme par heure. Il n'y a pas de choix des moments principaux par la famille dans cette PR.
8. **Documents exigeant la date des obsèques et au moins un moment** (sinon 409 et liste des manques), y compris pour l'affiche. Autre option : afficher « Date à préciser » sur l'affiche.
9. **Retrait de la photo** sans remplacement : non prévu (seul le remplacement archive l'ancienne). À ajouter (RPC d'archivage) si le produit le juge nécessaire.
10. **Police** : PT Sans (OFL, déjà celle de l'interface), téléchargée depuis `google/fonts`. Le téléchargement demande l'accord de l'utilisateur. Une autre police OFL est possible pour le titre, par exemple Montserrat, déjà utilisée.

## Risques

- **Rendu sous Vitest** : `@react-pdf/renderer` (Yoga en WASM, ESM) et `next/og` (resvg en WASM) peuvent mal tourner sous Vitest. Parade : tests de données d'abord, tests de fumée isolés, vérification manuelle à la tâche 10.
- **Coût CPU et mémoire** : le rendu se fait à chaque téléchargement, sans cache (`no-store`) ni limite de débit. Un livret avec photo prend environ 1 à 3 s. Il est acceptable pour le pilote ; c'est à surveiller sur Railway.
- **Débordement de mise en page** : un programme de 40 moments ou un hommage long. Les bornes des textes et le `wrap` de la page programme le limitent ; les tests avec 40 moments accentués le vérifient.
- **Données envoyées à OpenRouter** : la biographie peut citer des proches. L'exposition est la même que pour les annonces (`data_collection: 'deny'`), mais c'est un nouveau contenu envoyé.
- **Fichiers orphelins** : la suppression d'un dossier (cascade) supprime les lignes `dossier_photo`, pas les objets du stockage, comme pour les reçus. Pas de purge dans ce lot.
- **Branche empilée** : la PR 4 n'est pas fusionnée. Un changement de `ceremony.ts` ou de la page de synthèse lors de sa revue obligera à rebaser cette branche.
- **Migration non appliquée** : fusionner avant l'application en production casse l'envoi de photo. L'ordre est rappelé dans la PR.
