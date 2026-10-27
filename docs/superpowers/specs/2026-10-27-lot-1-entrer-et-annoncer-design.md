# Lot 1 — Entrer et annoncer : design

Date : 2026-10-27 · Statut : validé section par section, en attente de relecture
Références : [`parcours-proposition.html`](../../parcours-proposition.html) (stratégie, section 9),
[`LOT0.md`](../../LOT0.md) (socle).

## Objectif

Permettre à une famille, dans la semaine qui suit un décès, de :

1. ouvrir un dossier privé et y inviter ses proches ;
2. remplir la biographie de la personne, une question à la fois ;
3. préparer la liste de diffusion et les annonces (message immédiat, e-mail) et les partager.

Le lot 1 pose aussi le moteur de parcours que les lots suivants réutiliseront.

## Décisions prises

| Sujet       | Décision                                                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Emplacement | L'accueil (`/`) devient les trois portes du parcours. Les mémoriaux publics restent accessibles par leur lien et la recherche ; le fil actuel déménage sur `/memoriaux`. |
| Rédaction   | Modèles de texte par défaut ; bouton « Améliorer avec l'IA » (Claude) quand `ANTHROPIC_API_KEY` est configurée.                                                          |
| Invitations | Lien à usage unique par défaut ; envoi par e-mail en option quand Resend est configuré.                                                                                  |
| Données     | Tout dans le dossier, privé par défaut (tables `person`, `journey_answer`). L'espace mémoriel public viendra au lot 4, par copie des champs choisis.                     |

## 1. Données et sécurité

Nouvelles tables, toutes rattachées à `dossier` et protégées par `is_dossier_member()` (lot 0). Noms
en snake_case.

### `person`

Une ligne par dossier (`dossier_id` unique).

| Colonne                    | Type                               | Notes                                                  |
| -------------------------- | ---------------------------------- | ------------------------------------------------------ |
| `dossier_id`               | uuid, PK, FK `dossier` (cascade)   |                                                        |
| `first_name`, `last_name`  | text, non nuls, 1 à 120 caractères |                                                        |
| `nickname`                 | text, facultatif                   |                                                        |
| `birth_date`, `death_date` | date, facultatives                 | `death_date` ≥ `birth_date` si les deux sont présentes |
| `death_city`               | text, facultatif                   |                                                        |
| `death_country_code`       | char(2), facultatif                | ISO 3166-1 alpha-2                                     |
| `created_at`, `updated_at` | timestamptz                        | `updated_at` mis à jour par trigger                    |

RLS : lecture pour tout membre ; insertion et mise à jour pour `contributor` et plus ; pas de
suppression (elle suit celle du dossier).

### `journey_answer`

Une ligne par réponse. Clé primaire (`dossier_id`, `key`).

| Colonne       | Type                         | Notes                                                                                                                     |
| ------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `dossier_id`  | uuid, FK `dossier` (cascade) |                                                                                                                           |
| `key`         | text                         | clé stable, ex. `death.date`, `announce.tone`, `biography.birthPlace` ; motif `^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$` |
| `value`       | jsonb, non nul               | validé côté serveur par le schéma Zod de la question                                                                      |
| `answered_by` | uuid, FK `auth.users`        | forcé à `auth.uid()` par trigger                                                                                          |
| `updated_at`  | timestamptz                  |                                                                                                                           |

RLS : lecture pour tout membre ; insertion, mise à jour et suppression pour `contributor` et plus.

La liste de diffusion (2.1) et les brouillons d'annonces (`announce.whatsapp.text`,
`announce.email.text`) sont des réponses comme les autres.

### `dossier_invitation`

| Colonne              | Type                         | Notes                                                      |
| -------------------- | ---------------------------- | ---------------------------------------------------------- |
| `id`                 | uuid, PK                     |                                                            |
| `dossier_id`         | uuid, FK `dossier` (cascade) |                                                            |
| `role`               | `dossier_role`               | `owner` interdit (contrainte)                              |
| `email`              | text, facultatif             | renseigné seulement si l'invitation est envoyée par e-mail |
| `token_hash`         | text, unique                 | SHA-256 du jeton ; le jeton n'est jamais stocké            |
| `created_by`         | uuid, défaut `auth.uid()`    |                                                            |
| `expires_at`         | timestamptz                  | défaut `now() + 7 jours`                                   |
| `used_at`, `used_by` | timestamptz, uuid            | renseignés à l'acceptation                                 |

RLS : création, lecture et suppression (révocation) pour `coordinator` et plus.

Acceptation par `accept_dossier_invitation(p_token text) returns uuid` (security definer,
`search_path` vide, exécutable par `authenticated` seulement) : calcule l'empreinte, vérifie
existence, non-expiration et non-utilisation, ajoute le membre (ou ne fait rien s'il l'est déjà avec
un rôle supérieur), marque l'invitation utilisée, renvoie le `dossier_id`. Erreurs distinctes :
invalide, expirée, déjà utilisée.

### `ai_usage`

Compteur d'appels à l'IA. Clé primaire (`dossier_id`, `day`).

| Colonne      | Type                         |
| ------------ | ---------------------------- |
| `dossier_id` | uuid, FK `dossier` (cascade) |
| `day`        | date                         |
| `count`      | integer, défaut 0            |

Aucun droit direct pour `anon` ni `authenticated`. Incrémentation par
`consume_ai_quota(p_dossier_id uuid, p_daily_limit int default 20) returns boolean` (security
definer) : exige `contributor` et plus, incrémente si `count < limite`, renvoie `false` sinon.

### Règles générales

- Le code accède à ces tables avec le client utilisateur (RLS). Aucun client service-role.
- Les tests PGlite couvrent chaque règle (voir section 4).

## 2. Parcours et écrans

Routes (toutes sous `[locale]`, FR et EN) :

| Route                                    | Contenu                                                                                                                                                                 | Accès                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `/`                                      | Visiteur : trois portes + recherche de mémoriaux. Connecté : « Mes dossiers », puis les portes. La porte « Après les funérailles » est affichée « bientôt disponible ». | public                                  |
| `/memoriaux`                             | Fil actuel (témoignages récents, suggestions), composants existants réutilisés                                                                                          | public                                  |
| `/dossier/nouveau?porte=deces\|preparer` | Trois questions, une par écran : qui (prénom, nom), où (pays, ville), votre lien avec la personne. Crée `dossier`, `person` et la réponse `creator.relationship`.       | connecté                                |
| `/dossier/[id]`                          | Tableau de bord : avancement par étape, carte « Prochaine question », membres                                                                                           | membre                                  |
| `/dossier/[id]/etape/[stepId]?q=<n>`     | Écran question plein écran navy, une question à la fois, Revenir / Passer / Suivant, enregistrement à la saisie                                                         | membre                                  |
| `/dossier/[id]/etape/[stepId]/brouillon` | Brouillon (2.2, 2.3) : modifier, « Améliorer avec l'IA » si disponible, copier, partager sur WhatsApp (`https://wa.me/?text=…`)                                         | membre                                  |
| `/dossier/[id]/membres`                  | Membres et rôles ; créer un lien d'invitation (copier, WhatsApp, e-mail si Resend) ; révoquer                                                                           | membre ; actions : coordinateur et plus |
| `/invitation/[jeton]`                    | Rejoint le dossier après connexion                                                                                                                                      | connecté                                |

`/dossier` et `/invitation` rejoignent `PROTECTED_PREFIXES` dans le middleware.

Étapes du lot 1 :

| Étape                                   | Portes          | Questions (clés)                                                                                                                                      |
| --------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.6 Biographie, « répondre à sa place » | décès, préparer | `biography.birthPlace`, `biography.parents`, `biography.career`, `biography.traits` (liste trait + anecdote), `biography.passions`, `biography.motto` |
| 2.1 Liste de diffusion                  | décès           | `broadcast.contacts` (liste : nom, téléphone facultatif, cercle, membre qui appelle, appel prioritaire)                                               |
| 2.2 Message immédiat                    | décès           | `death.date`, `death.mentionCause`, `announce.tone` → brouillon `announce.whatsapp.text`                                                              |
| 2.3 Annonce par e-mail                  | décès           | `announce.aboutPerson`, `announce.practicalInfo`, `announce.flowersOrDonations` → brouillon `announce.email.text`                                     |

Cercles : `close_family`, `extended_family`, `colleagues`, `parish`, `village`, `other`. Tons :
`believer`, `neutral`.

L'annonce par e-mail se copie dans la messagerie de l'utilisateur ; l'application n'envoie pas
d'e-mails groupés au lot 1.

## 3. Moteur de parcours et IA

### `apps/web/src/journey/`

| Fichier                                                                                                                      | Rôle                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `types.ts`                                                                                                                   | `Step`, `Question` (union : `shortText`, `longText`, `date`, `choice`, `place`, `list`), schéma Zod par type    |
| `define.ts`                                                                                                                  | `defineStep()` et fabriques `q.shortText()`, `q.choice()`…                                                      |
| `steps/1-6-biography.ts`, `steps/2-1-broadcast-list.ts`, `steps/2-2-immediate-message.ts`, `steps/2-3-email-announcement.ts` | Définitions d'étapes                                                                                            |
| `registry.ts`                                                                                                                | Étapes et ordre par porte ; `getStep(id)` ; `findQuestion(key)`                                                 |
| `progress.ts`                                                                                                                | Fonctions pures : avancement par étape, prochaine question non répondue et non passée                           |
| `templates/`                                                                                                                 | Fonctions pures : brouillons 2.2 et 2.3 en FR et EN, tons croyant et neutre, tolérantes aux réponses manquantes |
| `ui/`                                                                                                                        | `QuestionScreen` et un composant de saisie par type                                                             |

Une question « passée » est enregistrée comme la réponse `{ "skipped": true }`, pour que la
prochaine question l'ignore ; elle reste listée « à compléter » sur le tableau de bord.

### `apps/web/src/modules/dossier/`

`schema.ts` (Zod), `repo.ts` (seul accès base, client utilisateur), `service.ts`, `actions.ts`.
`saveAnswer` refuse une clé absente du registre ou une valeur qui ne passe pas le schéma de sa
question. Le jeton d'invitation est généré côté serveur (32 octets aléatoires, base64url) et
transmis une seule fois dans le lien.

### `apps/web/src/modules/ai/`

- `improveDraft({ kind, locale, text, answers })` renvoie un texte amélioré ou une erreur typée
  (`unavailable`, `quota`, `failed`).
- Implémentation Claude via `@anthropic-ai/sdk`, côté serveur seulement. Modèle choisi à
  l'implémentation après vérification de la documentation à jour.
- Si `ANTHROPIC_API_KEY` est absente : `unavailable`, bouton masqué.
- Données envoyées : réponses de l'étape, prénom, nom et dates de la personne. Jamais les contacts
  ni les téléphones.
- Quota : `consume_ai_quota` avant chaque appel, 20 par dossier et par jour.
- Le résultat remplace le brouillon affiché mais n'est enregistré qu'après action de l'utilisateur.

### E-mail facultatif

L'invitation par e-mail réutilise `lib/email/resend.ts` si `RESEND_API_KEY` et `RESEND_FROM_EMAIL`
sont définies ; sinon l'option n'est pas affichée.

### Contraintes du lot 0

Accès base uniquement dans les `repo.ts` ; aucun import du client service-role ; 300 lignes au
maximum par fichier ; nouveaux fichiers formatés par Prettier.

## 4. Erreurs, tests et livraison

### Erreurs

- Réponse refusée : message sous la question, saisie conservée.
- Lecteur (`viewer`) : questions affichées en lecture seule.
- Invitation invalide, expirée ou utilisée : page explicative, invitation à demander un nouveau lien.
- IA en échec ou quota atteint : brouillon conservé, message, parcours jamais bloqué.
- Journalisation serveur : code et contexte, jamais le contenu des réponses.

### Tests

- SQL (PGlite) : RLS de `person`, `journey_answer`, `dossier_invitation`, `ai_usage` ; invitation
  à usage unique, expirée, rôle propriétaire refusé ; plafond d'IA.
- Unitaires : schéma de chaque étape, `progress.ts`, `templates/`, services du dossier (base
  simulée), `improveDraft` (fournisseur simulé).
- Playwright : créer un dossier, répondre à une question, voir l'avancement ; accueil à trois portes ;
  `/memoriaux`.

### Livraison (4 PR)

1. Dossier et membres : migrations, nouvel accueil et `/memoriaux`, création du dossier, tableau de
   bord minimal, invitations.
2. Moteur et biographie : `journey/`, écran question, étape 1.6.
3. Annoncer : étapes 2.1 à 2.3, modèles de texte, partage WhatsApp.
4. IA : `improveDraft`, `ai_usage`, bouton « Améliorer avec l'IA ».

### Hors lot 1

Autres étapes des phases 1, 3 et 4 ; envoi groupé d'e-mails ; questions déléguées sans compte ;
espace mémoriel public ; réponses « privées » ; Mobile Money.

### Configuration (côté propriétaire du projet)

`ANTHROPIC_API_KEY` (IA), `RESEND_API_KEY` et `RESEND_FROM_EMAIL` (e-mails), à ajouter dans Railway.
Aucune ne bloque le développement.
