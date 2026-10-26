# Rapport d'analyse & d'exécution — Tests du 2026-06-07 (Testimona)

> Source : `2026-06-07_Testimona Testing.pdf` (44 pages)
> Statut : **✅ implémenté (mise à jour 2026-06-08)** — 42 points faits, 1 partiel, 5 non faits/différés.
> Vérification : `tsc --noEmit` + `next build` + advisors Supabase OK. Migrations v11→v16 appliquées.
> Légende des annotations du PDF :
>
> - **ANS** = question / comportement à corriger (souvent un bug ou un manque)
> - **PHO** = demande de design / d'évolution (alignement maquette initiale)
> - **NOTE** = remarque de tri/ordre

## Légende des colonnes

- **Type** : 🐞 Bug · ✨ Évolution · ❓ Question (à clarifier, pas de code)
- **Effort** : S (≤1 h) · M (½ journée) · L (≥1 journée) · ❓ (à chiffrer après clarif.)

---

## État final par point (mise à jour 2026-06-08)

Légende statut : ✅ Fait · 🟡 Partiel · ⛔ Non fait / différé

| #    | Point                                       | Statut | Ce qui a été fait / réserve                                                                                     |
| ---- | ------------------------------------------- | :----: | --------------------------------------------------------------------------------------------------------------- |
| G1   | Déconnexion sur l'avatar                    |   ✅   | Menu déroulant `HeaderUserMenu` (Profil/Mémoriaux/Notifs/Déconnexion → `/auth/signout`)                         |
| G2   | Sign-in + e-mail de confirmation            |   ✅   | `emailRedirectTo` + écran « Vérifie ta boîte mail ». **Config** : activer « Confirm email » (Supabase) + Resend |
| G3   | Multi-propriétaires (invitations)           |   ✅   | Table `MemorialMember` (v15) + invitation e-mail + accept/refus + droits réels centralisés                      |
| G4   | Algorithme d'envoi d'argent (payout)        |   ⛔   | Hors périmètre : nécessite spécification métier (bénéficiaire vérifié, KYC, répartition)                        |
| H1   | « Create a memorial » en haut de la home    |   ✅   | CTA en haut du fil connecté                                                                                     |
| H2   | Suggestions de recherche dès 3 lettres      |   ✅   | API `/api/search/suggest` + autocomplétion `HeaderSearch`                                                       |
| H3   | Modale « nouveau mémorial » reste ouverte   |   ✅   | Feedback de validation visible (cause de la fenêtre figée)                                                      |
| H4   | Lien de famille après virgule               |   ✅   | Colonne `Testimonial.relationship` (v12) + affichage                                                            |
| MT1  | Lien de famille (My Testimonials)           |   ✅   | Bulle partagée                                                                                                  |
| MT2  | Bulle au format Home                        |   ✅   | Composant `TestimonialBubble` partagé                                                                           |
| MC1  | Clips : retirer « Retour » + sidebar        |   ✅   | Page passée sous `DashboardShell`                                                                               |
| N1   | Total des dons par mémorial                 |   ✅   | Récapitulatif « Contributions par mémorial »                                                                    |
| N2   | 5 derniers donateurs + « voir tout »        |   ✅   | `ContributionGroup` repliable                                                                                   |
| N3   | Idem boutique                               |   ✅   | `ShopContribution` agrégées par mémorial                                                                        |
| N4   | Notifications réseau                        |   ✅   | Section « Votre réseau » (témoignages croisés)                                                                  |
| MP1  | Tooltip sur les icônes                      |   ✅   | `title` sur tous les `ButtonIcon`                                                                               |
| MP2  | Où va le commentaire (2ᵉ icône) ?           |   ✅   | Clarifié : ouvre le formulaire de témoignage (onglet Testimonials)                                              |
| MP3  | Édition réservée par rôle                   |   ✅   | Owner **ou** co-propriétaire uniquement (serveur + UI)                                                          |
| MP4  | « in City (Country) at the age of xx »      |   🟡   | **Âge fait** ; ville/pays différés (nécessite colonnes `Memorial`)                                              |
| T1   | Bulle harmonisée                            |   ✅   | `TestimonialBubble`                                                                                             |
| T2   | Lien de famille après virgule               |   ✅   | idem H4                                                                                                         |
| T3   | Onglets sur une seule ligne                 |   ✅   | `flex-nowrap` + scroll horizontal                                                                               |
| T4   | Boutique en dernier onglet                  |   ✅   | Réordonnancement                                                                                                |
| T5   | Zone d'écriture directe dans l'onglet       |   ⛔   | Différé (refonte design ; formulaire encore déclenché par bouton)                                               |
| T6   | Retirer le bouton « Laisser un témoignage » |   ⛔   | Différé (lié à T5)                                                                                              |
| T7   | Inscription obligatoire pour témoigner      |   ✅   | Garde serveur + CTA « Se connecter pour témoigner »                                                             |
| T8   | Témoignage texte / photo / les deux         |   ⛔   | Différé (upload photo dans le formulaire témoignage + schéma)                                                   |
| P1   | Bouton « proposer une photo » en haut       |   ✅   | Remonté au-dessus de la grille                                                                                  |
| P2   | Photos publiées puis revues a posteriori    |   ✅   | Statut `approved` immédiat + retrait famille                                                                    |
| P3   | Commenter / liker / partager / signaler     |   ✅   | `PhotoLike`/`PhotoReport` (v14) + `PhotoComment` (v16)                                                          |
| D1   | E-mail de confirmation + remerciement       |   ✅   | Déjà câblé (webhook Stripe). **Config** : Resend + `STRIPE_WEBHOOK_SECRET`                                      |
| D2   | Bouton de don en haut du goal               |   ✅   | Déplacé au-dessus de la barre                                                                                   |
| D3   | Zone de texte « mot aux donateurs »         |   ✅   | `donationAbout` affiché + éditable                                                                              |
| D4   | Boutons partage + édition du goal           |   ✅   | `ShareLinkButton` + modale d'édition objectif/devise/message                                                    |
| D5   | Libellé « About the donation »              |   ✅   | i18n FR/EN                                                                                                      |
| B1   | Champ quantité                              |   ✅   | Sélecteur de quantité → montant = quantité × prix                                                               |
| B2   | Prix unitaire en menu déroulant             |   ✅   | Paliers alignés sur les dons                                                                                    |
| B3   | Anti-doublons + tri alphabétique            |   ✅   | Garde serveur + tri par nom                                                                                     |
| BIO1 | Bouton « Add a life chapter » en haut       |   ✅   | Remonté                                                                                                         |
| BIO2 | Validation des villes (autocomplétion)      |   ⛔   | Différé (intégration Google Places à prévoir)                                                                   |
| BIO3 | Liens réseaux sociaux du défunt             |   ✅   | Colonne `Biography.socialLinks` (v13) + champ + affichage                                                       |
| BIO4 | Ne plus limiter à 2 médias/chapitre         |   ✅   | Limite levée                                                                                                    |
| F1   | Modale funéraire se ferme après submit      |   ✅   | Confirmé (fermeture + revalidation)                                                                             |
| F2   | Boutons partage + édition d'événement       |   ✅   | `updateFuneralEventAction` + modale d'édition + partage                                                         |
| F3   | Tri chronologique des événements            |   ✅   | Tri date puis heure                                                                                             |
| F4   | URL et Note ne s'affichent pas              |   ✅   | Colonnes `url`/`note` (v11) + plomberie + affichage                                                             |
| F5   | Adresse / lien Google Maps + validation     |   ✅   | Helper `lib/geo/maps` (adresse libre **ou** lien Maps)                                                          |
| S1   | « Danger zone » clarifiée                   |   ✅   | Renommée « Session » + description, style neutralisé                                                            |

**Migrations appliquées (fichiers dans `infra/supabase/`)** : v11 (funeral url/note), v12 (testimonial relationship), v13 (biography social links), v14 (photo likes/reports), v15 (memorial members), v16 (photo comments).

**Réserves de configuration (non-code)** : e-mails (Resend) ; « Confirm email » Supabase (G2) ; webhook Stripe (D1).

---

## 1. Général (page 4)

| #   | Demande                                                                                                                                | Type  | Fichier(s) concerné(s)                                                                                                   | Action proposée                                                                                                                       | Effort |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| G1  | En cliquant sur la photo en haut à droite, pas de « log out »                                                                          | 🐞    | `app/[locale]/layout.tsx`, header / menu avatar                                                                          | Transformer l'avatar en menu déroulant (Profil, Paramètres, **Déconnexion** → `/auth/signout`)                                        | S      |
| G2  | Pas de page Sign-in/Sign-up au démarrage ; après création, recevoir un courriel de confirmation                                        | 🐞/✨ | `(auth)/signup/*`, Supabase Auth                                                                                         | 1) Vérifier le flux d'inscription accessible non connecté. 2) Activer **email de confirmation** (Supabase `confirm email`) + template | M      |
| G3  | Pouvoir avoir plus d'un propriétaire si le créateur n'est pas de la famille (invitation par courriel + notification, accepter/rejeter) | ✨    | `packages/database` (table `memorial_members`/rôles), `(public)/memorial/[slug]/_actions/admin.ts`, notifications, email | Modèle co-propriétaires : invitation → email + notif → acceptation/refus. **Nécessite migration DB**                                  | L      |
| G4  | Trouver un algorithme pour envoyer l'argent à la bonne personne (payout des dons)                                                      | ❓/✨ | `dashboard/profile/PayoutSection.tsx`, `lib/credits`, dons                                                               | Spécification métier à cadrer (bénéficiaire vérifié, KYC, répartition). **À clarifier avant dev**                                     | ❓     |

---

## 2. Home Page (pages 6-9)

| #   | Demande                                                                                                                           | Type | Fichier(s)                                                                  | Action proposée                                                                                 | Effort |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------ |
| H1  | Avoir « Create a memorial » en haut de la home                                                                                    | ✨   | `app/[locale]/page.tsx`, `components/home/*`                                | Ajouter un CTA « Create a memorial » en partie haute (hero)                                     | S      |
| H2  | Recherche : suggestions de noms dès 3 lettres saisies                                                                             | ✨   | `(public)/search/page.tsx`, barre de recherche du header                    | Autocomplétion (debounce, déclenché à ≥3 caractères, requête `ilike` sur les noms de mémoriaux) | M      |
| H3  | Création d'un nouveau mémorial : au clic sur Submit, la fenêtre reste ouverte (comme funeral) ; « Mr Monkey » créé n'apparaît pas | 🐞   | `(dashboard)/dashboard/new/NewMemorialModalShell.tsx`, `new/actions.ts`     | Après succès : fermer la modale + `router.refresh()`/redirection + revalidation de la liste     | M      |
| H4  | Bulle témoignage : mettre le lien de famille **après une virgule** suite au nom (ex. « Léa, Petite-fille ») ; voir design initial | ✨   | `_components/TestimonialItem.tsx`, bulle « Recent testimonials » de la home | Format unifié `"{nom}, {lien de famille}"`. Voir aussi T-\* (harmonisation)                     | S      |

---

## 3. My Testimonials Page (page 11)

| #   | Demande                                                                                      | Type | Fichier(s)                                                           | Action proposée                                                                                  | Effort |
| --- | -------------------------------------------------------------------------------------------- | ---- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------ |
| MT1 | Lien de famille après virgule suite au nom (idem H4)                                         | ✨   | `(dashboard)/dashboard/testimonials/page.tsx`, `TestimonialItem.tsx` | Réutiliser le composant de bulle commun                                                          | S      |
| MT2 | Utiliser le **même format de bulle** que Home → Recent testimonials (harmonisation visuelle) | ✨   | `dashboard/testimonials/page.tsx`                                    | Factoriser un composant `TestimonialBubble` partagé Home + My Testimonials + onglet Testimonials | M      |

---

## 4. My Clips Page (page 13)

| #   | Demande                                                                    | Type | Fichier(s)                                                                | Action proposée                                                           | Effort |
| --- | -------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------ |
| MC1 | Enlever le bouton « Retour » et afficher plutôt le menu (sidebar) à gauche | ✨   | `(dashboard)/dashboard/clips/page.tsx`, `ClipsList.tsx`, layout dashboard | Retirer le bouton Retour, rattacher la page au layout avec sidebar gauche | S      |

---

## 5. Notification Page (page 15)

| #   | Demande                                                                                                                     | Type | Fichier(s)                                                    | Action proposée                                                                                                      | Effort |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------ |
| N1  | Voir le **total des dons par mémorial**                                                                                     | ✨   | `(dashboard)/dashboard/notifications/page.tsx`, requêtes dons | Bloc récapitulatif agrégé par mémorial                                                                               | M      |
| N2  | Menu déroulant des **derniers donateurs** (5 derniers, du + récent au + ancien) + « see all »                               | ✨   | idem + composant donateurs                                    | Liste repliable top 5 + lien « see all »                                                                             | M      |
| N3  | Même chose pour **boutique** (5 derniers acheteurs + see all)                                                               | ✨   | notifications + `lib/shop`                                    | Idem N2 côté commandes boutique                                                                                      | M      |
| N4  | Recevoir une notif quand une personne ayant commenté **notre** mémorial commente **un autre** mémorial (qu'on n'a pas créé) | ✨   | `lib/notifications`, triggers commentaires                    | Règle de notification « réseau » : suivre les auteurs de témoignages croisés. **À cadrer (volumétrie / vie privée)** | L      |

---

## 6. Memorial Page — vue principale (pages 17-19)

| #   | Demande                                                                                                                            | Type  | Fichier(s)                                                  | Action proposée                                                                         | Effort |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------ |
| MP1 | Icônes à droite (barre verticale) : afficher un **tooltip/titre** au survol                                                        | 🐞/✨ | `_components/MemorialCoverSidebar.tsx` (ou barre d'actions) | Ajouter `title`/tooltip accessible sur chaque icône                                     | S      |
| MP2 | 2ᵉ icône = ajouter un commentaire ? Le commentaire va où ?                                                                         | ❓    | barre d'actions cover                                       | Clarifier la cible (onglet Testimonials ?) puis libeller via tooltip MP1                | S      |
| MP3 | 3ᵉ icône (édition) : « n'importe qui peut l'éditer ? » → contrôle d'accès                                                          | 🐞    | barre d'actions + `_actions/memorial-update.ts`             | Masquer/désactiver l'édition pour les non-propriétaires (vérif. rôle serveur **et** UI) | M      |
| MP4 | « Edit info » : afficher « in City (Country) » et « at the age of xx » ; utile pour identifier la personne s'il n'y a pas de photo | ✨    | `_components/MemorialEditModalShell.tsx`, en-tête mémorial  | Composer la ligne lieu + âge calculé (décès − naissance)                                | S      |

---

## 7. Onglet Testimonials (pages 21-24)

| #   | Demande                                                                                                    | Type | Fichier(s)                                                                           | Action proposée                                                                                            | Effort |
| --- | ---------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | ------ |
| T1  | Format de bulle harmonisé avec Home → Recent testimonials                                                  | ✨   | `_components/TestimonialsSection.tsx`, `TestimonialItem.tsx`                         | Composant `TestimonialBubble` partagé (cf. MT2)                                                            | M      |
| T2  | Lien de famille après virgule suite au nom                                                                 | ✨   | `TestimonialItem.tsx`                                                                | idem H4                                                                                                    | S      |
| T3  | Tous les onglets sur la **même ligne** (Funeral arrangements passe à la ligne)                             | 🐞   | `_components/MemorialTabs.tsx` (`flex-wrap` → débordement du 6ᵉ onglet) + `page.tsx` | Retirer `flex-wrap` / gérer le scroll horizontal, ou intégrer « Funeral arrangements » comme onglet normal | S      |
| T4  | Mettre **Boutique en dernier** onglet                                                                      | ✨   | `page.tsx` (ordre du tableau `tabs`)                                                 | Réordonner : Testimonials, Photos, Donation, Biography, Funeral, **Boutique**                              | S      |
| T5  | Prévoir une **zone pour écrire un témoignage** directement dans l'onglet (présente dans le design initial) | ✨   | `_components/TestimonialPublicForm.tsx`, `TestimonialsSection.tsx`                   | Afficher la zone de saisie en haut de l'onglet (champ « What is your most memorable souvenir? »)           | M      |
| T6  | Le bouton actuel (« Laisser un témoignage ») n'existe pas dans le design initial → à retirer               | ✨   | `TestimonialsSection.tsx`                                                            | Supprimer le bouton au profit de la zone T5                                                                | S      |
| T7  | Obliger l'**inscription** pour commenter (contrôle du contenu)                                             | ✨   | `TestimonialPublicForm.tsx`, `_actions`                                              | Exiger l'authentification avant soumission (retirer le mode anonyme)                                       | M      |
| T8  | Un témoignage doit pouvoir être : **texte seul / photo seule / texte + photo(s)**                          | ✨   | `TestimonialPublicForm.tsx`, `_actions`, validation                                  | Rendre texte et photo optionnels (au moins l'un des deux), gérer upload multi-photos                       | M      |

---

## 8. Onglet Photos (page 26)

| #   | Demande                                                                                                  | Type | Fichier(s)                                                                   | Action proposée                                                                                                                                 | Effort |
| --- | -------------------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| P1  | Le bouton (« Add a photo » / Proposer une photo) doit être **en haut**                                   | ✨   | `_components/PhotosSection.tsx`, `PhotoUploader.tsx`                         | Remonter le bouton au-dessus de la grille                                                                                                       | S      |
| P2  | Photos/vidéos revues **a posteriori** par la famille (pas avant publication)                             | ✨   | `PhotoPublicSubmitModal.tsx`, `PhotoModerateButtons.tsx`, `photo-actions.ts` | Publier immédiatement puis modération différée (statut « publié » par défaut + possibilité de retrait) — **à confirmer vs modération actuelle** | M      |
| P3  | Ajouter sous chaque photo les mêmes options que les témoignages : **commenter, partager, liker, report** | ✨   | `PhotosSection.tsx`, `PhotoStoryViewer.tsx`                                  | Réutiliser la barre d'actions des témoignages                                                                                                   | M      |

---

## 9. Onglet Donations (pages 28-29)

| #   | Demande                                                                    | Type | Fichier(s)                                                     | Action proposée                                                        | Effort |
| --- | -------------------------------------------------------------------------- | ---- | -------------------------------------------------------------- | ---------------------------------------------------------------------- | ------ |
| D1  | Donateur reçoit un **courriel de confirmation + remerciement**             | ✨   | `(public)/donate/actions.ts`, webhook Stripe, `lib/email`      | Email transactionnel après don confirmé                                | M      |
| D2  | Placer le bouton « Make a donation » **en haut** du carré fundraising goal | ✨   | `_components/DonateSection.tsx`, `DonationGoal.tsx`            | Déplacer le bouton au-dessus de la barre de progression                | S      |
| D3  | Prévoir une **zone de texte** (admin) : mot à l'attention des donateurs    | ✨   | `DonateSection.tsx`, `_actions`, DB (champ `donation_message`) | Champ éditable affiché aux donateurs. **Migration DB**                 | M      |
| D4  | Bouton **partage** + bouton **édition** (montant cible + message)          | ✨   | `DonationGoal.tsx`, `_actions/shop.ts`/donation                | Ajouter actions partage + édition du goal et du message (propriétaire) | M      |
| D5  | Écrire plutôt « **About the donation** »                                   | ✨   | `DonateSection.tsx` + i18n `messages/*`                        | Renommer le libellé                                                    | S      |

---

## 10. Onglet Boutique (pages 31-33)

| #   | Demande                                                                                           | Type  | Fichier(s)                                                                    | Action proposée                                                              | Effort |
| --- | ------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------ |
| B1  | But = acheter des unités → ajouter un **champ quantité** ; garder les dons dans l'onglet Donation | 🐞/✨ | `_components/ShopSection.tsx`, `ShopContributeButton.tsx`, `_actions/shop.ts` | Ajouter sélecteur quantité ; séparer clairement boutique (achat) de donation | M      |
| B2  | Prix unitaire identique à « make a donation » (menu déroulant)                                    | ✨    | `ShopSection.tsx`, `ShopOwnerPanel.tsx`                                       | Aligner la grille de prix sur celle des dons                                 | S      |
| B3  | Éviter les **doublons** d'articles + tri **alphabétique**                                         | 🐞/✨ | `ShopOwnerPanel.tsx`, `_actions/shop.ts`                                      | Contrainte d'unicité (nom par mémorial) + tri alphabétique à l'affichage     | M      |

---

## 11. Onglet Biography (pages 35-36) _(intitulé « Bibliography » dans le PDF)_

| #    | Demande                                                                | Type  | Fichier(s)                                                         | Action proposée                                                   | Effort |
| ---- | ---------------------------------------------------------------------- | ----- | ------------------------------------------------------------------ | ----------------------------------------------------------------- | ------ |
| BIO1 | Bouton « + Add a life chapter » **en haut**                            | ✨    | `_components/BiographyChaptersManager.tsx`, `BiographySection.tsx` | Remonter le bouton au-dessus de la liste des chapitres            | S      |
| BIO2 | Pour les villes : **valider la donnée** (autocomplétion type aéroport) | ✨    | `BiographyInfoCard.tsx`, modale Edit info                          | Champ ville avec autocomplétion (Google Places / liste contrôlée) | M      |
| BIO3 | Ajouter un champ pour les **liens réseaux sociaux** du défunt          | ✨    | `BiographyInfoCard.tsx`, `_actions/biography.ts`, DB               | Champs social media + affichage. **Migration DB**                 | M      |
| BIO4 | Ne **pas limiter à 2 photos/vidéos** par life chapter                  | 🐞/✨ | `BiographyChaptersManager.tsx`, `_actions/biography.ts`            | Lever la limite de 2 médias par chapitre                          | S      |

---

## 12. Onglet Funeral (pages 38-40)

| #   | Demande                                                                                                             | Type | Fichier(s)                                                            | Action proposée                                                   | Effort |
| --- | ------------------------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------------------- | ----------------------------------------------------------------- | ------ |
| F1  | Après création d'un événement + Submit : la fenêtre doit se **fermer** et revenir à la page funeral                 | 🐞   | `_components/FuneralEventCreateModalShell.tsx`, `_actions/funeral.ts` | Fermer la modale + revalider après succès (même correctif que H3) | M      |
| F2  | Ajouter bouton **partage** + bouton **edit** par événement                                                          | ✨   | `FuneralSection.tsx`, `_actions/funeral.ts`                           | Actions partage + édition d'événement (propriétaire)              | M      |
| F3  | Les événements doivent se classer en **ordre chronologique**                                                        | 🐞   | `FuneralSection.tsx` / requête                                        | Tri par date/heure croissante                                     | S      |
| F4  | **URL** et **Note** ne s'affichent pas                                                                              | 🐞   | `FuneralSection.tsx`                                                  | Afficher les champs URL et Note saisis                            | S      |
| F5  | Adresse : pouvoir saisir l'**adresse complète** ou coller un **lien Google Maps**, avec **validation** de la donnée | ✨   | `FuneralEventCreateModalShell.tsx`, `_actions/funeral.ts`             | Champ adresse + parsing/validation lien Maps (géocodage)          | M      |

---

## 13. Page Settings (page 42)

| #   | Demande                                                                            | Type  | Fichier(s)                              | Action proposée                                                                                                                                          | Effort |
| --- | ---------------------------------------------------------------------------------- | ----- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| S1  | « C'est quoi danger zone ? » → la zone ne contient que « Sign out of this device » | ❓/✨ | `dashboard/profile/SecuritySection.tsx` | Soit renommer/clarifier (ce n'est pas réellement « dangereux »), soit y placer les vraies actions destructrices (suppression de compte). **À clarifier** | S      |

---

## Synthèse & priorisation proposée

**Bugs purs (correctifs rapides, fort impact) — à traiter en priorité :**

- G1 (déconnexion absente), H3 + F1 (modales qui ne se ferment pas / revalidation), T3 (onglets sur une ligne), F3 (tri chrono), F4 (URL & Note non affichées), MP3 (édition non protégée).

**Quick wins UI (effort S) :**

- H1, H4, MT1, MC1, MP1, MP4, T2, T4, P1, D2, D5, BIO1, BIO4, S1.

**Évolutions moyennes (M) :**

- G2 (email confirmation), H2 (suggestions recherche), MT2/T1 (bulle partagée), N1-N3, T5-T8, P2-P3, D1-D4, B1-B3, BIO2-BIO3, F2, F5.

**Chantiers lourds (L) — à cadrer avant dev :**

- G3 (multi-propriétaires + invitations + migration DB), N4 (notifications réseau), G4 (algorithme d'envoi d'argent / payout).

**Points à clarifier avant tout code (❓) :**

- G4 (règle métier payout), MP2 (destination du commentaire 2ᵉ icône), P2 (politique de modération a posteriori vs actuelle), N4 (vie privée/volumétrie), S1 (intention de la « danger zone »).

**Migrations base de données nécessaires :** G3 (co-propriétaires/invitations), D3 (message de don), BIO3 (liens réseaux sociaux), éventuellement B3 (unicité boutique).

---

### Prochaine étape proposée

Commencer par le lot **Bugs purs + Quick wins S** (aucune migration, aucun arbitrage métier), puis dérouler les évolutions M par onglet. Les chantiers L et les points ❓ font l'objet d'une validation préalable.
