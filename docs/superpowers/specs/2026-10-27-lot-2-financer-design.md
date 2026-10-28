# Lot 2 — Financer : design

Date : 2026-10-27 · Statut : validé section par section, en attente de relecture
Références : [`parcours-proposition.html`](../../parcours-proposition.html) (budget transversal B.1 à
B.3, étape 4.2, section 9), [spec du lot 1](2026-10-27-lot-1-entrer-et-annoncer-design.md).

## Objectif

Permettre à une famille, après un décès, de :

1. estimer l'affluence et choisir un budget parmi trois scénarios (sobre, intermédiaire, complet) ;
2. tenir un registre fiable des cotisations (promises, reçues) et des dépenses ;
3. photographier un reçu et laisser l'IA préremplir la dépense ;
4. partager un bilan et clôturer les cotisations.

Aucun argent ne transite par Testimona dans ce lot.

## Décisions prises

| Sujet        | Décision                                                                                                                                                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Paiement     | Registre seul. Espèces, Airtel Money, Moov Money, virement, carte et autre sont des moyens notés dans le registre ; aucun paiement en ligne.                                                                                                     |
| Visibilité   | Réglage par dossier, `restricted` par défaut : propriétaire, coordinateurs et trésoriers voient toutes les lignes ; contributeurs et lecteurs voient les totaux, leurs propres lignes et les dépenses. Le propriétaire peut passer en `members`. |
| Saisie       | Trésorier et plus : cotisations reçues, dépenses, annulations, postes du budget, réglages. Contributeur et plus : déclarer sa propre promesse.                                                                                                   |
| Cotisants    | Nom libre sur chaque ligne, lien facultatif vers un membre du dossier (ce membre voit alors ses propres lignes).                                                                                                                                 |
| Scénarios    | Grille de référence de postes en code, avec un coût par niveau ; calcul à partir de l'affluence ; postes ensuite modifiables.                                                                                                                    |
| Prix         | Première grille proposée par Claude, chaque prix marqué « estimation à vérifier » ; à corriger par le propriétaire du projet avant la mise en production ; remplacée par les prix prestataires au lot 3.                                         |
| Reçus        | Photo conservée dans un bucket privé ; lue par l'IA (OpenRouter, modèle qui lit les images) pour préremplir la dépense ; le trésorier valide toujours.                                                                                           |
| Bilan        | Écran dans l'application et texte de synthèse partageable (totaux seulement). Clôture par le trésorier, réouverture par le propriétaire seul.                                                                                                    |
| Monnaie      | XAF uniquement, montants entiers. Une cotisation en devise est saisie convertie, avec une note.                                                                                                                                                  |
| Architecture | B.1 et B.2 dans le moteur de questions du lot 1 ; registre, reçus et bilan dans un module `budget` avec ses écrans et ses tables. Aucun montant dans `journey_answer`.                                                                           |

## 1. Données et sécurité

Nouvelles tables, toutes rattachées à `dossier`, RLS activée, accès décidé par
`is_dossier_member()` et le rang des rôles (lot 0 : owner 50, coordinator 40, treasurer 30,
contributor 20, viewer 10). Noms en snake_case. Le code y accède avec le client utilisateur ; aucun
client service-role.

### `dossier_finance`

Une ligne par dossier, créée par le propriétaire au premier réglage ; sans ligne, la visibilité est
`restricted`.

| Colonne              | Type                                       |
| -------------------- | ------------------------------------------ |
| `dossier_id`         | uuid, clé primaire, FK `dossier` (cascade) |
| `amounts_visibility` | `restricted` (défaut) / `members`          |
| `updated_at`         | timestamptz                                |

Lecture : tout membre. Insertion et modification : propriétaire seul (visibilité des montants
individuels) ; aucune suppression. `dossier_id` et `updated_at` sont imposés par trigger.

Colonne livrée en PR 3 : `scenario` (`sober` / `intermediate` / `full`, nullable), écrite par la
fonction `set_budget_scenario(p_dossier_id, p_scenario)` (security definer, trésorier et plus,
utilisateur connecté), qui laisse la mise à jour de la table au propriétaire seul. La fonction est
signalée par l'advisor de sécurité (0029) : c'est voulu. Colonnes ajoutées plus tard : `closed_at` et
`closed_by` (clôture par le trésorier et plus, réouverture par le propriétaire seul) en PR 5.

### `budget_line`

Les postes du budget du dossier.

| Colonne                                              | Type                                                        |
| ---------------------------------------------------- | ----------------------------------------------------------- |
| `id`                                                 | uuid                                                        |
| `dossier_id`                                         | uuid, FK `dossier` (cascade)                                |
| `grid_key`                                           | text, nullable (clé de la grille, null pour un poste libre) |
| `label`                                              | text, 1 à 120 caractères                                    |
| `amount_sober`, `amount_intermediate`, `amount_full` | integer 0 à 100 000 000 (XAF)                               |
| `edited`                                             | boolean (montants modifiés à la main)                       |
| `position`                                           | integer                                                     |
| `created_at`, `updated_at`                           | timestamptz                                                 |

Les colonnes de montant portent le préfixe `amount_` parce que `full` est un mot réservé de Postgres.
Unicité (`dossier_id`, `grid_key`) quand `grid_key` n'est pas nul. Lecture : tout membre. Écriture :
trésorier et plus et utilisateur connecté (refusée quand le dossier est clôturé : colonnes de clôture en
PR 5). Au plus 100 postes par dossier (`too_many_lines`, code `TL005` levé par le trigger) : le trigger d'insertion vérifie le rôle avant
la limite, puis sérialise le comptage par un verrou `for no key update` sur le dossier. Le dossier et la
clé de grille sont figés après création.

Suppression : un poste qui porte ou a porté des dépenses ne se supprime pas, même si elles sont toutes
annulées (le registre est en ajout seul). La FK `ledger_entry.budget_line_id` est en
`on delete no action` (code `23503`).

Les postes de la grille sont créés par « Créer les postes », refusé sans affluence renseignée
(`no_attendance`) et sans effet si la grille existe déjà. « Recalculer » est refusé sans affluence et ne
touche que les postes non modifiés (`edited = false`) dont un montant change.

### `ledger_entry`

Le registre, **en ajout seul** : aucune policy UPDATE ni DELETE, et `revoke update, delete` pour
`anon` et `authenticated`. Une erreur se corrige par une annulation, jamais par une modification.

| Colonne           | Type                                                                                                             |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| `id`              | uuid                                                                                                             |
| `dossier_id`      | uuid, FK `dossier` (`on delete restrict`)                                                                        |
| `kind`            | `pledge` / `receipt` / `expense` / `reversal`                                                                    |
| `amount`          | integer, 1 à 100 000 000 (XAF)                                                                                   |
| `method`          | `cash` / `airtel_money` / `moov_money` / `transfer` / `card` / `other` ; obligatoire pour `receipt` et `expense` |
| `party_name`      | text, 1 à 120 caractères (cotisant ou fournisseur)                                                               |
| `member_id`       | uuid, nullable, FK `auth.users` (`on delete set null`), membre du dossier lié                                    |
| `pledge_id`       | uuid, nullable, FK `ledger_entry` : promesse concernée, `receipt` seulement                                      |
| `note`            | text, 0 à 500 caractères                                                                                         |
| `occurred_on`     | date, du 2000-01-01 à demain au plus                                                                             |
| `reverses_id`     | uuid, nullable, unique, FK `ledger_entry` (annulations seulement)                                                |
| `reverses_kind`   | `pledge` / `receipt` / `expense`, nullable : type de la ligne annulée (annulations seulement)                    |
| `idempotency_key` | uuid, unique par dossier                                                                                         |
| `created_by`      | uuid, nullable, défaut `auth.uid()`, FK `auth.users` (`on delete set null`)                                      |
| `created_at`      | timestamptz                                                                                                      |

`budget_line_id` (livré en PR 3) : FK `budget_line` en `on delete no action`, dépenses seulement
(contrainte check), du même dossier ; effacé sur une annulation.

Usages : une promesse (`pledge`) est une intention de cotiser ; une cotisation reçue (`receipt`) est
liée ou non à une promesse ; une promesse peut être honorée en plusieurs versements partiels
(`pledge_id`), jusqu'à son montant ; une dépense (`expense`) ; une annulation (`reversal`) vise une
ligne existante.

Contraintes : `reverses_id` et `reverses_kind` obligatoires pour `reversal` et interdits sinon ;
unicité de `reverses_id` (une ligne n'est annulée qu'une fois) ; `pledge_id` réservé aux
cotisations reçues. Le trigger d'insertion (security definer, `search_path` vide) :

1. vérifie le rôle en premier (trésorier pour tout type, contributeur pour une promesse), pour qu'un
   non-membre ne puisse pas sonder le registre par les codes d'erreur suivants ;
2. rejoue d'office une clé d'idempotence déjà utilisée dans le dossier par une erreur `23505`, sans
   rejuger la ligne (le dépôt la traite comme un double envoi) ; la contrainte d'unicité couvre les
   envois concurrents ;
3. impose `created_by = auth.uid()` et `created_at` ; refuse une date postérieure à demain (`23514`) ;
4. pour une annulation : verrouille la ligne visée ; refuse (`TL001`) une ligne absente, d'un autre
   dossier ou elle-même une annulation ; reprend son montant, son nom, son membre et son type
   (`reverses_kind`) ;
5. pour une cotisation liée à une promesse : verrouille la promesse ; refuse (`TL002`) une promesse
   absente, d'un autre dossier, qui n'est pas une promesse, déjà annulée ou déjà soldée par les
   versements actifs ; reprend le membre de la promesse ;
6. refuse (`TL003`) un `member_id` qui n'est pas membre du dossier (sauf versement lié à une promesse) ;
7. refuse (`TL004`) le poste d'une dépense qui appartient à un autre dossier. TL004 ne vise que les
   dépenses : sur un autre type, la contrainte check refuse `budget_line_id` (`23514`).

Insertion (policy) : trésorier et plus pour tout type ; contributeur et plus pour un `pledge` à son
propre nom (`member_id = auth.uid()`). Le refus des insertions quand le dossier est clôturé arrive en
PR 5. Une ligne ne se supprime pas avec le dossier : tant qu'un dossier a des lignes de registre, il
ne peut pas être supprimé ; l'archivage et l'export du registre à la clôture (PR 5) lèveront cette
contrainte.

Lecture : trésorier et plus, toutes les lignes. Autres membres : toutes les lignes si
`amounts_visibility = 'members'` ; sinon seulement les dépenses, leurs propres lignes
(`member_id = auth.uid()`) et les annulations de dépenses (`reverses_kind = 'expense'`) ou de leurs
propres lignes.

### `ledger_totals(p_dossier_id uuid)`

Fonction security definer, `search_path` vide, exécutable par `authenticated` seulement, qui exige un
utilisateur connecté et un membre du dossier et renvoie uniquement trois sommes : `received` (reçu),
`pledged_open` (reste à verser des promesses ouvertes : montant moins les versements actifs liés,
jamais négatif) et `spent` (dépensé). Les lignes annulées sont écartées, et les annulations ne comptent
pas. Le budget de référence est le total du scénario retenu s'il existe des postes, sinon le budget
envisagé à l'étape B.2 ; le reste à couvrir se calcule à partir de ces valeurs. Les totaux étant visibles de tout membre, un montant
individuel peut se déduire en comparant les totaux dans le temps en mode restreint ; ce compromis est
assumé.

### `ledger_spent_by_line(p_dossier_id uuid)`

Fonction security invoker (la RLS du registre suffit : les dépenses sont visibles de tout membre) qui
renvoie les dépenses actives par poste, annulations écartées.

### `receipt` et bucket `receipts`

| Colonne        | Type                                                             |
| -------------- | ---------------------------------------------------------------- |
| `id`           | uuid                                                             |
| `dossier_id`   | uuid, FK `dossier` (cascade)                                     |
| `entry_id`     | uuid, nullable, unique, FK `ledger_entry` (la dépense justifiée) |
| `storage_path` | text, `<dossier_id>/<uuid>.<ext>`                                |
| `mime_type`    | `image/jpeg` / `image/png` / `image/webp`                        |
| `size_bytes`   | integer, 1 à 5 242 880                                           |
| `created_by`   | uuid, nullable, `on delete set null`                             |
| `created_at`   | timestamptz                                                      |

Bucket `receipts` privé, 5 Mo, JPEG, PNG et WebP.

- Un reçu par dépense (`entry_id` unique, `on delete no action`). `entry_id` est la seule colonne
  modifiable (droit de colonne et trigger) : une seule fois, vers une dépense du même dossier
  (`TL006`), et seulement une fois la photo présente au stockage (version courante, non archivée ;
  `TL006` sinon). Le même rattachement rejoué est sans effet. Aucune suppression dans ce lot.
- `storage_path` est imposé par le trigger (`<dossier_id>/<id>.<ext>`), unique, et vérifié par une
  contrainte check ; `created_by` et `created_at` sont imposés (`auth.uid()`, `now()`).
- Limite `TL007` : au plus 200 reçus par dossier, en comptant les rattachés et les non rattachés de
  moins de 24 h (une préparation abandonnée ne bloque pas le dossier, faute de suppression). Rôle
  vérifié avant la limite, verrou `for no key update` sur le dossier.
- Envoi : seulement sur le chemin d'un reçu préparé, non rattaché, par un trésorier. Le lien d'envoi
  est un lien signé de Supabase (2 heures, non réglable) à usage unique : l'unicité du stockage
  l'impose, jamais d'upsert, donc aucun remplacement d'une photo.
- Lecture : l'objet suit la RLS de `receipt` (une seule règle). Tout membre lit un reçu rattaché,
  comme les dépenses, visibles de tous quel que soit le réglage ; un reçu non rattaché n'est lisible
  que par trésorier et plus. Lien de lecture signé de 5 minutes, créé à la demande par la route
  `/api/receipts/[receiptId]` : 303 vers le lien (`no-store`, `Referrer-Policy: no-referrer`), 401
  sans session, 404 si le reçu est absent ou interdit.
- Un dossier sans registre peut être supprimé : ses reçus non rattachés partent avec lui, les objets
  restent au stockage (nettoyage hors lot 2).

## 2. Parcours et écrans

### Étapes du moteur (porte « décès », après 2.3)

| Étape         | Questions                                                                                                                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B.1 Affluence | `attendance.close` (famille directe), `attendance.extended` (famille élargie), `attendance.friends` (amis et collègues), `attendance.community` (communauté religieuse ou associative), `attendance.nights` (nuits de veillée) — nombres entiers |
| B.2 Budget    | `budget.level` : sobre / intermédiaire / complet                                                                                                                                                                                                 |

Nouvelle sorte de question `q.number` (entier borné, sans unité dans ce lot). B.1 et B.2 se terminent
sur la page « Budget prévisionnel » (`/dossier/[id]/budget`) : fourchette d'affluence et trois totaux
côte à côte, calculés sur la fourchette haute. La réponse B.2 est le niveau envisagé par la famille ; le
scénario retenu (`dossier_finance.scenario`, par un trésorier) et les postes enregistrés
(`budget_line`) sont livrés en PR 3.

### Écrans

| Route                       | Contenu                                                                                                                                                                                                                                                                                                                                                                                                 | Accès  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `/dossier/[id]/cotisations` | Totaux (budget de référence, reçu, promis non versé, dépensé, reste) ; derniers mouvements visibles ; trésorier : ajouter une cotisation (liée ou non à une promesse), une dépense, annuler une ligne ; contributeur : « Je promets une participation » ; propriétaire : visibilité des montants. Onglet « Postes » (PR 3) à l'adresse `/dossier/[id]/cotisations/postes`. PR 4 : photographier un reçu | membre |
| `/dossier/[id]/bilan`       | Totaux, dépenses par poste, cotisations nominatives selon la visibilité ; « Partager le bilan » (texte de totaux, copie ou WhatsApp) ; « Clôturer » (trésorier), « Rouvrir » (propriétaire)                                                                                                                                                                                                             | membre |

Tableau de bord : carte « Cotisations » (reçu sur budget de référence) avec lien vers l'écran. Une
annulation s'affiche avec sa ligne d'origine ; aucune ligne ne disparaît.

### Reçu

Photo (réduite dans le navigateur : 1600 px, JPEG) → lien d'envoi signé préparé par le serveur →
envoi direct au stockage → `readReceipt` → formulaire de dépense prérempli (montant, date,
fournisseur, poste proposé) → le trésorier corrige et enregistre. Sans IA (clé absente, quota
atteint, échec, photo trop lourde pour l'IA), le formulaire reste vide avec la photo jointe.

- Lecture IA réservée au trésorier et plus. Le préremplissage ne remplace jamais un champ déjà saisi.
- Rattachement après l'enregistrement : la dépense est d'abord enregistrée, puis le reçu rattaché.
  - `receipt_unlinked` : la dépense reste enregistrée, le rattachement a échoué (provisoire). Les
    champs sont figés ; « Réessayer de joindre le reçu » rejoue la même clé d'idempotence (le dépôt
    renvoie la dépense existante) ; « Continuer sans le reçu » abandonne la photo.
  - `receipt_unavailable` : échec définitif (photo absente, reçu déjà rattaché ou invalide) ; la
    dépense reste, le reçu ne se joint plus.
  - `changed_since_saved` : renvoi dont la saisie a changé depuis l'enregistrement ; la comparaison
    du double envoi porte sur tous les champs de la dépense, pas seulement la clé.
- « Voir le reçu » sur chaque dépense qui en a un (ouvre `/api/receipts/[receiptId]`).

## 3. Code et IA

### `apps/web/src/modules/budget/`

| Fichier                    | Rôle                                                                                                                                                                                                                                                                                            |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `grid.ts`                  | Grille de référence : une dizaine de postes, mode (`flat`, `perPerson`, `perOccasion`, `perGuestOccasion` : occasions = jour des obsèques + nuits de veillée, la moitié de l'affluence haute chaque nuit), coût XAF par niveau, plafond de 100 000 000 XAF par poste, « estimation à vérifier » |
| `scenarios.ts`             | Fonctions pures : affluence depuis B.1, postes depuis la grille et l'affluence, totaux des trois scénarios                                                                                                                                                                                      |
| `ledger.ts`                | Fonctions pures : totaux depuis les lignes (annulations comprises), texte de bilan                                                                                                                                                                                                              |
| `schema.ts`                | Zod : montant entier 1 à 100 000 000, nom et note bornés, moyen, date, clé d'idempotence                                                                                                                                                                                                        |
| `repo.ts`                  | Seul accès base, client utilisateur                                                                                                                                                                                                                                                             |
| `service.ts`, `actions.ts` | Promesse, cotisation reçue, dépense, annulation, postes, visibilité, clôture, réouverture, préparation d'envoi de reçu                                                                                                                                                                          |

Étapes : `journey/steps/b-1-attendance.ts`, `journey/steps/b-2-budget.ts` ; `q.number` dans
`journey/types.ts` et `journey/define.ts`, avec son composant de saisie.

### `readReceipt` (dans `modules/ai`)

- Le téléchargement est fait par `modules/budget/receipts` (seul accès au stockage), qui vérifie la
  signature des octets (JPEG, PNG, WebP) et lit les postes. Une garde de 3,5 Mio s'applique avant le
  quota : au-delà, `too_large_to_read` sans consommer d'appel, photo gardée, saisie manuelle.
- `readReceipt` consomme ensuite `takeAiQuota` / `consume_ai_quota` (même quota que le lot 1 : 20
  appels par dossier et par jour), puis appelle OpenRouter avec le fournisseur du lot 1, modèle
  `anthropic/claude-opus-5.5` (lit les images), `data_collection: 'deny'`.
- Demande du JSON par la consigne `{ amount, date, vendor, gridKey }`, validé champ par champ par
  Zod : un champ invalide devient null ; `gridKey` doit être une clé de la grille ou null. Une
  réponse vide est traitée comme un échec.
- Envoie seulement l'image, aucune donnée du dossier. Ne journalise ni le contenu du reçu ni la
  réponse. Le résultat n'est qu'un préremplissage.

## 4. Erreurs, tests et livraison

### Erreurs

- Saisie refusée (montant invalide, dossier clôturé, droits) : message sous le champ, saisie conservée.
- Double envoi : clé d'idempotence générée par le navigateur, unique par dossier ; un second envoi
  renvoie la ligne existante.
- Annulation d'une ligne déjà annulée ou d'une annulation : refus explicite.
- Reçu trop lourd, mauvais type, IA en échec, quota atteint, image trop lourde pour l'IA
  (`too_large_to_read`) : photo jointe, saisie manuelle possible.
- Rattachement du reçu après l'enregistrement : `receipt_unlinked` (provisoire, réessai ou abandon),
  `receipt_unavailable` (définitif), `changed_since_saved` (saisie modifiée depuis l'enregistrement).
- Limite de reçus (`TL007`) et rattachement refusé (`TL006`) : message explicite, dépense conservée.
- Journalisation : codes et contexte, jamais de montant nominatif ni de contenu de reçu.

### Tests

- SQL (PGlite) : RLS de chaque table ; ajout seul (UPDATE et DELETE refusés) ; droits par rôle ;
  visibilité `restricted` / `members` ; clôture et réouverture ; annulation unique, même montant, même
  dossier ; versements partiels d'une promesse (jusqu'au montant promis) ; idempotence (rejeu → 23505) ; `ledger_totals` (sommes seulement, membre exigé) ; policies du bucket
  `receipts`.
- Unitaires : grille, affluence, scénarios, totaux avec annulations, texte de bilan, schémas,
  services (base simulée), `readReceipt` (fournisseur simulé, JSON invalide, quota, clé absente).
- Playwright : les écrans Cotisations et Bilan exigent une connexion ; le parcours complet attend
  l'environnement e2e.

### Livraison (5 PR)

1. Budget (livrée, PR #9) : `q.number`, grille, scénarios, étapes B.1 et B.2, page « Budget
   prévisionnel » (`/dossier/[id]/budget`) calculée à la volée. Aucune table : la réponse B.2 est le
   niveau envisagé par la famille.
2. Registre : `dossier_finance` (visibilité des montants individuels, propriétaire seul),
   `ledger_entry` (promesses, cotisations reçues liées ou non à une promesse, versements partiels
   d'une promesse, dépenses, annulations ; ajout seul ; clé d'idempotence), `ledger_totals`, écran
   Cotisations, carte du tableau de bord. Le budget de référence est le budget envisagé à l'étape B.2.
3. Postes : scénario retenu par le trésorier (`dossier_finance.scenario`), `budget_line` (onglet
   « Postes »), rattachement d'une dépense à un poste (`ledger_entry.budget_line_id`).
4. Reçus : bucket privé, `receipt` (un par dépense, rattaché une fois, photo exigée, limite de 200),
   envoi signé à usage unique, lecture par lien de 5 minutes, `readReceipt`, préremplissage,
   rattachement après l'enregistrement, « Voir le reçu ».
5. Bilan et clôture : écran Bilan, texte de partage, clôture et réouverture, archivage et export du
   registre, colonnes de clôture (`closed_at`, `closed_by`).

### Hors lot 2

Paiement en ligne (Stripe diaspora, Mobile Money) ; prix réels des prestataires (lot 3) ; export
PDF ; lien public vers le bilan ; suppression de reçus.

### Configuration

Aucune nouvelle variable : `OPENROUTER_API_KEY` (lot 1) sert aussi à la lecture des reçus.
