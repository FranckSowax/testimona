# AUDIT TESTIMONA — Phase 0 (Refonte V3 + Modernisation 2026)

**Spec source** : `202104_Testimona_branding_ecrans_V3.pdf` (52 pages, 1920×1080, Acrobat Pro DC)
**Repo** : `apps/web` — Next.js 15 App Router + React 19 + Tailwind v4 + Supabase
**Branche** : `main` — dernier commit `f9930fa feat(testimonial): report dialog + owner edit/delete`
**Date audit** : 2026-05-07
**Auteur** : Claude (avant validation utilisateur — aucun code écrit)

> Le PDF V3 est composé d'écrans rastérisés (52 pages images) ; cet audit s'appuie sur la spec V2 textuelle analysée en session antérieure + les indications V3 verbales du user (cadre conservé, modernisation 2026 demandée). À valider visuellement écran par écran avant Phase 1.

---

## 0. Résumé exécutif

| Item                    | Réalité actuelle                       | Cible V3 + modernisation                                             | Effort |
| ----------------------- | -------------------------------------- | -------------------------------------------------------------------- | ------ |
| Identité couleur        | Palette legacy SCSS (turquoise + rose) | Palette V3 conservée + tokens dark + variants glass                  | S      |
| Typographie             | Lora + Raleway                         | Montserrat + PT Sans + Caveat (substitut Debby) + variable           | M      |
| Système boutons         | 1 variante primary + outline ad-hoc    | 4 variantes × 5 sub-variants (full, outline, ghost, link) × états    | M      |
| Atomes/molécules        | ~12 composants foundation              | ~35 composants (Button, Input, Tag, Avatar, Toast, etc.)             | L      |
| Layout shell            | Header + Footer simples                | Sidebar gauche persistante (logged-in) + hero modernisé              | M      |
| Pages auditées          | 18 routes existantes                   | 28 écrans V3 (gaps : Settings tabs, Memorial settings, Bio chapters) | L      |
| Animations              | `fade-in-up` 250ms                     | Motion tokens + spring + view transitions + scroll-driven (modern)   | M      |
| A11y                    | Skip link, focus-visible global        | Audit WCAG AA complet, contrast 4.5:1, dynamic type, reduced-motion  | M      |
| **Effort total estimé** | —                                      | **22-28 jours dev** (≈ +25% vs estimation V2 pour modernisation)     | —      |

---

## 1. Foundations transverses

### 1.1 Palette — actuelle vs V3

| Token                      | Actuel (`globals.css`)    | Cible V3                                  | Action          |
| -------------------------- | ------------------------- | ----------------------------------------- | --------------- |
| `--color-foreground`       | `#2d3250` (martinique)    | Identique (V3 conserve)                   | KEEP            |
| `--color-primary`          | `#50aac3` (fountain blue) | Identique                                 | KEEP            |
| `--color-primary-soft`     | absent                    | `#7dbed2` (half-baked) requis             | ADD             |
| `--color-accent`           | `#db8186` (new york pink) | Identique                                 | KEEP            |
| `--color-accent-soft`      | `#f4a7ab` (wewak)         | Identique                                 | KEEP            |
| `--color-surface`          | `#f0f2ff` (titan white)   | Identique                                 | KEEP            |
| `--color-muted-foreground` | `#788199` (waterloo)      | Identique                                 | KEEP            |
| **Modernisation**          | —                         | `--color-glass-tint`, `--color-mesh-1..4` | ADD             |
| Dark mode                  | non implémenté            | tokens light/dark séparés (cible V3+)     | ADD (optionnel) |

### 1.2 Typographie — pivot critique

| Rôle                | Actuel                                         | Cible V3                 | Substitut moderne (open-source)                           | Action   |
| ------------------- | ---------------------------------------------- | ------------------------ | --------------------------------------------------------- | -------- |
| Display/serif       | Lora                                           | **Montserrat** (V3 spec) | Montserrat (Google Fonts)                                 | REPLACE  |
| Body sans           | Raleway                                        | **PT Sans** (V3 spec)    | PT Sans (Google Fonts)                                    | REPLACE  |
| Cursive/handwritten | absent                                         | **Debby** (V3 spec)      | **Caveat Brush** ou **Sacramento** (Debby = payant)       | ADD + Q1 |
| Monospaced/tabular  | `font-variant-numeric: tabular-nums` (utility) | idem                     | idem                                                      | KEEP     |
| Variable axis       | absent                                         | absent (V3)              | **Inter Variable** comme fallback display (modernisation) | ADD opt. |

> ⚠️ **Question 1** (validation) : Debby est commercial. Caveat Brush ou Sacramento ? Ou licence Debby ?

### 1.3 Système boutons (gap majeur)

V3 spécifie **4 variantes × 5 sub-variants** :

- **Primary** : `full` (turquoise filled), `outline`, `outline-on-dark`, `ghost`, `link`
- **Secondary** (martinique) : idem
- **Accent** (rose) : idem — usage CTA donations / emphase
- **Destructive** : full + outline pour delete/report

États obligatoires : `default`, `hover`, `active`, `focus-visible`, `disabled`, `loading` (spinner inline).

**Réalité actuelle** : code bouton inline répété sur ≥10 fichiers, pas de variants, pas de loading-state cohérent → **dette critique** à résoudre Phase 2.

### 1.4 Spacing, radius, shadows

| Token           | Actuel                      | Cible V3 + moderne                                             |
| --------------- | --------------------------- | -------------------------------------------------------------- |
| Spacing         | rythme 4/8 (1..12)          | KEEP, ajouter `--space-16, --space-24` pour hero               |
| Radius          | implicite (utility classes) | tokens `--radius-sm/md/lg/xl/full` explicites                  |
| Shadow card     | `0 1px 2..3px` léger        | KEEP, ajouter `--shadow-glass` (backdrop-blur)                 |
| Shadow elevated | `0 4px 12px`                | KEEP, ajouter `--shadow-glow-primary` (modernisation pour CTA) |
| Shadow overlay  | `0 12px 32px`               | KEEP                                                           |

### 1.5 Motion tokens (à étendre pour modernisation)

| Token                      | Actuel                          | Ajouts modernisation                                 |
| -------------------------- | ------------------------------- | ---------------------------------------------------- |
| `--motion-fast`            | 150ms                           | KEEP                                                 |
| `--motion-base`            | 250ms                           | KEEP                                                 |
| `--motion-slow`            | 400ms                           | KEEP                                                 |
| `--motion-ease-out`        | `cubic-bezier(0.16, 1, 0.3, 1)` | KEEP                                                 |
| `--motion-spring`          | absent                          | `cubic-bezier(0.34, 1.56, 0.64, 1)` (overshoot doux) |
| `--motion-scroll`          | absent                          | scroll-driven animations API (CSS native)            |
| `--motion-view-transition` | absent                          | View Transitions API (Next 15 supporte)              |

### 1.6 i18n & a11y

- ✅ next-intl 3.26.5 fonctionnel (fr default + /en)
- ✅ Skip link, focus-visible global
- ⚠️ Aucun audit contraste systématique (à mesurer Phase 1)
- ⚠️ `prefers-reduced-motion` couvert par règle CSS globale (OK) mais animations futures doivent respecter explicitement

---

## 2. Inventaire composants — ~35 atomes/molécules

### 2.1 Existants (à conserver / refactorer)

| Composant        | Fichier                                   | État | Action                                  |
| ---------------- | ----------------------------------------- | ---- | --------------------------------------- |
| `SiteHeader`     | `src/components/SiteHeader.tsx`           | ⚠️   | Refonte pour intégrer search inline V3  |
| `SiteFooter`     | `src/components/SiteFooter.tsx`           | ✅   | Légères retouches social icons          |
| `Modal`          | `src/components/Modal.tsx`                | ✅   | Refacto pour spring animation entrée    |
| `Toast`          | `src/components/Toast.tsx`                | ✅   | Ajouter variants success/error/info     |
| `Skeleton`       | `src/components/Skeleton.tsx`             | ✅   | Ajouter shimmer modernisé               |
| `EmptyState`     | `src/components/EmptyState.tsx`           | ⚠️   | Illustrations dove → mesh gradient opt. |
| `ShareButtons`   | `src/components/ShareButtons.tsx`         | ✅   | Animation copy-feedback                 |
| `LocaleSwitcher` | `src/components/LocaleSwitcher.tsx`       | ✅   | KEEP                                    |
| `MemorialCard`   | `src/components/MemorialCard.tsx`         | ⚠️   | Hover overlay V3 (filtre image)         |
| `HomeFeed`       | `src/components/home/HomeFeed.tsx`        | ⚠️   | Réécrire avec cards V3 + stagger fluide |
| `HomeLeftBanner` | `src/components/home/HomeLeftBanner.tsx`  | ⚠️   | Aligner styles V3 sidebar               |
| `RipSuggestions` | `src/components/home/RipSuggestions.tsx`  | ⚠️   | Card V3 + image hover                   |
| `DashboardShell` | `src/components/dashboard/...`            | ⚠️   | Unifier avec SidebarLeft global         |
| `SidebarNav`     | `src/components/dashboard/SidebarNav.tsx` | ⚠️   | Devient shared `<AppSidebar>`           |

### 2.2 À créer (Phase 2)

**Atomes** (16) :

1. `Button` — 4×5 variants + loading/disabled
2. `IconButton` — square 44×44 min, ripple subtle
3. `Input` — text/email/url avec helper + error inline
4. `Textarea` — auto-grow + counter
5. `Select` — native styled (mobile-friendly)
6. `Checkbox` — custom avec focus ring
7. `Radio` — custom avec focus ring
8. `Switch` — toggle iOS-style + spring
9. `Tag` / `Chip` — labels (life chapter type, donation tier)
10. `Avatar` — fallback initiales + image + status dot opt.
11. `Badge` — count pill (notifications, unread)
12. `Tooltip` — on hover desktop + on long-press mobile
13. `Divider` — horizontal/vertical avec optional label
14. `Spinner` — inline + full-page variant
15. `ProgressBar` — donation goal, upload progress
16. `Icon` — wrapper Lucide unique source SVG

**Molécules** (12) : 17. `FormField` — label + input + helper + error 18. `Card` — 3 elevations (flat / raised / glass) 19. `MemorialCard` (upgrade) — V3 hover overlay 20. `TestimonialCard` (upgrade) — quote glyph V3, comments expand inline 21. `DonationCard` — preset amount tile 22. `LifeChapterCard` — drag handle + edit/delete 23. `TabNav` — segmented control (mémorial tabs : 5) 24. `Breadcrumb` — back + section 25. `SearchBar` — input + suggestions dropdown 26. `Stepper` — multi-step forms (création mémorial) 27. `Sheet` (bottom sheet mobile) — alternative à Modal sur mobile 28. `Drawer` (sidebar modal) — settings panels

**Organismes spécifiques V3** (7) : 29. `AppSidebar` — sidebar gauche persistante (logged-in) 30. `MemorialHero` — bandeau mémorial : avatar + nom + dates + actions 31. `BioEditor` — chapitres glissables (dnd-kit) 32. `PhotoGallery` — grid + lightbox + upload 33. `DonationPanel` — goal + presets + form + supporters 34. `FuneralMap` — Leaflet/Mapbox embed 35. `SettingsAccordion` — sections collapsibles (notifications, account, danger)

---

## 3. Layout shell V3

```
┌─────────────────────────────────────────────────────────────┐
│  SiteHeader (sticky)                                         │
│  ├ Logo · Nav (Home/About/Search) · LocaleSwitcher · User  │
└─────────────────────────────────────────────────────────────┘
┌──────────────┬──────────────────────────────┬───────────────┐
│              │                              │               │
│  AppSidebar  │   <main id="main">           │   (optional   │
│  (logged-in) │     {children}               │    right rail │
│  - Memorials │                              │    on home)   │
│  - Testim.   │                              │               │
│  - Notif •2  │                              │               │
│  - Profile   │                              │               │
│  - Settings  │                              │               │
│              │                              │               │
└──────────────┴──────────────────────────────┴───────────────┘
┌─────────────────────────────────────────────────────────────┐
│  SiteFooter (legal links · social · language)                │
└─────────────────────────────────────────────────────────────┘
```

- Sidebar visible desktop ≥1024px ; bottom nav ou drawer hamburger sur mobile
- Hero section sur pages marketing (home anonymous, about) avec mesh gradient + dove SVG
- Logged-in home : 3 colonnes existantes (sidebar + feed + suggestions) → conserver

---

## 4. Audit page-par-page (28 écrans cibles)

| #   | Écran                       | Route actuelle                                                | État | Écarts vs V3                                       | Composants requis           | Priorité |
| --- | --------------------------- | ------------------------------------------------------------- | ---- | -------------------------------------------------- | --------------------------- | -------- |
| 1   | Home anonyme                | `[locale]/page.tsx` (anon branch)                             | ⚠️   | Hero V3 + cards features sans bordure              | HeroSection, Card×3         | P1       |
| 2   | Home logged-in (feed)       | `[locale]/page.tsx` (auth branch)                             | ⚠️   | Cards V3 + animations stagger                      | TestimonialCard, AppSidebar | P1       |
| 3   | About                       | `[locale]/(public)/about/page.tsx`                            | ⚠️   | Hero V3 + sections illustrées                      | HeroSection, MissionCard    | P2       |
| 4   | Search                      | `[locale]/(public)/search/page.tsx`                           | ⚠️   | SearchBar V3 + suggestions + résultats grid        | SearchBar, MemorialCard     | P1       |
| 5   | Memorial — Testimonials     | `[locale]/(public)/memorial/[slug]/page.tsx?tab=testimonials` | ⚠️   | TabNav V3 + TestimonialCard upgrade                | TabNav, TestimonialCard     | P1       |
| 6   | Memorial — Photos           | `…?tab=photos`                                                | ⚠️   | Grid V3 + lightbox + upload zone                   | PhotoGallery                | P2       |
| 7   | Memorial — Donate           | `…?tab=donation`                                              | ⚠️   | DonationPanel V3 + supporters list                 | DonationPanel               | P1       |
| 8   | Memorial — Life details     | `…?tab=lifeDetails`                                           | ❌   | À créer : chapters bio (read mode)                 | LifeChapterCard, BioEditor  | P1       |
| 9   | Memorial — Funeral          | `…?tab=funeral`                                               | ❌   | À créer : map + adresse + horaires                 | FuneralMap, InfoCard        | P2       |
| 10  | Memorial settings (admin)   | `…/settings` (n'existe pas)                                   | ❌   | À créer : édition nom, dates, public/privé, danger | SettingsAccordion           | P2       |
| 11  | Memorial create — step 1    | `…/dashboard/new/page.tsx`                                    | ⚠️   | Wizard Stepper V3                                  | Stepper, FormField          | P2       |
| 12  | Memorial create — step 2    | (single page actuel)                                          | ❌   | À séparer : photos + bio                           | PhotoUploader, BioEditor    | P2       |
| 13  | Login                       | `[locale]/(auth)/login/page.tsx` + intercept modal            | ⚠️   | Layout V3 split image + form                       | FormField, Button           | P1       |
| 14  | Signup                      | idem                                                          | ⚠️   | idem                                               | idem                        | P1       |
| 15  | Reset password (request)    | absent                                                        | ❌   | À créer (lien depuis login V3)                     | FormField, Button           | P2       |
| 16  | Reset password (confirm)    | absent                                                        | ❌   | À créer                                            | FormField, Button           | P2       |
| 17  | Dashboard — My memorials    | `…/dashboard/page.tsx`                                        | ⚠️   | Grid MemorialCard V3 + empty state                 | MemorialCard, EmptyState    | P1       |
| 18  | Dashboard — My testimonials | `…/dashboard/testimonials/page.tsx`                           | ⚠️   | TestimonialCard V3                                 | TestimonialCard             | P2       |
| 19  | Dashboard — Notifications   | `…/dashboard/notifications/page.tsx`                          | ⚠️   | Item V3 + read/unread states                       | NotifItem                   | P2       |
| 20  | Dashboard — Profile         | `…/dashboard/profile/page.tsx`                                | ⚠️   | Avatar uploader V3 + form sections                 | Avatar, FormField           | P1       |
| 21  | Dashboard — Settings tabs   | absent (intégré profile)                                      | ❌   | À créer : sécurité, notifications, langues, danger | SettingsAccordion           | P2       |
| 22  | Donate success              | `…/donate/success/page.tsx`                                   | ⚠️   | Hero confirmation V3 + share                       | HeroConfirm, ShareButtons   | P3       |
| 23  | Donate cancel               | `…/donate/cancel/page.tsx`                                    | ⚠️   | Reset state V3                                     | EmptyState retry            | P3       |
| 24  | Legal / Mentions            | `…/legal/mentions/page.tsx`                                   | ✅   | Typographie V3                                     | Prose                       | P3       |
| 25  | Legal / Privacy             | `…/legal/privacy/page.tsx`                                    | ✅   | idem                                               | Prose                       | P3       |
| 26  | Legal / Terms               | `…/legal/terms/page.tsx`                                      | ✅   | idem                                               | Prose                       | P3       |
| 27  | 404 / Not found             | absent (Next default)                                         | ❌   | À créer : illustration V3 + CTA                    | EmptyState                  | P3       |
| 28  | Error boundary              | absent                                                        | ❌   | À créer : message friendly + retry                 | EmptyState                  | P3       |

**Légende** : ✅ conforme / ⚠️ refonte styles / ❌ à créer
**Priorité** : P1 = Phase 4a (semaines 1-2) · P2 = Phase 4b (semaines 3-4) · P3 = Phase 4c (finition)

---

## 5. Couche modernisation — "App du futur" (sur cadre V3)

> Demande verbatim : _"fais les mises a jours visuelles necessaires et les animations pour que ca soit une app du futur en gardant le cadre de la refonte"_

### 5.1 Animations de niveau 2026 (au-dessus des transitions de base)

| Technique                       | Usage                                            | Coût    |
| ------------------------------- | ------------------------------------------------ | ------- |
| **Spring physics** (CSS easing) | Boutons press, modal pop, toast slide-in         | Faible  |
| **View Transitions API**        | Navigation entre tabs mémorial, modal open/close | Moyen   |
| **Scroll-driven animations**    | Hero parallax soft, sections reveal              | Faible  |
| **Stagger sequence**            | Cards feed, photo grid (30-50ms par item)        | Déjà OK |
| **Shared element transition**   | Avatar memorial → page mémorial                  | Moyen   |
| **Crossfade content**           | Tab switch interne mémorial                      | Faible  |
| **Scale feedback** (0.97 → 1)   | Press cards/buttons                              | Faible  |
| **Gesture-tracked drag**        | LifeChapter reorder, PhotoGallery sort           | Moyen   |

### 5.2 Surfaces modernes (subtiles, pas envahissantes)

- **Glass-morphism** sur Modal, BottomSheet, sidebar mobile drawer (`backdrop-blur-md` + tint)
- **Mesh gradient** en hero anonymous (3-4 stops de la palette + flou) — alternative à `home-background.png`
- **Soft glow** sur CTA primary critique (donation submit, create memorial) — `box-shadow` accent diffus
- **Layered shadows** plus naturels (4 niveaux d'élévation tokenisés)

### 5.3 Présence temps-réel (Supabase Realtime — non utilisé actuellement)

- **Live testimonials** : nouveau testimonial publié → toast "+1" sur le mémorial ouvert
- **Live donations** : barre de progression qui s'incrémente en direct
- **Online dots** : indicateur subtil sur Avatar si propriétaire connecté (opt-in profile)

### 5.4 Détails de polish

- Variable font `Inter Variable` en fallback display moderne (axes : weight + optical-size)
- Icons : Lucide en `stroke-width={1.75}` (plus fin, plus moderne) au lieu de 2 par défaut
- Curseur custom sur élément draggable (`cursor: grab/grabbing`)
- Number formatting tabular pour montants donation (déjà fait, à étendre dates compteurs)
- Skeleton shimmer remplace spinners > 300ms (déjà spec, à appliquer partout)

### 5.5 À éviter (anti-patterns)

- ❌ Glassmorphism partout (réservé aux surfaces flottantes)
- ❌ Animations décoratives sans intention (motion = causalité, pas décor)
- ❌ Parallax violent (respecter `prefers-reduced-motion`)
- ❌ Loading "futuriste" (lottie 3D) qui dépasse 300ms du fait du chargement asset
- ❌ Custom cursor partout (uniquement éléments interactifs spécifiques)

---

## 6. Risques & dépendances

| Risque                               | Impact     | Mitigation                                         |
| ------------------------------------ | ---------- | -------------------------------------------------- |
| Police Debby payante                 | Bloquant   | Q1 utilisateur — Caveat Brush ou Sacramento (free) |
| Décor PDF V3 non-textuel             | Validation | User valide visuellement chaque écran Phase 4      |
| dnd-kit pour bio chapters            | Faible     | Lib stable, ~30kB                                  |
| Maps funeral (Leaflet vs Mapbox)     | Moyen      | Q2 — Leaflet free vs Mapbox token                  |
| Multi-currency donations             | Moyen      | Q3 — EUR-only ou multi ?                           |
| Multi-admin mémorial                 | Moyen      | Table `MemorialAdmin` + RLS — Q4                   |
| Realtime Supabase quota              | Faible     | Plan free 200 connexions concurrentes — OK MVP     |
| View Transitions support Safari      | Faible     | Fallback automatique (no-op) — OK                  |
| Tests Playwright                     | Moyen      | Q5 — coverage screens P1 only ?                    |
| Storybook                            | Moyen      | Q6 — recommandé pour ~35 atomes                    |
| Feature flag `NEXT_PUBLIC_DESIGN_V2` | Faible     | Q7 — rollout progressif ou full switch ?           |

---

## 7. Plan de phases (proposition)

| Phase     | Contenu                                                | Durée      | Livrable                               |
| --------- | ------------------------------------------------------ | ---------- | -------------------------------------- |
| **0**     | **Audit (ce document)**                                | 0.5j       | `AUDIT_TESTIMONA.md` validé            |
| **1**     | Design tokens (palette, typo, motion)                  | 1-1.5j     | `globals.css` + Tailwind config        |
| **2**     | ~35 atomes/molécules + Storybook (opt.)                | 6-8j       | `src/components/ui/*`                  |
| **3**     | Layout shell (Header, AppSidebar, Footer)              | 2j         | Shell unifié + responsive              |
| **4a**    | Pages P1 (8 écrans critiques)                          | 4-5j       | Home, Search, Memorial, Login, Profile |
| **4b**    | Pages P2 (12 écrans secondaires)                       | 4-5j       | Dashboard, Settings, Bio, Funeral      |
| **4c**    | Pages P3 (8 écrans finition)                           | 1-2j       | Legal, 404, Error, Donate confirm      |
| **5**     | Animations modernes (View Transitions, scroll, spring) | 2-3j       | Polish global                          |
| **6**     | QA — a11y audit, Playwright, perf                      | 2-3j       | Rapport WCAG AA + tests verts          |
| **TOTAL** | —                                                      | **22-28j** | App V3 modernisée                      |

---

## 8. Questions de validation (10)

> Bloquant Phase 1 — réponse requise avant écriture du moindre token.

1. **Police cursive** : Caveat Brush, Sacramento, ou licence Debby ?
2. **Maps funeral** : Leaflet (free, OSM) ou Mapbox (token, plus joli) ?
3. **Multi-currency donations** : EUR uniquement ou support EUR/USD/GBP ?
4. **Multi-admin mémorial** : un seul propriétaire ou plusieurs admins (table dédiée) ?
5. **Tests Playwright** : couverture P1 only (8 écrans) ou exhaustive (28) ?
6. **Storybook** : on l'ajoute pour les ~35 atomes ou pas (gain doc vs maintenance) ?
7. **Feature flag rollout** : `NEXT_PUBLIC_DESIGN_V2=on/off` pour rollout progressif, ou switch complet ?
8. **Mobile pixel-perfect V3** : faut-il les screens mobile dédiés du PDF (si présents) ou responsive auto suffit ?
9. **PayPal embed** : remplacer Stripe Checkout par PayPal embed (V2 spec) ou garder Stripe ?
10. **Niveau modernisation** : `subtil` (juste motion + spring) / `visible` (+ glass + view transitions) / `dramatique` (+ realtime + mesh + scroll-driven) ?

---

## 9. Réponses par défaut si silence (proposition Auto Mode)

Si tu valides "go avec mes defaults" sans répondre point-par-point, j'applique :

1. **Caveat Brush** (free, expressive, proche de Debby)
2. **Leaflet** (free, suffisant pour MVP)
3. **EUR uniquement** (multi-currency Phase ultérieure)
4. **Single owner** pour l'instant (multi-admin → backlog)
5. **Playwright P1 only** (8 écrans critiques)
6. **Pas de Storybook** (CLAUDE.md n'en demande pas)
7. **Switch complet** pas de feature flag (rebranding cohérent)
8. **Responsive auto** (vérification visuelle écran-par-écran sur mobile)
9. **Garde Stripe** (déjà fonctionnel, PayPal = backlog)
10. **Modernisation `visible`** (motion + spring + glass + view transitions, sans realtime ni mesh agressif)

---

**Prêt pour Phase 1** dès validation (ou `go defaults`).
