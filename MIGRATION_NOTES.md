# Migration Notes — Testimona V2 Refonte

Date livraison : 2026-05-09
Scope : refonte UI/UX pixel-perfect alignée sur la maquette V3 PDF (Florence Chan, mai 2021), modernisée 2026.

---

## 🎯 Vue d'ensemble

6 sprints livrés en commits atomiques sur `main` (origin GitHub) :

| Sprint | Contenu                                                                                                                                                    | Commit        |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| A      | Tokens V2 stricts + Hero "beautiful stories" + Sidebar 5 items + Footer/Header V2                                                                          | `3b9ab4c`     |
| B1     | 4 boutons V2 (`ButtonContainer/Outlined/Text/Icon`) + 4 molécules (Breadcrumb, KebabMenu, ProgressBar, CommentComposer)                                    | `bb28699`     |
| B2     | 8 molécules supplémentaires (Avatar rose border, MemorialListItem, NotificationItem, DonationItem, PhotoCard, EventCard, MemorialHeaderCard, ImageGallery) | `ff9e5cd`     |
| C1     | 3 auth overlays full-screen navy (Login + Signup split + Welcome) + base `OverlayModal`                                                                    | `a05744e`     |
| C2-4   | 8 popups light card (PopupCard base + Testimonial Create + Thank You + Donation Create + Memorial admin × 3 + Bio × 2 + Funerals × 2 + Donations Edit)     | `d739f05`     |
| D1+D2  | Memorial page V2 (MemorialHeaderCard) + Settings 4-section accordion                                                                                       | `b3543ad`     |
| D3     | User profile public `/user/[id]`                                                                                                                           | `7a43c90`     |
| E+F    | Animations V2 (like-pulse, bell-shake) + Playwright config + 8 smoke tests + MIGRATION_NOTES                                                               | (this commit) |

---

## 🎨 Design Tokens V2 stricts

Source : `apps/web/src/app/globals.css`, importé via `apps/web/src/app/[locale]/layout.tsx`.

### Couleurs V2 (Florence Chan PDF spec)

```
--color-primary           #50aac3  (fountain blue — CTA secondaires, menus actifs)
--color-primary-soft      #7dbed2  (half-baked — hover)
--color-foreground        #2d3250  (martinique — texte principal)
--color-accent            #db8186  (new york pink — CTA principaux donations/testimonial)
--color-accent-soft       #f4a7ab  (wewak)
--color-bg-hover-blue     #f0f2ff
--color-bg-active-blue    #c8cef5
--color-bg-hover-pink     #ffefef
--color-bg-active-pink    #fcdbdb
--color-bg-hover-gray     #fafafa
--color-bg-active-gray    #efefef
```

### Typographie

- **Display** : Montserrat (V2 spec — remplace Lora)
- **Body** : PT Sans (V2 spec — remplace Raleway)
- **Cursive** : Caveat Brush (substitut Debby — police libre, voir Q1 audit pour Debby commercial)

### Modernisation 2026

- Tokens glass (`--color-glass-tint`, `surface-glass` utility)
- Mesh gradient (`bg-mesh` utility)
- Spring physics (`--motion-spring`, `--motion-spring-gentle`)
- View Transitions API actif via `@view-transition`
- Scroll-driven animations (`@supports (animation-timeline: scroll())`) — Chrome 115+
- Animations V2 ajoutées en Sprint E : `like-pulse`, `bell-shake`, `tab-underline-slide`

---

## 🧩 Composants V2 livrés

Total : **24 atomes/molécules + 11 popups + 1 accordion = 36 composants** dans `apps/web/src/components/`.

### Atomes UI (`components/ui/`)

| Composant                                                                                                                          | Usage                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `Button` legacy + `buttonClasses(opts)` helper                                                                                     | Compat call-sites antérieurs ; helper pour `<Link>` styling           |
| **`ButtonContainer`**                                                                                                              | filled rose pleine — CTA "Write a testimonial", "Post my testimonial" |
| **`ButtonOutlined`** (5 sub-variants : popup-blue / popup-rose / thankyou-gray / page-gray / page-blue)                            | Tous les boutons outlined V2                                          |
| **`ButtonText`** (4 sub-variants : menu-sidebar / subtab / action / filter)                                                        | Sidebar items, sub-tabs, REPORT/VIEW MORE links                       |
| **`ButtonIcon`** (tone : default / pink / liked)                                                                                   | Icônes interactives (heart/share/comment/bell)                        |
| `Spinner`, `Card`, `Badge`, `Tag`, `Input`, `Textarea`, `FormField`, `Checkbox`, `Switch`, `TabNav`, `Tooltip`, `Stepper`, `Sheet` | Atomes génériques                                                     |
| `Avatar` avec **`border: 'rose'`** V2                                                                                              | Memorial main avatar avec rose 4px border                             |
| **`Breadcrumb`**                                                                                                                   | last item Bold navy 22px, prev italic gray                            |
| **`KebabMenu`**                                                                                                                    | Owner actions menus avec items destructive opt                        |
| **`ProgressBar`**                                                                                                                  | Donation goals                                                        |
| **`CommentComposer`**                                                                                                              | avatar + input + emoji slot + submit rose pen                         |
| **`MemorialListItem`**                                                                                                             | avatar rose + name + meta — User profile, dashboard                   |
| **`NotificationItem`**                                                                                                             | unread dot + memorial bold + relation italic                          |
| **`DonationItem`**                                                                                                                 | "Donation by ... relation" + amount/Participated                      |
| **`PhotoCard`**                                                                                                                    | 16:10 image + video play overlay                                      |
| **`EventCard`**                                                                                                                    | title + Date/Starts/Ends + map iframe                                 |
| **`MemorialHeaderCard`**                                                                                                           | cover + bordered avatar débordant + bio block                         |
| **`ImageGallery`**                                                                                                                 | modal 1191×962 + carousel arrows + comments scroll                    |

### Popups V2 (`components/popups/`)

| Popup                                                           | Spec PDF  |
| --------------------------------------------------------------- | --------- |
| `OverlayModal` (base full-screen navy)                          | —         |
| `LoginOverlay`                                                  | p08-09    |
| `SignupOverlay`                                                 | p10-11    |
| `WelcomeOverlay`                                                | p13       |
| `PopupCard` + `PopupHeader` (base light card)                   | —         |
| `MyTestimonialCreateModal`                                      | p05/14/20 |
| `ThankYouTestimonialModal`                                      | p15       |
| `MyDonationCreateModal` (currency + pills + PayPal flag)        | p16-18-36 |
| `MemorialFormPopup` (create/edit) + `MemorialAdminRequestPopup` | p21-23    |
| `BiographyEditPopup` + `BiographyChapterCreatePopup`            | p38-39    |
| `FuneralsEditPopup` + `FuneralEventCreatePopup`                 | p42-44    |
| `DonationsEditModal`                                            | p32       |

### Layout shell V2

| Composant           | V2 changement                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| `SiteHeader`        | Sticky bg-white/80 + backdrop-blur, search inline, "Write a testimonial" rose CTA logged-in        |
| `SiteFooter`        | 3 cols : copyright + nav (Sign in rose / About / FAQ / Terms / Privacy / Cookies) + LocaleSwitcher |
| `AppSidebar`        | RSC, Badge count auto                                                                              |
| `AppSidebarNav`     | **5 items V2** : Home / My Testimonials / My Notifications / My Memorials / Settings               |
| `SettingsAccordion` | 4 sections collapsibles : My account / Sign in & Security / Donations / Request Payment            |

---

## 🔥 Breaking changes

### Composants supprimés

- `apps/web/src/components/home/HomeLeftBanner.tsx` — remplacé par `AppSidebar`
- `apps/web/src/components/dashboard/SidebarNav.tsx` — remplacé par `AppSidebarNav`

### Renames i18n

- `dashboard.nav.profile` → `dashboard.nav.settings` (alignement V2 : 5 items, dernier = Settings)

### `<Link><Button>` nesting → `buttonClasses` helper

Le pattern `<Link><Button>label</Button></Link>` produit `<a><button>` (HTML invalide) qui causait React #310 hydration mismatch en prod. Fix : helper `buttonClasses(opts)` exporté depuis `Button.tsx`. 5 fichiers convertis : home page anonymous, search, dashboard, SiteHeader, AppSidebar.

### `output: standalone` retiré du `next.config.mjs`

Standalone output incompatible avec `next start` en Next.js 15. Sur Railway/Nixpacks, le start command est `pnpm start` — donc standalone enlevé.

---

## ✅ Accessibilité (WCAG 2.1 AA)

### Conformité atteinte

- ✅ `:focus-visible` global avec outline 2px primary
- ✅ `prefers-reduced-motion: reduce` couvre toutes les animations + view-transitions
- ✅ Skip link "Aller au contenu" dans layout
- ✅ Tous les boutons icon-only ont `aria-label`
- ✅ Tous les inputs ont `<label>` associé (FormField inject id/htmlFor)
- ✅ Form errors ont `role="alert"` + `aria-invalid` + `aria-describedby`
- ✅ Tabs : `role="tablist"` / `role="tab"` / `aria-selected` + keyboard arrows (MemorialTabs)
- ✅ Modals : `<dialog>` natif avec `cancel` event + Escape close
- ✅ Images décoratives : `alt=""` ou `aria-hidden="true"`
- ✅ Color contrast tokens : navy `#2d3250` sur white = 11.5:1 (AAA)
- ✅ Live regions : Toast a `aria-live="polite"`

### À auditer / TODO post-livraison

- ⚠️ **Contrast turquoise sur white** : `#50aac3` sur `#ffffff` = 3.21:1 — passe AA pour text ≥ 18pt mais pas pour body 14px. Si utilisé sur body, ajouter contrast layer.
- ⚠️ **Caveat Brush en hero slogan** : test visuel requis (lisibilité contraste fond image clouds).
- ⚠️ **Dynamic type** : pas testé contre Apple Dynamic Type / Android scaling > 200%.
- ⚠️ **VoiceOver / NVDA** : non testé manuellement — automatisation `axe-core` recommandée en CI.

---

## ⚙️ Setup pour reprise dev

```bash
pnpm install
pnpm --filter @testimona/web dev          # localhost:3000
pnpm --filter @testimona/web typecheck    # tsc --noEmit
pnpm --filter @testimona/web build        # next build
pnpm --filter @testimona/web test:e2e     # Playwright (auto-start dev server)
```

Pour CI / preview env Playwright :

```bash
PLAYWRIGHT_BASE_URL=https://your-deploy-preview.url pnpm --filter @testimona/web test:e2e
```

---

## 🧱 Backlog post-V2 (non-livré)

### Wiring popups → Server Actions

Les 11 popups V2 sont **livrés en composants prêts à monter** mais non wirés dans les sections existantes. Pour activation :

- `TestimonialsSection.tsx` composer click → `MyTestimonialCreateModal` avec preselectedMemorial
- `PhotosSection.tsx` photo click → `ImageGallery`
- `BiographySection.tsx` Edit/Create CTAs → `BiographyEditPopup` / `BiographyChapterCreatePopup`
- `FuneralSection.tsx` Edit/Create CTAs → `FuneralsEditPopup` / `FuneralEventCreatePopup`
- `DonateSection.tsx` admin → `DonationsEditModal` ; "Make a donation" → `MyDonationCreateModal`
- Memorial page admin actions → `MemorialFormPopup` + `MemorialAdminRequestPopup`

Pattern : `'use client'` parent + `useState` open/close + `onSubmit={async (values) => await serverAction(values)}`. Server Actions à créer ou réutiliser celles existantes.

### Drag-and-drop (dnd-kit)

Non installé ni implémenté — V2 spec accepte explicitement le **kebab menu fallback** ("Move up/down/top/bottom") qui est déjà fourni par `KebabMenu` atom. À ajouter pour life chapters et funeral events :

- Server Actions de réorder (UPDATE position int)
- KebabMenu items dans BiographySection et FuneralSection

### Storybook

Non setup — trop lourd. Alternative : créer une page `/design-system` qui preview tous les atomes (TODO).

### Fonts production-grade

- **Debby** est commercial — Caveat Brush utilisé en substitut. Si licence Debby achetée, swap dans `apps/web/src/app/[locale]/layout.tsx:33`.

### PayPal embed

`MyDonationCreateModal` a un flag `useEmbeddedPaypal: boolean`. Quand `true`, affiche un placeholder. Backend implémentation : `@paypal/react-paypal-js` ou iframe PayPal Smart Buttons. Stripe actuel reste fonctionnel par défaut.

---

## 📸 Screenshots & validation visuelle

Référence pixel-perfect : `audit/screenshots/v3/p01.png` à `p52.png` (52 pages PDF V3 rendues à 150 DPI via PyMuPDF).

Pour générer screenshots avant/après automatisés : ajouter `await page.screenshot({ path: '...' })` dans `e2e/smoke.spec.ts` ou utiliser Percy/Chromatic pour visual regression CI.

---

## 🔗 Liens utiles

- Repo : https://github.com/FranckSowax/testimona
- Audit Phase 0 : `AUDIT_TESTIMONA.md`
- PDF V3 spec : `202104_Testimona_branding_ecrans_V3.pdf` (raster, 52 pages)
- Tokens source : `apps/web/src/app/globals.css`
- Atoms barrel : `apps/web/src/components/ui/index.ts`
- Popups barrel : `apps/web/src/components/popups/index.ts`
- Playwright config : `apps/web/playwright.config.ts`
- Smoke tests : `apps/web/e2e/smoke.spec.ts`
