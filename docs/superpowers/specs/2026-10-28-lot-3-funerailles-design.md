# Lot 3 — Organiser les funérailles : design

Date : 2026-10-28 · Statut : validé section par section, en attente de relecture
Références : [`parcours-proposition.html`](../../parcours-proposition.html) (phase 3, section 9),
[spec du lot 1](2026-10-27-lot-1-entrer-et-annoncer-design.md),
[spec du lot 2](2026-10-27-lot-2-financer-design.md).

## Objectif

Permettre à une famille, après un décès, de :

1. préparer l'installation de la veillée (3.1) et sa restauration (3.2), avec des quantités
   calculées à partir de l'affluence du lot 2 ;
2. écrire le déroulé de la cérémonie minute par minute (3.4) ;
3. produire un livret et une affiche à imprimer ou partager (3.5) ;
4. trouver des prestataires à Libreville et leur demander un devis par WhatsApp.

Aucun argent ne transite par Testimona dans ce lot, et aucun paiement à un prestataire.

## Décisions prises

| Sujet             | Décision                                                                                                                                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Prestataires      | Le pilote démarre avec des prestataires d'exemple, marqués comme tels, sans numéro. Ils ne peuvent jamais être contactés (contrainte en base). L'équipe Testimona ajoute les vrais prestataires depuis un écran d'administration. |
| Devis             | Message WhatsApp préparé en code (sans IA), relu par la famille, puis ouverture de `wa.me`. La demande est tracée dans le dossier. Pas de suivi par Testimona, pas de commission dans ce lot.                                     |
| Livret et affiche | L'IA rédige les textes ; ils remplissent des modèles fixes aux couleurs Testimona. Livret en PDF A5, affiche en PDF A4 et en image PNG carrée pour WhatsApp. Les faits (noms, dates, heures, lieux) ne passent jamais par l'IA.   |
| Budget            | 3.1 et 3.2 affichent un coût estimé et proposent au trésorier d'ajuster le poste correspondant. Rien ne change sans son clic ; refusé si les cotisations sont clôturées.                                                          |
| Programme         | Privé au dossier dans ce lot. Le lot 4 le publiera sur l'espace mémoriel.                                                                                                                                                         |
| Prix              | La grille du lot 2 reste la référence tant qu'il n'y a que des prestataires d'exemple. Le `price_note` d'un prestataire est un texte indicatif, jamais utilisé dans un calcul.                                                    |
| Architecture      | 3.1, 3.2, 3.4 et 3.5 dans le moteur de questions du lot 1 (réponses et brouillons dans `journey_answer`) ; modules `providers` et `documents` à côté. Pas de table `generated_doc` : le brouillon est la réponse.                 |
| Ville             | Les encadrés prestataires filtrent sur `person.death_city`, sinon sur Libreville.                                                                                                                                                 |

## 1. Données et sécurité

Nouvelles tables avec RLS activée. Le code y accède avec le client utilisateur ; aucun client
service-role. Les fonctions `security definer` gardent `search_path = ''` et vérifient le rôle en
premier. Codes d'erreur : TL010 est nouveau (prestataire non contactable).

### `provider_category`

Référence fixe, déclarée en code (`modules/providers/categories.ts`) et insérée par la migration.

| Colonne    | Type                                              |
| ---------- | ------------------------------------------------- |
| `key`      | text, clé primaire (`tentsChairs`, `catering`, …) |
| `position` | smallint                                          |

Clés du lot : `funeralHome`, `tentsChairs`, `sound`, `lighting`, `catering`, `drinks`, `printing`.
Le libellé vient des textes FR/EN (`providers.category.<clé>`), pas de la base. Lecture : tout
utilisateur connecté. Aucune écriture par l'API.

### `provider`

| Colonne                    | Type                                                       |
| -------------------------- | ---------------------------------------------------------- |
| `id`                       | uuid, clé primaire                                         |
| `category_key`             | text, FK `provider_category`                               |
| `name`                     | text, 1 à 120 caractères                                   |
| `city`                     | text, 1 à 120 caractères                                   |
| `district`                 | text nullable, 120 caractères au plus                      |
| `whatsapp`                 | text nullable, format international `^\+[1-9][0-9]{7,14}$` |
| `price_note`               | text nullable, 200 caractères au plus                      |
| `is_example`               | boolean, défaut `false`                                    |
| `verified_at`              | timestamptz nullable                                       |
| `active`                   | boolean, défaut `true`                                     |
| `created_at`, `updated_at` | timestamptz                                                |

Contraintes : `check (not is_example or (whatsapp is null and verified_at is null))` (un exemple
n'est jamais contactable) et `check (verified_at is null or whatsapp is not null)` (un prestataire
vérifié a un numéro). Index sur `(city, category_key) where active`. Dates de création et de
modification imposées par trigger.

Lecture : tout utilisateur connecté voit les prestataires actifs qui sont vérifiés ou d'exemple ; un
prestataire non vérifié ou inactif n'est lisible que par `is_admin()`. Insertion et modification :
`is_admin()`. Aucune suppression : on désactive.

La migration fixe `search_path = ''` sur `is_admin()` (alerte ancienne de l'advisor) sans changer
sa logique : rôle lu dans `app_metadata` du JWT, que l'utilisateur ne peut pas modifier.

Données de départ : une dizaine de prestataires d'exemple à Libreville, répartis sur les catégories,
`is_example = true`, sans numéro.

### `quote_request`

Trace d'une demande de devis, en ajout seul.

| Colonne       | Type                                                       |
| ------------- | ---------------------------------------------------------- |
| `id`          | uuid, clé primaire                                         |
| `dossier_id`  | uuid, FK `dossier` (cascade)                               |
| `provider_id` | uuid, FK `provider` (`on delete no action`)                |
| `step_id`     | text (`vigil-setup`, `vigil-catering`, `ceremony-program`) |
| `message`     | text, 1 à 2 000 caractères                                 |
| `created_by`  | uuid, FK `auth.users` (`on delete set null`), imposé       |
| `created_at`  | timestamptz, imposé                                        |

Insertion : coordinateur et plus. Un trigger vérifie d'abord le rôle (42501), puis refuse
(TL010) un prestataire d'exemple, inactif, non vérifié, sans numéro ou inexistant. `created_by` et `created_at` sont imposés par trigger. Lecture : membres du dossier.
Ni modification ni suppression.

### `dossier_photo` et bucket `dossier-photos`

Photo de la personne, une version courante par dossier, sur le modèle du bucket `receipts` du lot 2.

| Colonne       | Type                                   |
| ------------- | -------------------------------------- |
| `id`          | uuid, clé primaire                     |
| `dossier_id`  | uuid, FK `dossier` (cascade)           |
| `path`        | text, imposé (`<dossier_id>/<id>.jpg`) |
| `created_by`  | uuid, imposé                           |
| `created_at`  | timestamptz, imposé                    |
| `archived_at` | timestamptz nullable                   |

Index unique sur `dossier_id where archived_at is null`. Une nouvelle photo archive la précédente.
Bucket privé, 5 Mo, JPEG, PNG ou WebP. Envoi : coordinateur et plus. Lecture : membres du dossier.
Le fichier doit exister dans le bucket avant l'insertion de la ligne (même contrôle que les reçus).

### Ce qui reste dans `journey_answer`

Réponses de 3.1, 3.2 et 3.4, programme compris, et brouillons des textes de 3.5
(`documents.booklet.*`, `documents.poster.*`), dans la limite de 64 Kio par réponse.

### Clôture des cotisations

Elle ne bloque que l'ajustement d'un poste du budget (TL009, déjà en place sur `budget_line`). Les
étapes, les devis et les documents restent possibles.

## 2. Étapes 3.1, 3.2, 3.4 et quantités

Les étapes sont de courtes définitions dans `journey/steps/`, comme B.1. Le moteur gagne une seule
capacité : une étape peut déclarer `providers: [catégories]`, et sa synthèse affiche alors
l'encadré prestataires (section 3).

### 3.1 Installation de la veillée (`vigil-setup`)

Questions : lieu (`place`), type de lieu (maison familiale, salle louée, espace de quartier), abri
(tentes ou salle), sièges (chaises, bancs, mixte), sonorisation (oui, non), éclairage (oui, non).

Synthèse : nombre de tentes de 5×10 m, de chaises ou de places de banc, de jeux de lumière ; coût
estimé ; prestataires `tentsChairs`, `sound`, `lighting`.

### 3.2 Restauration de la veillée (`vigil-catering`)

Questions : ce qui est servi chaque soir (rien, collation, repas), qui prépare (famille, traiteur),
boissons (sans alcool, avec alcool), repas le jour des obsèques (oui, non).

Synthèse : assiettes par soir et pour le jour des obsèques, packs d'eau, boissons, glace ; coût
estimé ; prestataires `catering`, `drinks`.

### Calcul des quantités

Fonctions pures dans `journey/quantities.ts`, testées sans base ni navigateur. Entrées : l'affluence
B.1 lue par `attendanceFrom()` (fourchette haute, `ATTENDANCE_MARGIN`, part à la veillée
`WAKE_ATTENDANCE_RATIO`, nombre de nuits) et les réponses de l'étape. Les ratios (50 places assises
par tente, 1,5 litre d'eau par personne et par soir, etc.) sont des constantes nommées, commentées
« estimation à vérifier » comme la grille du lot 2. Le coût estimé réutilise la grille
(`lineAmount()`) au niveau choisi en B.2, sinon au niveau intermédiaire.

Sans réponse à B.1, la synthèse affiche un lien vers B.1 au lieu de quantités nulles.

### Ajustement des postes du budget

Pour un trésorier et plus, sous le coût estimé : « Mettre à jour le poste Tentes et chaises :
240 000 XAF ». Correspondance par `grid_key` : 3.1 ajuste `tentsChairs` et `sound`, 3.2 ajuste
`catering` et `drinks`. Le bouton appelle l'action existante de modification d'un poste ; le
registre n'est pas touché. Il n'apparaît pas si le poste n'existe pas ou si les cotisations sont
clôturées.

### 3.4 Déroulé de la cérémonie (`ceremony-program`)

Questions : date des obsèques ; lieux de la levée du corps, de la cérémonie et de l'inhumation
(`place`) ; registre (croyant, neutre ; repris de `announce.tone` s'il est déjà répondu) ;
programme, une liste d'au plus 40 moments (heure, moment, lieu, responsable).

« Partir d'un programme type » préremplit environ 8 moments selon le registre (levée du corps,
cortège, office ou recueillement, hommages, inhumation, réception), sans IA, dans
`journey/templates/`. La famille les modifie ensuite librement ; le bouton est masqué dès que le
programme a un moment.

Synthèse : programme trié par heure, lien Maps par lieu (`lib/geo/maps`), prestataires
`funeralHome`.

## 3. Prestataires et demandes de devis

### Encadré prestataires (`modules/providers/ui/ProviderPanel`)

Sur la synthèse des étapes qui déclarent des catégories. Une carte par prestataire : nom, quartier,
`price_note`, badge « Vérifié » ou « Exemple ». Ordre : vérifiés de la ville, puis exemples ; cinq
au plus par catégorie. Aucun prestataire : l'encadré n'apparaît pas. Pas de note, d'avis ni de carte
géographique.

### Demande de devis

Bouton « Demander un devis » pour un coordinateur et plus, seulement pour un prestataire vérifié
avec un numéro. Un prestataire d'exemple affiche « Prestataire d'exemple, contact indisponible ».

Le message est construit en code (`modules/providers/quote-message.ts`) : besoin de l'étape, date
(3.4, sinon « à préciser »), lieu et quartier, quantités calculées. Il ne contient pas le nom de la
personne décédée. La famille le relit et peut le modifier, puis « Ouvrir WhatsApp » :

1. une action serveur insère la ligne `quote_request` (TL010 si le prestataire n'est plus
   contactable) ;
2. le client ouvre `https://wa.me/<numéro sans +>?text=<message encodé>`.

Si WhatsApp ne s'ouvre pas, le lien reste affiché pour être copié.

La synthèse liste les « Devis demandés » de l'étape (prestataire, date, auteur), pour qu'un autre
membre ne relance pas le même prestataire. Un prestataire désactivé reste nommé dans cet historique.

### Écran d'administration (`/admin/providers`)

Dans l'espace `(admin)` existant, avec son garde actuel ; la RLS vérifie `is_admin()`. Liste
filtrable par ville et catégorie ; création et modification ; « Vérifié le … » ; activation et
désactivation ; pas de suppression. Numéro validé au format international ; cocher « Exemple »
vide et désactive le numéro.

### Erreurs

Messages lisibles FR/EN pour TL010 et le rôle insuffisant, avec un test typé par code d'erreur comme
aux lots précédents.

## 4. Livret et affiche (3.5)

### Étape `funeral-documents`

1. **Photo** : envoi facultatif de la photo de la personne (`dossier_photo`), réduite par
   `shrinkImage` du lot 2 (JPEG 1600 px, métadonnées EXIF supprimées). Les modèles fonctionnent
   sans photo.
2. **Textes** : l'IA rédige, à partir de la fiche, de la biographie 1.6, du programme 3.4 et du
   registre, une phrase ou un verset de couverture, un hommage d'environ 150 mots et un mot de
   remerciement. Brouillons dans `journey_answer`, modifiables, consommant le quota d'IA du dossier.
3. **Faits** : noms, dates, heures et lieux sont lus directement de la fiche et de 3.4 ; ils ne
   passent jamais par l'IA.

### Modèles et formats

- **Livret** : PDF A5, environ 4 pages (couverture avec photo, nom et dates ; hommage ; programme ;
  remerciements).
- **Affiche** : PDF A4 à imprimer, et image PNG carrée de 1080 px pour WhatsApp (photo, nom, dates,
  moments principaux avec heure et lieu).
- Couleurs Testimona, variante « sobre » ou « couleur » ; pas d'éditeur libre.
- `@react-pdf/renderer` (MIT) pour les PDF, `next/og` (fourni avec Next) pour le PNG ; une police
  avec accents embarquée.

### Téléchargement

Route `/api/dossiers/[dossierId]/documents/[doc]` (`booklet.pdf`, `poster.pdf`, `poster.png`) pour
tout membre du dossier, réponse `no-store` et `nosniff` comme l'export CSV. La photo est lue côté
serveur avec le client utilisateur. Si la fiche, le programme ou les textes manquent, l'étape
l'indique au lieu de produire un document vide.

## 5. Tests

- SQL sur PGlite : RLS des quatre tables, TL010, contrainte sur les exemples, bucket et politiques
  `dossier-photos`, `search_path` de `is_admin()`, test « 100 % des tables ont la RLS ».
- Vitest : quantités, message de devis, programme type, contenu des documents vérifié sur les
  données passées aux modèles (pas au pixel), textes FR/EN typés.
- Tests e2e : limités aux pages publiques, comme aujourd'hui.

## 6. Livraison

Cinq PR, chacune déployable seule, migration appliquée en production avant la fusion :

1. **Prestataires** : migration (`provider_category`, `provider`, `quote_request`, `search_path` de
   `is_admin()`, exemples), module `providers`, écran `/admin/providers`.
2. **Veillée** : `quantities.ts`, étapes 3.1 et 3.2, capacité `providers` du moteur, encadré,
   ajustement des postes.
3. **Devis** : message, action et trace, historique « Devis demandés ».
4. **Cérémonie** : étape 3.4, programme type, liens Maps.
5. **Livret et affiche** : migration photo, étape 3.5, PDF et PNG.

## Hors périmètre

Animation (3.3), logistique (3.6), retour au village (3.7) ; vrais prix des prestataires et leur
usage dans les calculs ; paiement, commission et suivi des devis par Testimona ; impression livrée ;
publication du programme sur l'espace mémoriel (lot 4) ; éditeur libre de mise en page.
