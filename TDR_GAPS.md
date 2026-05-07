# TdR Testimona — gaps et roadmap

Référence : [`TdR pour Testimona.md`](./TdR%20pour%20Testimona.md)

Ce document liste les écarts entre la spec TdR et l'app actuelle, et sert de
backlog priorisé. Ce qui est ✅ a été livré dans la phase initiale ; le reste
attend des PRs dédiées.

## ✅ Livré (état actuel)

- Bilingue FR/EN (next-intl, `/` = FR, `/en/...` = EN)
- Stack Next.js 15 + Supabase (Auth, RLS, Postgres, Storage prêt)
- Auth Email/Password + Google OAuth
- Page mémorielle (RIP page) avec hero photo de couverture + 5 tabs TdR
  (Témoignages, Photos, Don, Détails de vie, Funérailles)
- Témoignages avec citations stylisées (`quote-open.svg` / `quote-close.svg`)
- Recherche par nom/prénom/surnom (ILIKE), grille de cards
- Dashboard owner + création de mémorial
- Donations Stripe Checkout (presets 5/20/50/100 + montant libre)
- Modales login/signup via Next.js intercepting routes
- Page **/about** avec vision/mission/comment ça marche
- Footer avec liens réseaux sociaux (FB / IG / X / LinkedIn / WhatsApp)
- Sélecteur de langue (header + footer)
- 3 pages légales stub (mentions / privacy / terms)

## ❌ TODO majeurs (TdR non couvert)

### Priorité haute — bloque l'expérience TdR

1. **Multi-administrateurs « close relatives »** (Wikipedia-like)
   - Modèle DB : table `MemorialAdmin` (memorialId, userId, role, status)
   - Workflow d'invitation et d'approbation
   - Validation du lien de parenté (upload acte de naissance / certificat de mariage)
   - UI : page de gestion des admins par memorial owner

2. **Like / commentaire / partage social sur testimonials**
   - Modèle DB : `TestimonialLike (testimonialId, userId, createdAt)` + `TestimonialComment`
   - Boutons Facebook / X / LinkedIn / WhatsApp share via Web Share API + URLs canoniques
   - Compteurs en temps réel (Supabase Realtime ou ISR + revalidation)

3. **Page « My Profile »** (`/dashboard/profile`)
   - Édition nom, photo de profil, email
   - Suivi des dons reçus (close relatives)
   - Réclamation de paiement (intégration Stripe Connect futur)

4. **Page « Notifications »** (`/dashboard/notifications`)
   - Modèle DB : `Notification (userId, type, payload, readAt)`
   - Types : nouveau testimonial / like / share / report / modif RIP / demande close relative
   - Realtime Supabase + badge dans le header

5. **Page « My Testimonials »** (`/dashboard/testimonials`)
   - Liste paginée des testimonials de l'utilisateur
   - Lien vers chaque RIP page

### Priorité moyenne — ergonomie TdR

6. **Recherche enrichie**
   - Filtres : pays, mois/année de décès
   - Suggestion auto pendant la frappe (avec photo)
   - Fallback sur l'âge en cas de doublons

7. **Formulaire de testimonial unifié** (« Write a testimonial »)
   - Aujourd'hui : flow signup → /dashboard/new → témoignage séparé
   - TdR : un seul formulaire qui crée la RIP page si elle n'existe pas
     + matching automatique des doublons par nom/pays/date

8. **Photos / vidéos**
   - Upload photo via Cloudinary signed upload (storage déjà budgété)
   - Vidéos courtes (15s pour le mode story selon TdR)
   - Mode « story Instagram » au clic sur la photo de profil RIP

9. **Donation tab enrichi**
   - Objectif de collecte (barre de progression)
   - Liste des donateurs (avec opt-in nom)
   - Message de remerciement éditable par close relatives

10. **OAuth complémentaire** : Facebook, Twitter/X, Apple
    - Configuration Supabase Dashboard requise (clés OAuth providers)

### Priorité basse — futur (TdR §6-10)

- Espaces publicitaires
- Aide à retrouver les familles de personnes décédées anonymement
- Arbres généalogiques
- Reconnaissance faciale pour matcher les défunts
- Dashboard analytics démographique

## Données / RLS à ajouter

- `MemorialAdmin` (avec workflow validation)
- `TestimonialLike`, `TestimonialComment`
- `Notification`
- `RelationshipProof` (uploads documents pour valider close relative)
- Enrichir `Memorial` avec `country` (TdR : pays de décès) et `coverPhotoUrl`
  explicite

## Notes design

Palette héritée de l'ancienne app conservée :
- Primary turquoise `#50aac3`
- Foreground martinique `#2d3250`
- Accent rose `#db8186`
- Surface `#f0f2ff`

Fonts : Roboto (corps), Montserrat (titres / `font-display`).
