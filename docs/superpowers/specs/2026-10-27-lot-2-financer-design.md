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

Une ligne par dossier, créée au premier besoin.

| Colonne              | Type                                        |
| -------------------- | ------------------------------------------- |
| `dossier_id`         | uuid, clé primaire, FK `dossier` (cascade)  |
| `scenario`           | `sober` / `intermediate` / `full`, nullable |
| `amounts_visibility` | `restricted` (défaut) / `members`           |
| `closed_at`          | timestamptz, nullable                       |
| `closed_by`          | uuid, nullable                              |
| `updated_at`         | timestamptz                                 |

Lecture : tout membre. Écriture du scénario : trésorier et plus. Visibilité : propriétaire seul.
Clôture : trésorier et plus ; réouverture (`closed_at` remis à null) : propriétaire seul.

### `budget_line`

Les postes du budget du dossier.

| Colonne                         | Type                                                        |
| ------------------------------- | ----------------------------------------------------------- |
| `id`                            | uuid                                                        |
| `dossier_id`                    | uuid, FK `dossier` (cascade)                                |
| `grid_key`                      | text, nullable (clé de la grille, null pour un poste libre) |
| `label`                         | text, 1 à 120 caractères                                    |
| `sober`, `intermediate`, `full` | integer ≥ 0 (XAF)                                           |
| `edited`                        | boolean (montants modifiés à la main)                       |
| `position`                      | integer                                                     |

Unicité (`dossier_id`, `grid_key`) quand `grid_key` n'est pas nul. Lecture : tout membre. Écriture :
trésorier et plus, refusée quand le dossier est clôturé. Les postes de la grille sont créés au premier
calcul ; un nouveau calcul ne touche que les postes non modifiés (`edited = false`).

### `ledger_entry`

Le registre, **en ajout seul** : aucune policy UPDATE ni DELETE, et `revoke update, delete` pour
`anon` et `authenticated`.

| Colonne           | Type                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `id`              | uuid                                                                                                         |
| `dossier_id`      | uuid, FK `dossier` (cascade)                                                                                 |
| `kind`            | `pledge` / `receipt` / `expense` / `reversal`                                                                |
| `amount`          | integer, 1 à 100 000 000 (XAF)                                                                               |
| `method`          | `cash` / `airtel_money` / `moov_money` / `transfer` / `card` / `other`, nullable pour `pledge` et `reversal` |
| `party_name`      | text, 1 à 120 caractères (cotisant ou fournisseur)                                                           |
| `member_id`       | uuid, nullable, membre du dossier lié                                                                        |
| `budget_line_id`  | uuid, nullable, FK `budget_line` (dépenses seulement)                                                        |
| `note`            | text, 0 à 500 caractères                                                                                     |
| `occurred_on`     | date                                                                                                         |
| `reverses_id`     | uuid, nullable, FK `ledger_entry` (annulations seulement)                                                    |
| `idempotency_key` | uuid, unique par dossier                                                                                     |
| `created_by`      | uuid, défaut `auth.uid()`                                                                                    |
| `created_at`      | timestamptz                                                                                                  |

Contraintes : `reverses_id` obligatoire pour `reversal` et interdit sinon ; unicité de `reverses_id`
(une ligne n'est annulée qu'une fois) ; une annulation ne vise ni une annulation ni une ligne d'un
autre dossier, et reprend le montant de la ligne visée (vérifié par trigger) ; `budget_line_id`
réservé aux dépenses et du même dossier.

Insertion : trésorier et plus pour tout type ; contributeur et plus pour un `pledge` à son propre nom
(`member_id = auth.uid()`). Toute insertion refusée quand le dossier est clôturé.

Lecture : trésorier et plus, toutes les lignes. Autres membres : toutes les lignes si
`amounts_visibility = 'members'` ; sinon seulement les dépenses, leurs propres lignes
(`member_id = auth.uid()`) et les annulations de ces lignes.

### `ledger_totals(p_dossier_id uuid)`

Fonction security definer, `search_path` vide, exécutable par `authenticated` seulement, qui exige un
membre du dossier et renvoie uniquement des sommes : budget retenu, reçu, promis non versé, dépensé,
reste à couvrir, dépenses par poste. Les annulations sont déduites de leur type d'origine.

### `receipt` et bucket `receipts`

| Colonne        | Type                                                     |
| -------------- | -------------------------------------------------------- |
| `id`           | uuid                                                     |
| `dossier_id`   | uuid, FK `dossier` (cascade)                             |
| `entry_id`     | uuid, nullable, FK `ledger_entry` (la dépense justifiée) |
| `storage_path` | text, `<dossier_id>/<uuid>.<ext>`                        |
| `mime_type`    | `image/jpeg` / `image/png` / `image/webp`                |
| `size_bytes`   | integer, ≤ 5 Mo                                          |
| `created_by`   | uuid                                                     |
| `created_at`   | timestamptz                                              |

Bucket `receipts` privé, 5 Mo, JPEG, PNG et WebP. Envoi et création : trésorier et plus, sur le
préfixe du dossier. Lecture : tout membre du dossier, comme les dépenses, qui sont visibles de tous
quel que soit le réglage ; servie par lien signé de courte durée (5 minutes). Un reçu pas encore
rattaché à une dépense n'est lisible que par trésorier et plus. Pas de suppression dans ce lot.

## 2. Parcours et écrans

### Étapes du moteur (porte « décès », après 2.3)

| Étape         | Questions                                                                                                                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B.1 Affluence | `attendance.close` (famille directe), `attendance.extended` (famille élargie), `attendance.friends` (amis et collègues), `attendance.community` (communauté religieuse ou associative), `attendance.nights` (nuits de veillée) — nombres entiers |
| B.2 Budget    | `budget.level` : sobre / intermédiaire / complet                                                                                                                                                                                                 |

Nouvelle sorte de question `q.number` (entier borné, unité facultative). B.1 affiche en fin d'étape une
fourchette d'affluence (basse, haute). B.2 affiche les trois totaux côte à côte, calculés sur la
fourchette haute ; la réponse fixe `dossier_finance.scenario` et crée les postes de la grille.

### Écrans

| Route                       | Contenu                                                                                                                                                                                                                                                         | Accès  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `/dossier/[id]/cotisations` | Totaux (budget retenu, reçu, promis non versé, dépensé, reste) ; derniers mouvements visibles ; trésorier : ajouter une cotisation, une dépense, photographier un reçu, annuler une ligne ; contributeur : « Je promets une participation » ; onglet « Postes » | membre |
| `/dossier/[id]/bilan`       | Totaux, dépenses par poste, cotisations nominatives selon la visibilité ; « Partager le bilan » (texte de totaux, copie ou WhatsApp) ; « Clôturer » (trésorier), « Rouvrir » (propriétaire)                                                                     | membre |

Tableau de bord : carte « Cotisations » (reçu sur budget retenu) avec lien vers l'écran. Une
annulation s'affiche avec sa ligne d'origine ; aucune ligne ne disparaît.

### Reçu

Photo → lien d'envoi signé préparé par le serveur → envoi direct au stockage → `readReceipt` →
formulaire de dépense prérempli (montant, date, fournisseur, poste proposé) → le trésorier corrige et
enregistre. Sans IA (clé absente, quota atteint, échec), le formulaire reste vide avec la photo
jointe.

## 3. Code et IA

### `apps/web/src/modules/budget/`

| Fichier                    | Rôle                                                                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `grid.ts`                  | Grille de référence : une dizaine de postes, mode (`flat`, `perPerson`, `perNight`, `perPersonNight`), coût XAF par niveau, « estimation à vérifier » |
| `scenarios.ts`             | Fonctions pures : affluence depuis B.1, postes depuis la grille et l'affluence, totaux des trois scénarios                                            |
| `ledger.ts`                | Fonctions pures : totaux depuis les lignes (annulations comprises), texte de bilan                                                                    |
| `schema.ts`                | Zod : montant entier 1 à 100 000 000, nom et note bornés, moyen, date, clé d'idempotence                                                              |
| `repo.ts`                  | Seul accès base, client utilisateur                                                                                                                   |
| `service.ts`, `actions.ts` | Promesse, cotisation reçue, dépense, annulation, postes, visibilité, clôture, réouverture, préparation d'envoi de reçu                                |

Étapes : `journey/steps/b-1-attendance.ts`, `journey/steps/b-2-budget.ts` ; `q.number` dans
`journey/types.ts` et `journey/define.ts`, avec son composant de saisie.

### `readReceipt` (dans `modules/ai`)

- Télécharge l'image côté serveur, consomme `consume_ai_quota` (même quota que le lot 1 : 20 appels
  par dossier et par jour), puis appelle OpenRouter avec le fournisseur du lot 1, un modèle qui lit
  les images (choisi à l'implémentation ; Claude Opus 5.5 le fait), `data_collection: 'deny'`.
- Demande une réponse JSON stricte `{ amount, date, vendor, gridKey }`, validée par Zod ; `gridKey`
  doit être une clé de la grille ou null.
- Envoie seulement l'image, aucune donnée du dossier. Ne journalise ni le contenu du reçu ni la
  réponse. Le résultat n'est qu'un préremplissage.

## 4. Erreurs, tests et livraison

### Erreurs

- Saisie refusée (montant invalide, dossier clôturé, droits) : message sous le champ, saisie conservée.
- Double envoi : clé d'idempotence générée par le navigateur, unique par dossier ; un second envoi
  renvoie la ligne existante.
- Annulation d'une ligne déjà annulée ou d'une annulation : refus explicite.
- Reçu trop lourd, mauvais type, IA en échec, quota atteint : photo jointe, saisie manuelle possible.
- Journalisation : codes et contexte, jamais de montant nominatif ni de contenu de reçu.

### Tests

- SQL (PGlite) : RLS de chaque table ; ajout seul (UPDATE et DELETE refusés) ; droits par rôle ;
  visibilité `restricted` / `members` ; clôture et réouverture ; annulation unique, même montant, même
  dossier ; idempotence ; `ledger_totals` (sommes seulement, membre exigé) ; policies du bucket
  `receipts`.
- Unitaires : grille, affluence, scénarios, totaux avec annulations, texte de bilan, schémas,
  services (base simulée), `readReceipt` (fournisseur simulé, JSON invalide, quota, clé absente).
- Playwright : les écrans Cotisations et Bilan exigent une connexion ; le parcours complet attend
  l'environnement e2e.

### Livraison (4 PR)

1. Budget : `q.number`, grille, scénarios, étapes B.1 et B.2, page « Budget prévisionnel »
   (`/dossier/[id]/budget`) calculée à la volée. Aucune table : la réponse B.2 est le niveau
   envisagé par la famille.
2. Registre : `dossier_finance` (scénario retenu par le trésorier, prérempli par le niveau
   envisagé), `budget_line` (onglet « Postes »), `ledger_entry`, `ledger_totals`, visibilité,
   écran Cotisations, idempotence, carte du tableau de bord.
3. Reçus : bucket privé, `receipt`, envoi signé, `readReceipt`, préremplissage.
4. Bilan : écran Bilan, texte de partage, clôture et réouverture.

### Hors lot 2

Paiement en ligne (Stripe diaspora, Mobile Money) ; prix réels des prestataires (lot 3) ; export
PDF ; lien public vers le bilan ; suppression de reçus.

### Configuration

Aucune nouvelle variable : `OPENROUTER_API_KEY` (lot 1) sert aussi à la lecture des reçus.
