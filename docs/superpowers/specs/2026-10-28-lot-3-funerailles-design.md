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
premier. Codes d'erreur : TL010 est nouveau (prestataire non contactable), TL012 aussi (photo déjà
désignée ou archivée, PR 5). TL011 est volontairement inutilisé (voir `dossier_photo`).

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

La colonne `whatsapp` n'est pas lisible par le rôle `authenticated`, administrateur compris
(migration `20261029000200_provider_whatsapp_private.sql`) : la RLS filtre les lignes, pas les
colonnes ; `select` est donc accordé colonne par colonne, sans `whatsapp`. Une famille n'obtient le
numéro que par la RPC `request_quote` (voir « Demande de devis »). L'écran d'administration le lit
côté serveur avec le client service-role, après `isPlatformAdmin()`
(`apps/web/src/server/privileged/providers.ts`).

La migration fixe `search_path = ''` sur `is_admin()` (alerte ancienne de l'advisor) sans changer
sa logique : rôle lu dans `app_metadata` du JWT, que l'utilisateur ne peut pas modifier.

Données de départ : une dizaine de prestataires d'exemple à Libreville, répartis sur les catégories,
`is_example = true`, sans numéro.

### `quote_request`

Trace d'une demande de devis, en ajout seul.

| Colonne         | Type                                                                 |
| --------------- | -------------------------------------------------------------------- |
| `id`            | uuid, clé primaire                                                   |
| `dossier_id`    | uuid, FK `dossier` (cascade)                                         |
| `provider_id`   | uuid, FK `provider` (`on delete no action`)                          |
| `provider_name` | text not null, `default ''`, nom du prestataire à la demande, imposé |
| `step_id`       | text (`vigil-setup`, `vigil-catering`, `ceremony-program`)           |
| `message`       | text, 1 à 2 000 caractères                                           |
| `created_by`    | uuid, FK `auth.users` (`on delete set null`), imposé                 |
| `created_at`    | timestamptz, imposé                                                  |

Insertion : coordinateur et plus. Un trigger vérifie d'abord le rôle (42501), puis refuse
(TL010) un prestataire d'exemple, inactif, non vérifié, sans numéro ou inexistant. `created_by` et `created_at` sont imposés par trigger. Lecture : membres du dossier.
Ni modification ni suppression.

Le trigger fige aussi `provider_name` ; un prestataire désactivé reste ainsi nommé dans l'historique, même caché par la RLS.

### `dossier_photo` et bucket `dossier-photos`

Photo de la personne, une version courante par dossier, sur le modèle du bucket `receipts` du lot 2
(migration `20261101000100_dossier_photos.sql`).

| Colonne        | Type                                                                 |
| -------------- | -------------------------------------------------------------------- |
| `id`           | uuid, clé primaire                                                   |
| `dossier_id`   | uuid, FK `dossier` (cascade)                                         |
| `path`         | text unique, imposé (`<dossier_id>/<id>.jpg`, contrainte `check`)    |
| `created_by`   | uuid nullable, FK `auth.users` (`on delete set null`), imposé        |
| `created_at`   | timestamptz, imposé                                                  |
| `activated_at` | timestamptz nullable, posé par `set_dossier_photo` (photo désignée)  |
| `archived_at`  | timestamptz nullable, posé par `set_dossier_photo` (photo remplacée) |

Contrainte `check (archived_at is null or activated_at is not null)`. Index unique de la photo
courante : `dossier_id where activated_at is not null and archived_at is null`.

La photo courante s'établit en deux temps (écart assumé, voir plus bas) :

1. **Préparation** : un coordinateur et plus insère une ligne. Le trigger `dossier_photo_before_insert`
   vérifie d'abord le rôle (42501), puis impose le chemin, l'auteur, la date de création, et remet
   `activated_at` et `archived_at` à `null`.
2. **Envoi** : le navigateur envoie le JPEG par un lien signé, sur le chemin de la ligne préparée.
3. **Désignation** : la RPC `set_dossier_photo(p_photo_id)`, `security definer`,
   `search_path = ''`. Elle exige un utilisateur (28000). Un identifiant inexistant et un rôle
   insuffisant donnent le même 42501, pour ne rien révéler de l'existence d'une photo, même à un
   coordinateur d'un autre dossier. Elle verrouille la ligne du dossier (`for no key update`) puis
   celle de la photo, dans l'ordre de la suppression en cascade et des autres fonctions du dossier
   (reçus, clôture), pour éviter tout interblocage ; le verrou sur le dossier sérialise deux
   désignations concurrentes. Une photo déjà désignée ou archivée donne TL012 (définitif). Un
   fichier absent du stockage (version courante, non archivée) donne TL006 (retentable, comme les
   reçus). Sinon, elle archive la photo courante et active la nouvelle, à la même heure
   (`clock_timestamp()`, prise après le verrou).

Aucune modification ni suppression par l'API : `update` et `delete` sont retirés à
`authenticated`, seule la RPC pose `activated_at` et `archived_at`. Lecture : tout membre voit la
photo courante ; une photo préparée ou archivée n'est lue que par le coordinateur et plus.
Insertion : coordinateur et plus (RLS et trigger).

Bucket privé `dossier-photos`, 5 Mo, **JPEG seul** (`image/jpeg`). Policies sur `storage.objects` :
l'envoi n'est permis que sur le chemin d'une photo préparée, ni activée ni archivée, par un
coordinateur du dossier (aucun chemin libre, aucun remplacement de fichier) ; la lecture d'un
objet suit la RLS de `dossier_photo` (le fichier se lit exactement quand la ligne se lit).

Aucune limite du nombre de photos préparées (décision produit, comme les devis). Le code TL011,
prévu pour cette limite, reste volontairement inutilisé : il ne doit pas être réattribué.

Le navigateur réduit la photo avant l'envoi (`shrinkImage` du lot 2 : JPEG 1600 px, EXIF retiré).
Un JPEG envoyé hors de l'interface ne passe pas par ce réencodage : le serveur retire donc, avant
de l'intégrer aux documents, les segments de métadonnées placés avant l'image (APP1 : EXIF et XMP,
dont la position GPS ; APP13 : IPTC ; COM), sans toucher aux données d'image
(`modules/documents/photo/stripJpegMetadata.ts`). Un JPEG illisible est écarté : le document est
produit sans photo. La vignette de la synthèse passe par `GET /api/dossiers/[dossierId]/photo`,
redirection 303 vers un lien signé de 5 minutes créé à la demande (`no-store`, `nosniff`,
`Referrer-Policy: no-referrer`), 404 sans photo ou sans droit.

### Ce qui reste dans `journey_answer`

Réponses de 3.1, 3.2 et 3.4, programme compris, variante de 3.5 (`documents.style`) et textes du
livret (`documents.booklet.cover`, `.tribute`, `.thanks`), dans la limite de 64 Kio par réponse
en base (60 000 octets côté application, `ANSWER_MAX_BYTES`). Il n'y a pas de clé `documents.poster.*` : l'affiche reprend la phrase de
couverture du livret.

### Clôture des cotisations

Elle ne bloque que l'ajustement d'un poste du budget (TL009, déjà en place sur `budget_line`). Les
étapes, les devis et les documents restent possibles.

## 2. Étapes 3.1, 3.2, 3.4 et quantités

Les étapes sont de courtes définitions dans `journey/steps/`, comme B.1. Le moteur gagne une seule
capacité : une étape peut déclarer `providers: [catégories]`, et sa synthèse affiche alors
l'encadré prestataires (section 3). La synthèse de 3.1 et 3.2 est une page propre à l'étape,
`/dossier/<id>/etape/<étape>/synthese` (`summary: 'step'`).

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

Sans réponse à B.1, la synthèse affiche un lien vers B.1 au lieu de quantités nulles. Une question
passée ou sans réponse n'ajoute ni quantité ni coût. L'éclairage n'a pas de coût (pas de poste dans
la grille). L'eau est comptée par invité et par occasion. Quand l'affluence est répondue mais nulle,
il n'y a ni quantité ni coût, pour ne jamais proposer de remettre un poste à zéro.

### Ajustement des postes du budget

Pour un trésorier et plus, sous le coût estimé : « Mettre à jour le poste Tentes et chaises :
240 000 XAF ». Correspondance par `grid_key` : 3.1 ajuste `tentsChairs` et `sound`, 3.2 ajuste
`catering` et `drinks`. Le bouton appelle l'action existante de modification d'un poste ; le
registre n'est pas touché. Ajuster un poste remplace ses trois montants et le marque modifié. Il
n'apparaît pas si le poste n'existe pas ou si les cotisations sont
clôturées.

### 3.4 Déroulé de la cérémonie (`ceremony-program`)

Questions, dans cet ordre :

- `ceremony.date` : date des obsèques (mêmes bornes d'année que les autres dates) ;
- `ceremony.liftPlace`, `ceremony.servicePlace`, `ceremony.burialPlace` : lieux de la levée du
  corps, de la cérémonie et de l'inhumation, en texte court (adresse ou lien Google Maps collé).
  Ce ne sont pas des `place` (ville + pays) : un lien Maps vers une ville seule ne guide personne
  jusqu'au lieu ;
- `ceremony.tone` : registre (croyant, neutre). Une clé ne peut appartenir qu'à une étape
  (`assertUniqueSteps`) : le registre a donc sa propre clé, préremplie depuis `announce.tone`
  (`prefillFrom`) tant qu'il n'a pas de réponse. La valeur préremplie ne compte pas comme répondue
  tant qu'elle n'est pas enregistrée, et un lecteur voit toujours la réponse enregistrée, jamais
  la valeur préremplie ;
- `ceremony.program` : liste d'au plus 40 moments. Champs : heure (champ de liste `time`, `HH:MM`,
  requis), moment (requis), lieu, responsable.

« Partir d'un programme type » (`starter: 'ceremonyProgram'`) remplit la liste de 8 moments, sans
IA (`journey/templates/ceremony-program.ts`) : accueil 08:00, levée du corps 08:30, cortège 09:00,
office religieux (croyant) ou cérémonie de recueillement (neutre, aussi par défaut) 10:00,
hommages 11:30, départ 12:30, inhumation 13:30, réception 15:00. Le registre est lu de
`ceremony.tone`, sinon de `announce.tone` ; les trois lieux répondus remplissent le lieu des
moments correspondants. Les programmes types sont déclarés dans un registre unique,
`journey/templates/starters.ts` (taille contrôlée contre `maxItems`, clés lues, construction
traduite). Le bouton n'apparaît qu'à qui peut répondre, tant que la liste enregistrée est vide ;
la famille modifie ensuite librement les moments.

Synthèse (`CeremonySynthesis`) : date des obsèques en toutes lettres (« Date à préciser » sans
réponse valide) ; lieux répondus, avec un lien « Itinéraire » quand le texte est exploitable ;
programme trié par heure (ordre saisi conservé à heure égale ; un moment invalide ou portant un
champ inconnu est écarté) dans un tableau, avec « Écrire le programme » s'il est vide ; puis
prestataires `funeralHome` et « Devis demandés ».

Liens Maps : une adresse donne un itinéraire `https://www.google.com/maps/dir/…`. Un lien collé
n'est repris que s'il est en `https:`, sans identifiants, sur un domaine Google Maps (`goo.gl`,
`maps.app.goo.gl`, `maps.google.<tld>`, ou `google.<tld>` avec un chemin `/maps…`) ; sinon le lieu
s'affiche sans lien. Le contrôle est fait dans `journey/ceremony.ts` (`placeHref`) ;
`lib/geo/maps.ts`, partagé avec la page publique du mémorial, n'est pas modifié. Les liens
s'ouvrent dans un nouvel onglet (`noopener noreferrer`) ; leur nom accessible cite le lieu, ou
l'heure et le moment pour une ligne du programme.

## 3. Prestataires et demandes de devis

### Encadré prestataires (`modules/providers/ui/ProviderPanel`)

Sur la synthèse des étapes qui déclarent des catégories. Une carte par prestataire : nom, quartier,
`price_note`, badge « Vérifié » ou « Exemple ». Ordre : vérifiés de la ville, puis exemples ; cinq
au plus par catégorie. La ville de l'encadré est comparée en code, sans tenir compte de la casse,
des accents ni des tirets. Aucun prestataire : l'encadré n'apparaît pas. Pas de note, d'avis ni de carte
géographique.

### Demande de devis

Bouton « Demander un devis » pour un coordinateur et plus, seulement pour un prestataire vérifié
avec un numéro. Un prestataire d'exemple affiche « Prestataire d'exemple, contact indisponible ».

Le message est construit en code (`modules/providers/quote-message.ts`) : besoin de l'étape, date
des obsèques, lieu (ville de la veillée, sinon du décès, sinon Libreville), quantités calculées.
La date vient de la réponse `ceremony.date` (3.4), formatée dans la langue de l'interface, pour
les devis de 3.1, 3.2 et 3.4. Le libellé dit « Date des obsèques : … » (« Funeral date: … ») :
dans un devis de veillée, le prestataire ne doit pas la prendre pour la date de la veillée. Sans
réponse valide (absente, « passée », impossible ou hors bornes), le message dit « à préciser ».
Il ne contient ni le nom de la personne décédée ni les lieux de 3.4. La famille le relit et peut le modifier, puis « Ouvrir WhatsApp » :

1. une action serveur appelle la RPC `request_quote(p_dossier_id, p_provider_id, p_step_id,
p_message)`, `security definer`. Elle exige un utilisateur (28000), vérifie le rôle (42501),
   puis le prestataire (TL010),
   insère la ligne `quote_request` et renvoie le numéro, dans la même transaction ;
2. le client ouvre `https://wa.me/<numéro sans +>?text=<message encodé>`.

La garantie porte sur la base : `provider.whatsapp` n'est pas lisible par `select` (voir la
section provider), et la RPC est la seule sortie du numéro pour une famille. Une demande refusée
ne donne aucun numéro ; une demande acceptée est toujours tracée. Le numéro n'atteint le navigateur
que dans le lien `wa.me`. La lecture est donc tracée, pas confidentielle : un coordinateur peut
obtenir le numéro de chaque prestataire vérifié, une demande tracée à la fois, sans limite de débit
dans ce lot.
Si WhatsApp ne s'ouvre pas, le lien reste affiché pour être copié. Après un succès, le formulaire
propose « Renvoyer la demande », qui trace une nouvelle demande.

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

Étape 3.5 du moteur, placée juste après 3.4 dans le registre
(`journey/steps/3-5-funeral-documents.ts`, `summary: 'step'`). Une seule question :
`documents.style`, variante « sobre » (`sober`) ou « couleur » (`color`) (`DOCUMENT_STYLES`). Sans
réponse, les modèles prennent la variante sobre. Le reste vit dans la synthèse propre à l'étape,
`DocumentsSynthesis`, choisie par la page de synthèse comme `CeremonySynthesis` :

1. **Photo** : envoi facultatif de la photo de la personne (`dossier_photo`, voir section 1) par un
   coordinateur et plus, réduite par `shrinkImage` du lot 2. Une photo que le navigateur ne sait
   pas réencoder en JPEG est refusée avec un message. Les modèles fonctionnent sans photo.
2. **Textes** : trois textes enregistrés dans `journey_answer`, modifiables par un contributeur et
   plus (RLS de `journey_answer`), chacun enregistré séparément après relecture :

   | Clé                         | Texte                             | Limite           |
   | --------------------------- | --------------------------------- | ---------------- |
   | `documents.booklet.cover`   | phrase (ou verset) de couverture  | 200 caractères   |
   | `documents.booklet.tribute` | hommage d'environ 150 mots        | 1 500 caractères |
   | `documents.booklet.thanks`  | mot de remerciement de la famille | 600 caractères   |

   Même nettoyage que les brouillons (CRLF en LF, espaces de bord retirés, pas de NUL, non vide)
   (`modules/documents/texts.ts`). Les limites viennent des gabarits fixes : l'hommage tient sur
   une page A5. Enregistrement refusé si l'étape 3.5 est fermée.

3. **Faits** : noms, dates, heures et lieux sont lus directement de la fiche et de 3.4 ; ils ne
   passent jamais par l'IA.

### Textes par l'IA

« Proposer les textes avec l'IA » (contributeur et plus, IA active) : **un seul appel** produit les
trois textes en JSON strict (`modules/ai/documents.ts`). Il réutilise `completeChat`, `takeAiQuota`
et `isAiEnabled`, et compte pour un appel du quota du jour du dossier. Il n'y a pas de bouton
« Améliorer » par texte. Les textes proposés remplissent l'éditeur sans être enregistrés ; un texte
modifié pendant l'appel n'est pas écrasé.

Faits envoyés, par liste blanche (`modules/ai/documents-facts.ts`, `DOCUMENT_AI_KEYS`) : le prénom,
le surnom, le registre (`ceremony.tone`, sinon `announce.tone`) et les réponses de la biographie
1.6 (parents, carrière, traits et anecdotes, passions, devise). **Jamais envoyés** : le nom de
famille, les dates, les lieux (lieu de naissance compris), le programme 3.4, la liste de diffusion.
Sans fiche, aucun repli sur le titre du dossier (il porte le nom de famille). Sans prénom, surnom
ni biographie, la demande est refusée avant de consommer le quota. La fiche et les réponses sont
lues avant de consommer le quota.

Le prompt (`documents-prompt.ts`) balise les faits comme des données, pas des instructions, et
interdit d'inventer un fait ou d'écrire une date, une heure, un lieu ou un nom absents des faits.
Le registre croyant permet une courte référence religieuse ; le registre neutre, ou l'absence de
registre, n'en permet aucune.

Contrôles de la réponse (`documents-output.ts`), avant tout affichage : JSON exact à trois clés
(un bloc ` ```json ` est toléré), limites de chaque texte, **aucune heure** (« 9:30 »,
« 14h05 », « 15h », « à 9 heures », « 3 pm » ; « N heures » seul, souvent une durée, n'est refusé
qu'après un mot d'introduction), **aucune date absente des faits** (une année, un jour et un mois
qui ne figurent pas tels quels dans les faits envoyés). Une référence de verset dont le livre est
connu (« Jean 11:25 », « 1 Corinthiens 13:4-7 ») est permise et n'est pas lue comme une heure.
Une réponse refusée donne « La proposition n'a pas abouti » ; l'appel est consommé, les textes de
l'éditeur sont conservés, et seule la nature du refus est journalisée (jamais la réponse).

### Textes de départ

Sans IA, ou quand elle est absente, épuisée ou en échec, la phrase de couverture et le
remerciement ont un texte de départ fixe selon le registre (croyant ou neutre, neutre par défaut),
dans la langue de l'interface (`modules/documents/templates.ts`, textes `documents.starter.*`). Ils
préremplissent l'éditeur de qui peut écrire, sans être enregistrés : la famille les relit et les
enregistre. L'hommage n'a pas de texte de départ : il se nourrit de la biographie, la famille
l'écrit ou le demande à l'IA.

### Modèles et formats

- **Livret** : PDF A5 de 4 pages (couverture avec photo, nom, surnom, dates et phrase ; hommage ;
  programme avec date et lieux ; remerciements). Un long programme (jusqu'à 40 moments) se
  poursuit sur les pages suivantes, sans en-tête de tableau laissé seul en bas de page.
- **Affiche** : PDF A4 à imprimer, et image PNG carrée de 1 080 × 1 080 px pour WhatsApp (photo,
  nom, dates, phrase de couverture, date des obsèques et les 5 premiers moments du programme par
  heure, avec leur lieu).
- Couleurs Testimona, variante « sobre » ou « couleur » (`modules/documents/theme.ts`, couleurs
  du texte assombries pour un contraste suffisant) ; pas d'éditeur libre.
- `@react-pdf/renderer` 4 (MIT) pour les PDF, `next/og` (fourni avec Next) pour le PNG ; police PT
  Sans (OFL) embarquée, avec accents (`apps/web/assets/fonts/`).
- Les noms, dates, heures et lieux imprimés viennent de la fiche (la réponse `death.date` prime
  sur la date de décès de la fiche) et de 3.4.

### Document prêt

`documentReadiness` (`modules/documents/model.ts`) liste ce qui manque :

- le nom (fiche, sinon titre du dossier) et **au moins un moment** au programme 3.4, pour les trois
  formats ;
- pour le livret, les trois textes enregistrés et valides ; l'affiche n'exige que la fiche et le
  programme (sans phrase de couverture, elle s'en passe).

La date des obsèques est facultative : sans réponse valide, le livret et l'affiche impriment
« Date à préciser » (« Date to be confirmed »). La synthèse affiche l'état de chaque format et un
lien pour compléter ce qui manque.

### Téléchargement

Route `GET /api/dossiers/[dossierId]/documents/[doc]` (`booklet.pdf`, `poster.pdf`, `poster.png`,
`?lang=fr|en`), `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`, pour tout membre du dossier,
lecteur compris. Le document est produit à chaque demande avec le client utilisateur et la RLS,
jamais service-role, jamais mis en cache.

| Statut | Cas                                                                                        |
| ------ | ------------------------------------------------------------------------------------------ |
| 401    | pas de session (sans corps)                                                                |
| 404    | identifiant ou format invalide, dossier absent, non-membre, étape fermée (sans corps)      |
| 409    | document pas prêt : texte traduit listant ce qui manque                                    |
| 502    | lecture de la fiche ou des réponses en échec (texte traduit)                               |
| 500    | toute autre erreur, rendu compris (texte traduit ; seul le nom de l'erreur est journalisé) |

Toutes les réponses portent `Cache-Control: no-store` et `X-Content-Type-Options: nosniff`, comme
l'export CSV ; un succès est un `attachment` au nom traduit (`livret-obseques.pdf`,
`affiche-obseques.pdf` ou `.png` en français). La photo est lue côté serveur avec le client utilisateur, seulement quand le document
est produit ; son absence ou une erreur de lecture donne un document sans photo.

## 5. Tests

- SQL sur PGlite : RLS des quatre tables, TL010, contrainte sur les exemples, bucket et politiques
  `dossier-photos`, `search_path` de `is_admin()`, test « 100 % des tables ont la RLS ».
- Vitest : quantités, message de devis, programme type, contenu des documents vérifié sur les
  données passées aux modèles (pas au pixel), textes FR/EN typés.
- Tests e2e : limités aux pages publiques, comme aujourd'hui.

Tests ajoutés par la PR 5 (livret et affiche) :

- SQL sur PGlite : `supabase/tests/dossier-photos.test.ts` (trigger, chemin et auteur imposés,
  `set_dossier_photo` avec 28000, 42501, TL012 et TL006, archivage de la photo précédente, RLS) et
  `supabase/tests/dossier-photos-storage.test.ts` (bucket privé, 5 Mo, JPEG seul, envoi seulement
  sur le chemin d'une photo préparée, ni remplacement ni suppression, lecture qui suit la RLS),
  avec le banc `supabase/tests/helpers/dossier-photos.ts`.
- Vitest, module `documents` (`apps/web/src/modules/documents/`) : `texts.test.ts`,
  `texts-service.test.ts`, `actions.test.ts`, `templates.test.ts`, `model.test.ts`,
  `load.test.ts`, `theme.test.ts`, `fonts.test.ts`, `http.test.ts`, `http-sources.test.ts`,
  `render.test.tsx` (données passées aux gabarits, textes accentués à leur longueur maximale,
  programme de 40 moments, format réel du PDF et du PNG), `render-smoke.test.tsx`, `ui/DocumentTexts.test.tsx`, `ui/DocumentsSynthesis.test.tsx` ;
  photo : `photo/schema.test.ts`, `photo/repo.test.ts`, `photo/service.test.ts`,
  `photo/actions.test.ts`, `photo/http.test.ts`, `photo/stripJpegMetadata.test.ts`,
  `photo/ui/PhotoCapture.test.tsx`, `photo/ui/photoError.test.ts`.
- Vitest, IA (`apps/web/src/modules/ai/`) : `documents-facts.test.ts` (liste blanche),
  `documents-prompt.test.ts`, `documents-output.test.ts` (heures, dates inventées, versets),
  `documents.test.ts` (quota, lecture avant quota, refus), `actions.test.ts` (complété).
- Vitest, parcours : `journey/registry.test.ts` (étape 3.5 après 3.4, aucune question sur les
  clés des textes) et
  `journey/quantities.test.ts` (ajusté).

## 6. Livraison

Cinq PR, chacune déployable seule, migration appliquée en production avant la fusion :

1. **Prestataires** : migration (`provider_category`, `provider`, `quote_request`, `search_path` de
   `is_admin()`, exemples), module `providers`, écran `/admin/providers`.
2. **Veillée** : `quantities.ts`, étapes 3.1 et 3.2, capacité `providers` du moteur, encadré,
   ajustement des postes.
3. **Devis** : migration `provider_name`, message, action et trace, historique « Devis demandés ».
4. **Cérémonie** : étape 3.4, programme type, liens Maps, date des obsèques dans les devis. Sans
   migration : `quote_request.step_id` accepte déjà `ceremony-program` et les réponses vivent
   dans `journey_answer`.
5. **Livret et affiche** : migration photo, étape 3.5, PDF et PNG.

Ordre de déploiement de la PR 5 :

1. appliquer la migration `20261101000100_dossier_photos.sql` en production **avant** la fusion
   (table `dossier_photo`, RPC `set_dossier_photo`, bucket `dossier-photos` et ses policies). Sans
   elle, l'envoi de photo échoue ; la synthèse et les documents restent utilisables sans photo ;
2. régénérer les types (`pnpm --filter @testimona/supabase db:types`), complétés à la main dans la
   PR, et les enregistrer dans un commit `chore(db): …`, comme `e70e222` ;
3. fusionner.

## Écarts assumés et décisions de la PR 5

Écarts avec la première version de cette spec, validés par l'utilisateur le 2026-11-03 :

- **Photo courante en deux temps** : la ligne est préparée avant l'envoi, puis désignée par
  `set_dossier_photo`, qui exige le fichier au stockage. La première version disait « le fichier
  doit exister avant l'insertion de la ligne », ce qui est impossible avec une policy de stockage
  qui n'autorise que le chemin d'une ligne préparée. Le contrôle reste celui des reçus : il porte
  sur le rattachement, pas sur l'insertion. D'où la colonne `activated_at` et l'index unique sur
  `activated_at is not null and archived_at is null`.
- **JPEG seul** : le chemin est `<dossier_id>/<id>.jpg`, `shrinkImage` produit toujours du JPEG et
  `@react-pdf/renderer` ne lit pas le WebP. Le bucket n'accepte que `image/jpeg`.
- **Pas de clé `documents.poster.*`** : l'affiche reprend la phrase de couverture du livret.
- **Textes de départ sans IA** pour la couverture et le remerciement, selon le registre ; leurs
  formulations, dont celles du registre croyant qui citent « Dieu », restent à relire par le
  produit.

Décisions prises sur les points ouverts :

| Sujet            | Décision                                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Faits pour l'IA  | Prénom, surnom, registre et biographie 1.6 ; jamais le nom de famille, les dates, les lieux ni le programme.                                            |
| Appel d'IA       | Un seul appel pour les trois textes, sans bouton « Améliorer » par texte.                                                                               |
| Envois de photos | Aucune limite, comme pour les devis : pas de TL011, pas de comptage. TL012 pour une photo déjà désignée ou archivée ; 42501 pour une photo inexistante. |
| Affiche          | Les 5 premiers moments du programme, par heure.                                                                                                         |
| Contenu minimal  | Au moins un moment au programme (sinon 409 avec la liste des manques) ; date des obsèques facultative, « Date à préciser » à la place.                  |
| Retrait de photo | Pas de retrait sans remplacement.                                                                                                                       |
| Police           | PT Sans (OFL), depuis `google/fonts`, embarquée dans `apps/web/assets/fonts/`.                                                                          |

## Hors périmètre

Animation (3.3), logistique (3.6), retour au village (3.7) ; vrais prix des prestataires et leur
usage dans les calculs ; paiement, commission et suivi des devis par Testimona ; impression livrée ;
publication du programme sur l'espace mémoriel (lot 4) ; éditeur libre de mise en page.
