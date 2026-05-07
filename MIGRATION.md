# Testimona — État de la migration

**Dernière mise à jour** : 2026-05-07
**Branche cible** : `main` sur https://github.com/FranckSowax/testimona

Ce document est le journal de bord de la migration Angular 15 + Express monolithe → Next.js 15 + Express BFF + Supabase + Railway. Il décrit ce qui est **déjà fait**, ce qui est **partiellement fait**, et **les étapes manuelles restantes**.

Référence complète : voir [`testimona-audit (1).html`](./testimona-audit%20%281%29.html) (audit révisé) et [`testimona-migration-plan.md`](./testimona-migration-plan.md) (roadmap 8 phases).

---

## ✅ Fait

### Mono-repo (Phase 1)
- pnpm-workspace.yaml, root `package.json`, `turbo.json`
- `tsconfig.base.json` (strict, noUncheckedIndexedAccess)
- `.prettierrc`, `.editorconfig`, `.nvmrc` (Node 22)
- `.gitignore` enrichi (Next.js, Turbo, Prisma, env, coverage)
- Repo GitHub `FranckSowax/testimona` créé, branche `main` poussée

### `packages/shared` (Zod schemas + types domaine)
- `schemas/auth.ts` : RegisterEmail, LoginInput (discriminatedUnion), Forgot/Reset, SessionUser
- `schemas/memorial.ts` : MemorialCreate/Update/Query, Testimonial, Chapter, Photo
- `schemas/donation.ts` : DonationStatus, CheckoutInput, StripeWebhookEnvelope
- `schemas/common.ts` : enums (AuthenticationMode, UserRole, DisplayName), Pagination, Uuid, Slug
- `types/index.ts` : Result, ApiEnvelope, branded MemorialId/UserId/DonationId

### `packages/database`
- Singleton PrismaClient HMR-safe
- Re-exports types Prisma

### `infra/supabase` (RLS)
- `rls/policies.sql` couvrant User, Memorial, Testimonial, Photo, Biography, Chapter, Donation, Funeral, FuneralEvent
- Helper `is_admin()` lit `app_metadata.role` du JWT
- `README.md` runbook bootstrap + migration data

### `infra/railway`
- `railway.toml` template

### Backend modernisations (locales — voir bloqueur §⚠️1)
- `api/src/services/commons/supabase.service.ts`
- `api/src/middlewares/common/auth.supabase.middleware.ts` (JWKS via `jose`)
- `api/src/middlewares/common/validate.middleware.ts` (Zod générique)
- `api/src/services/auth.migration.service.ts` (lazy migration bcrypt → Supabase)
- `api/src/services/commons/sentry.service.ts`
- 6 `console.log(error)` remplacés par `logger.error` dans `jwt.service.ts`
- `/health` étendu (DB + Redis + Supabase, graceful skipped)
- `api/package.json` enrichi
- `api/.env.example` enrichi

### Frontend Next.js (`apps/web/`)
- Configs : `package.json` (Next 15 / React 19 / TS 5 / Tailwind 4 / Supabase SSR / RHF + Zod / Sentry / Stripe / Playwright / Vitest)
- `tsconfig.json`, `next.config.mjs` (output standalone Railway, headers sécurité), `postcss.config.mjs`, `.env.example`
- `src/lib/env.ts` validation Zod
- `src/lib/supabase/server.ts` + `client.ts`
- `src/middleware.ts` refresh session + auth gates
- `src/app/layout.tsx` + `globals.css` (Tailwind v4 @theme + a11y)
- `src/app/page.tsx`
- `src/app/(auth)/login/{page,actions,LoginForm}.tsx` (Server Action + fallback BFF lazy migration + Google OAuth)
- `src/app/(auth)/signup/{page,actions,SignupForm}.tsx`
- `src/app/auth/callback/route.ts` + `auth/signout/route.ts`
- `src/app/(public)/memorial/[slug]/page.tsx` (RSC + ISR 60s + Open Graph)
- `src/app/(public)/memorial/[slug]/_components/{Testimonials,Photos,Biography,Donate}Section.tsx` + `TestimonialForm` + `DonateForm`
- `src/app/(public)/memorial/[slug]/actions.ts` (submit témoignage)
- `src/app/(public)/search/page.tsx` (S2 — RSC + ILIKE multi-champs + pagination)
- `src/app/(public)/donate/{actions,success/page,cancel/page}.tsx` (Stripe Checkout)
- `src/app/(dashboard)/dashboard/page.tsx` (liste mémoriels owner) + `dashboard/new/{page,actions,NewMemorialForm}.tsx`
- `src/components/{SiteHeader,SiteFooter}.tsx`
- `src/app/api/health/route.ts`
- `src/app/sitemap.ts` + `robots.ts`

### CI/CD
- `.github/workflows/ci.yml` (lint + format + typecheck + build + test)
- `.github/workflows/deploy-staging.yml` (Railway api + web)

---

## ⚠️ Bloqueurs / actions manuelles requises

### 1. ~~Repos git imbriqués~~ — Résolu (2026-05-07)

`api/.git` et `web/.git` ont été déplacés hors de l'arbre de travail vers `/tmp/testimona-legacy-git-archive/{api-dotgit,web-dotgit}` (préservés pour archive ; volatil — copier ailleurs si l'historique doit être gardé). `api/` est devenu `apps/api/` et `web/` est devenu `apps/web-angular-legacy/`. Git voit désormais leur contenu comme des fichiers normaux du mono-repo.

À committer (580 fichiers, `node_modules` exclus) :
```bash
git add apps/ MIGRATION.md
git commit -m "chore: absorb api and web into monorepo + frontend S2-S6"
```

### 2. Variables d'environnement Railway (3 envs)
`DATABASE_URL`, `SUPABASE_URL/ANON_KEY/SERVICE_KEY`, `REDISCLOUD_URL`, `WHITELIST_URL`, `WEBSITE_URL`, `TOKEN_KEY/SUFFIX/EXPIRED`, `PRIVATE_PWD_KEY/SECRET_PWD_KEY/SECRET_ANSWER_KEY` (legacy), `GOOGLE_CLIENT_ID/SECRET`, `STRIPE_SECRET_KEY/WEBHOOK_SECRET`, `CLOUDINARY_*`, `SENTRY_DSN`, `GIT_SHA`.

GitHub Actions : `RAILWAY_TOKEN`, `SENTRY_AUTH_TOKEN`.

### 3. Provisionner Supabase
```bash
# Créer projets dev/staging/prod
DATABASE_URL=<supabase_dev> pnpm --filter @testimona/api prisma migrate deploy
psql <supabase_dev> -f infra/supabase/rls/policies.sql
# Configurer Auth (Email/Password, Google OAuth, redirect URLs)
```

### 4. `pnpm install`
Hydrate node_modules, génère pnpm-lock.yaml, lie workspaces.

### 5. Migration data prod → Supabase
Voir `infra/supabase/README.md`.

### 6. Décommissionner Angular (Phase 8)
Après cutover canary, archiver puis supprimer `apps/web-angular-legacy/`.

---

## Référence rapide

| Sujet | Chemin |
|---|---|
| Plan complet | `testimona-migration-plan.md` |
| Audit révisé | `testimona-audit (1).html` |
| Schémas Zod | `packages/shared/src/schemas/` |
| Prisma client | `packages/database/src/index.ts` |
| RLS policies | `infra/supabase/rls/policies.sql` |
| Bootstrap Supabase | `infra/supabase/README.md` |
| Backend Supabase admin | `apps/api/src/services/commons/supabase.service.ts` (après §1) |
| Backend JWKS auth | `apps/api/src/middlewares/common/auth.supabase.middleware.ts` |
| Backend lazy migration | `apps/api/src/services/auth.migration.service.ts` |
| Frontend Supabase server | `apps/web/src/lib/supabase/server.ts` |
| Frontend middleware auth | `apps/web/src/middleware.ts` |
| Frontend login Server Action | `apps/web/src/app/(auth)/login/actions.ts` |
| Frontend memorial RSC | `apps/web/src/app/(public)/memorial/[slug]/page.tsx` |
| CI | `.github/workflows/ci.yml` |
| Deploy staging | `.github/workflows/deploy-staging.yml` |

---

## Checklist par phase

| Phase | Statut | Notes |
|---|---|---|
| 0. Cadrage | 🟡 Partiel | POC scaffolded ; 8 décisions §1 plan à valider formellement |
| 1. Infrastructure | 🟡 Code prêt | Manque : provisioning réel Supabase + Railway + DNS + Sentry |
| 2. Migration data | 🟡 Scripts prêts | Manque : pg_dump → restore Supabase |
| 3. Migration auth | 🟡 Code prêt | Manque : tester lazy migration e2e |
| 4. BFF refacto | 🟡 Partiel | Code en place, à wirer dans routes existantes après §⚠️1 |
| 5. Bootstrap Next.js | ✅ Done | Configs + middleware + helpers Supabase |
| 6. Réécriture frontend | 🟡 S1-S6 amorcés | Auth + Memorial (RSC, témoignages/photos/biographie/donations) + Search + Dashboard owner ; reste : funerals, admin, gestion détaillée mémorial |
| 7. Tests/CI/CD | 🟡 CI en place | Tests à écrire (cible 70 %) ; Sentry à activer (DSN) ; Better Stack à connecter |
| 8. Cutover | ⬜ À venir | Après validation staging |
