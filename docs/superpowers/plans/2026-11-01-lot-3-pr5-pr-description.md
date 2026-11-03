# feat(documents): livret et affiche (lot 3, PR 5)

> **À lire avant la fusion** : la migration `supabase/migrations/20261101000100_dossier_photos.sql`
> doit être appliquée en production **avant** la fusion. Ensuite, régénérer les types
> (`pnpm --filter @testimona/supabase db:types`) et les enregistrer dans un commit
> `chore(db): …`, comme `e70e222`. Sans la migration, l'envoi de photo échoue (la synthèse et les
> documents restent utilisables sans photo).

## Contexte

Cinquième et dernière PR du lot 3 « Organiser les funérailles »
([spec](../specs/2026-10-28-lot-3-funerailles-design.md), section 4 ;
[plan](2026-11-01-lot-3-pr5-livret-affiche.md)). Elle ajoute l'étape 3.5 « Livret et affiche »
(`funeral-documents`) : après le déroulé de la cérémonie (3.4), la famille choisit une variante,
envoie si elle le souhaite une photo de la personne, relit trois textes (proposés par l'IA ou
partis d'un texte de départ) et télécharge le livret et l'affiche. Les noms, dates, heures et lieux
imprimés viennent de la fiche et de 3.4, jamais de l'IA.

Les décisions prises sur les points ouverts (photo en deux temps, JPEG seul, faits envoyés à l'IA,
un seul appel, aucune limite d'envoi de photos, 5 moments sur l'affiche, contenu minimal, police)
sont reportées dans la spec, section « Écarts assumés et décisions de la PR 5 ».

## Changements

**Base de données** (`20261101000100_dossier_photos.sql`, testée sur PGlite, jamais appliquée par
cette PR)

- Table `dossier_photo` (`activated_at`, `archived_at`, chemin `<dossier_id>/<id>.jpg` imposé,
  index unique de la photo courante), RLS : photo courante lisible par tout membre, le reste par le
  coordinateur et plus ; aucune modification ni suppression par l'API.
- RPC `set_dossier_photo` : verrou du dossier puis de la photo ; 28000, 42501 (rôle insuffisant
  **et** identifiant inexistant), TL012 (déjà désignée ou archivée), TL006 (fichier absent).
- Bucket privé `dossier-photos`, 5 Mo, JPEG seul ; envoi seulement sur le chemin d'une photo
  préparée ; lecture qui suit la RLS de la table. TL011 volontairement inutilisé.
- Types `packages/shared/src/database.types.ts` complétés à la main (à régénérer après
  application).

**Parcours et module `documents`** (`apps/web/src/modules/documents/`)

- Étape 3.5 après 3.4, une question `documents.style` (sobre ou couleur), synthèse propre
  `DocumentsSynthesis`.
- Photo : préparation, envoi par lien signé, désignation ; métadonnées (EXIF, GPS, IPTC) retirées
  côté serveur avant tout document ; vignette par `GET /api/dossiers/[dossierId]/photo` (lien
  signé de 5 minutes).
- Textes `documents.booklet.{cover,tribute,thanks}` (200 / 1 500 / 600 caractères), enregistrés
  séparément dans `journey_answer`. Textes de départ fixes pour la couverture et le remerciement,
  selon le registre.
- Contrôle « prêt » : au moins un moment au programme ; date facultative (« Date à préciser ») ;
  trois textes pour le livret.
- Gabarits : livret PDF A5 (`@react-pdf/renderer` 4.9, MIT), affiche PDF A4, affiche PNG
  1 080 px (`next/og`), police PT Sans (OFL) embarquée.
- Route `GET /api/dossiers/[dossierId]/documents/[doc]` (`booklet.pdf`, `poster.pdf`,
  `poster.png`), runtime Node : 401 / 404 sans corps, 409 avec la liste des manques, 502 / 500,
  `no-store` et `nosniff`. Client utilisateur et RLS uniquement, aucun service-role.

**IA** (`apps/web/src/modules/ai/documents*.ts`)

- Un seul appel pour les trois textes, un appel du quota du jour.
- Liste blanche des faits : prénom, surnom, registre, biographie 1.6 ; jamais le nom de famille,
  les dates, les lieux ni le programme.
- Réponse refusée si elle contient une heure ou une date absente des faits ; références de verset
  permises.

**Documentation** : spec du lot 3 mise à jour (sections 1, 4, 5, 6, écarts et décisions).

## Tests effectués

- `pnpm format:check` : vert.
- `pnpm lint` : 0 erreur (13 avertissements, tous dans des fichiers que cette PR ne touche pas).
- `pnpm typecheck` : vert (3 paquets sur 3).
- `pnpm --filter @testimona/web test` : 149 fichiers, 1 426 tests, tous verts.
- `pnpm --filter @testimona/supabase test` (PGlite) : 17 fichiers, 251 tests, tous verts, dont
  `dossier-photos.test.ts` et `dossier-photos-storage.test.ts`.
- `pnpm --filter @testimona/web build` : vert. Les routes `/api/dossiers/[dossierId]/documents/[doc]`
  et `/api/dossiers/[dossierId]/photo` sont des fonctions Node dynamiques (`ƒ`, aucune en Edge) ;
  `@react-pdf/renderer` (et Yoga) n'apparaît dans aucun fichier de `.next/static` : il reste un
  paquet serveur externe.

**Vérification manuelle en local non faite** : aucune base où la migration est appliquée n'était
disponible. À vérifier à la main, sur une base migrée :

- [ ] envoyer une photo (coordinateur), la voir en vignette, la remplacer ;
- [ ] proposer les textes avec l'IA, en modifier un, enregistrer les trois ;
- [ ] télécharger les trois formats (livret PDF, affiche PDF, affiche PNG), dans les deux variantes ;
- [ ] ouvrir les PDF et vérifier les accents (é, è, ê, ç, œ, « guillemets ») ;
- [ ] ouvrir le PNG dans WhatsApp Web (aperçu et lisibilité sur téléphone) ;
- [ ] vérifier le 409 lisible quand le programme est vide, et « Date à préciser » sans date.

## Risques et limites connues

- **Ordre de déploiement** : fusionner avant d'appliquer la migration casse l'envoi de photo.
- **À valider par le produit** :
  - textes de départ du registre croyant, qui citent « Dieu » (« Que Dieu l’accueille dans sa paix
    et sa lumière. », « Que Dieu vous le rende. ») ;
  - la biographie, texte libre, part à l'IA telle quelle et peut contenir des noms de proches
    (même exposition que les annonces, `data_collection: 'deny'`) ;
  - dans le parcours « décès », l'étape 3.5 vient avant la biographie (1.6) : quand la famille
    arrive pour la première fois à 3.5, l'IA a souvent peu de matière. Envisager de placer 3.5
    après 1.6, ou d'inviter la famille à remplir d'abord la biographie.
- **Coût de rendu** : chaque téléchargement produit le document à la demande (1 à 3 s avec
  photo), sans cache ni limite de débit. À surveiller sur Railway.
- **Branche** : rebaser sur `main` si `main` a bougé sur `ceremony.ts` ou la page de synthèse.
- **Vignette sans nettoyage** : la vignette de la synthèse sert le fichier stocké tel quel. Un JPEG
  envoyé par un coordinateur en contournant l'interface (sans le réencodage de `shrinkImage`)
  garde ses métadonnées EXIF quand les membres l'affichent ; seuls les documents (PDF, PNG) sont
  nettoyés côté serveur.
- **Garde de l'étape 3.5 côté application** : l'envoi de photo n'est réservé à l'étape 3.5 que par
  l'application, pas par le trigger ni par la RPC. Sans conséquence : la photo ne s'affiche nulle
  part en dehors de 3.5.
- **Journaux avant la migration** : tant que la migration n'est pas appliquée, chaque affichage de
  la synthèse et chaque téléchargement journalise une erreur `getCurrentPhoto`.

Suites prévues (hors de cette PR) :

- limite de débit ou cache sur le rendu des documents ;
- purge des fichiers de photo orphelins (suppression d'un dossier, photos préparées jamais
  désignées) ;
- mots en capitales qui se coupent dans les colonnes étroites du tableau du programme ;
- réduction de la photo avant le rendu (une photo envoyée hors de l'interface peut peser 5 Mo) ;
- `modules/budget/receipts/http.ts` sans `nosniff` ni `Referrer-Policy` ;
- soulignement des liens au survol seulement, dans toute l'application.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
