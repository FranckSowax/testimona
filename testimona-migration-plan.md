# Testimona — Plan de migration Next.js + Supabase + Railway

**Date** : 2026-05-06
**Référence** : Audit de Production révisé (`testimona-audit (1).html`, score actuel 3.8/10)
**Cible** : Réécriture frontend en **Next.js 15+ App Router** (React 19, TypeScript 5), base de données **Supabase Postgres**, hébergement **Railway** (back + front), achèvement des points d'audit restants.

---

## 0. Synthèse exécutive

Testimona est aujourd'hui dans un état hybride : le backend Express/Prisma a été substantiellement modernisé (Phases 1 & 2 de l'audit quasi complètes — bcrypt, helmet, rate-limit, Express 4.21, Prisma 6, Stripe 17, Docker multi-stage, etc.), mais le frontend Angular 15 reste sur la stack legacy d'origine, sans tests, sans CI/CD, sans APM.

Le présent plan propose **une réécriture intégrale du frontend en Next.js 15 (App Router + React Server Components)**, **une migration de la DB Postgres vers Supabase** (avec activation de Supabase Auth en remplacement du système bcrypt+JWT maison), **un déploiement back+front sur Railway**, et **l'achèvement des items d'audit restants** (tests, CI/CD, observabilité, documentation).

**Stack 100 % open-source MIT** : aucune licence commerciale à acquérir. SEO résolu nativement par SSG/ISR. Bundle React App Router avec code-splitting automatique. Écosystème mature, talent pool large.

**Effort estimé** : **12-16 semaines** (~3-4 mois) avec 2 devs full-stack + 0,5 DevOps + design ponctuel.
**Score audit cible post-migration** : **≥ 8/10** sur tous les axes.

---

## 1. Décisions à valider AVANT kickoff (bloquantes)

| #   | Décision                          | Options                                                                                      | Recommandation                                                                                                                                 |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Topologie API**                 | Garder Express BFF / Tout collapser dans Next.js (Route Handlers + Server Actions) / Hybride | **Hybride** : Express conserve webhooks Stripe + mail + admin ; Next.js prend les forms (Server Actions) et reads publics (RSC + Supabase RLS) |
| 2   | **UI kit**                        | shadcn/ui + Tailwind / MUI / Mantine / Ark UI                                                | **shadcn/ui + Tailwind** (composants copiés, pas de dette npm, a11y Radix sous-jacent)                                                         |
| 3   | **Storage media**                 | Cloudinary (existant) / Supabase Storage / S3                                                | Conserver **Cloudinary 2.5** (transformations à la volée + Next.js `<Image>` loader natif)                                                     |
| 4   | **Cutover data**                  | Freeze + bascule / Double-write                                                              | Freeze 4-8 h sur week-end                                                                                                                      |
| 5   | **Migration users**               | Rehash au prochain login / Import batch                                                      | **Rehash lazy au login** + relance email aux dormants à J+30                                                                                   |
| 6   | **Mono-repo**                     | `git` racine unique / repos séparés                                                          | Mono-repo `pnpm workspace` (`apps/web`, `apps/api`, `infra/`)                                                                                  |
| 7   | **Observabilité**                 | Sentry seul / Sentry + Better Stack / Datadog                                                | **Sentry** (front+back) + **Better Stack** pour logs Winston                                                                                   |
| 8   | **Fenêtre de freeze fonctionnel** | 2 sem. / 4 sem. / aucune                                                                     | 4 sem. minimum pendant Phase 6 (réécriture)                                                                                                    |

Note : la liste passe de 9 à 8 décisions — la licence framework et la stratégie SEO disparaissent (résolues nativement par Next.js).

---

## 2. Architecture cible

### 2.1 Topologie

```
┌──────────────────────────────────────────────────────────────┐
│  Cloudflare (DNS, CDN, WAF — optionnel)                      │
└──────────────────────────┬───────────────────────────────────┘
                           │
        ┌──────────────────┼─────────────────────┐
        │                  │                     │
        ▼                  ▼                     ▼
┌──────────────┐   ┌──────────────┐      ┌──────────────┐
│  Railway     │   │  Railway     │      │  Railway     │
│ testimona-web│   │ testimona-api│      │   Redis      │
│ Next.js 15   │   │ Express BFF  │      │ (cache, RL)  │
│ standalone   │   │ (webhooks,   │      │              │
│              │   │  mail, admin)│      │              │
└──────┬───────┘   └──────┬───────┘      └──────────────┘
       │                  │
       │     Server       │
       │   Actions /      │
       │   RSC fetch      │
       └─────────┬────────┘
                 ▼
     ┌─────────────────────────┐
     │       Supabase          │
     │ ┌─────────────────────┐ │
     │ │ Postgres (DB + RLS) │ │
     │ │ Auth (users + JWT)  │ │
     │ │ Storage (optionnel) │ │
     │ │ Realtime (optionnel │ │
     │ │  pour témoignages   │ │
     │ │  live)              │ │
     │ └─────────────────────┘ │
     └─────────────────────────┘

     [Cloudinary — conservé pour transformations photos]
     [Sentry — front + back via @sentry/nextjs et @sentry/node]
     [Better Stack / Logtail — agrégation logs Winston]
```

### 2.2 Découpage des responsabilités (recommandation hybride)

| Type d'opération                            | Implémentation                                                    | Justification                                     |
| ------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------- |
| Page mémorial publique (read)               | **RSC** dans Next.js, `createServerClient` Supabase, RLS publique | SEO natif (SSG + ISR), zéro JS pour le visiteur   |
| Listing/recherche mémoriaux                 | RSC + Server Actions pour pagination/filtres                      | Bundle minimal, perf optimale                     |
| Login / Signup / OAuth Google               | **Client Components** + `@supabase/ssr`                           | Interaction utilisateur ; auth gérée par Supabase |
| Soumission témoignage / photo               | **Server Action** Next.js                                         | Form-friendly, pas de client JS pour submit       |
| Initiation donation Stripe Checkout         | **Route Handler** Next.js → renvoie session_url                   | Léger, Next.js suffit                             |
| **Webhook Stripe**                          | **Express BFF** (idempotence, retries, signature verify)          | Critique : préserver l'infra existante            |
| Envoi emails (signup, reset, notifications) | **Express BFF** (nodemailer + templates)                          | Logique déjà en place                             |
| Admin batch ops (reports, exports)          | **Express BFF**                                                   | Plus simple à containeriser pour jobs longs       |
| Background jobs / cron                      | **Railway cron service** ou job léger BFF                         | Pas de cron natif Next.js                         |

**Rationale du choix hybride** : la Phase 4 d'audit a déjà solidifié le BFF Express. Le re-implémenter en Route Handlers serait du churn pour aucun gain. À l'inverse, les Server Actions sont idéales pour les forms et les RSC permettent de servir les pages publiques sans JS — c'est là que Next.js brille. On garde le meilleur des deux.

### 2.3 Stack détaillée

| Couche              | Choix                                                                      | Statut                          |
| ------------------- | -------------------------------------------------------------------------- | ------------------------------- |
| Frontend SPA/SSG    | **Next.js 15+** (App Router, Turbopack)                                    | À installer                     |
| Lang                | **TypeScript 5.x** (strict mode)                                           | À installer                     |
| UI runtime          | **React 19**                                                               | À installer                     |
| UI components       | **shadcn/ui** + **Tailwind CSS 4** + **Radix UI**                          | À installer                     |
| Forms               | **React Hook Form** + **Zod** validation                                   | À installer                     |
| State client        | Server Components par défaut + **Zustand** ou **TanStack Query** si besoin | À installer                     |
| HTTP/Data           | RSC `fetch` (cache native) + **Server Actions** + Route Handlers           | Natif                           |
| Auth client/serveur | **`@supabase/ssr`** (cookie-based, App Router)                             | À ajouter                       |
| i18n                | **next-intl**                                                              | À installer                     |
| Tests front         | **Vitest** + **Testing Library** + **MSW**                                 | À installer                     |
| E2E                 | **Playwright**                                                             | À configurer                    |
| Backend             | Express 4.21 + Node 22                                                     | OK En place                     |
| ORM                 | Prisma 6 sur Postgres Supabase                                             | OK (DSN à pointer)              |
| Auth backend        | Vérif JWT Supabase via JWKS (`jose`)                                       | À implémenter                   |
| DB                  | **Supabase Postgres**                                                      | À provisionner                  |
| Cache               | Redis Railway                                                              | OK En place                     |
| Storage media       | **Cloudinary 2.5** (loader Next.js Image natif)                            | OK En place                     |
| Logs                | Winston → **Better Stack**                                                 | Backend OK, transport à ajouter |
| APM                 | **Sentry** (`@sentry/nextjs` + `@sentry/node`)                             | À ajouter                       |
| CI/CD               | **GitHub Actions**                                                         | À écrire                        |
| Hosting             | **Railway** (web + api + redis)                                            | À configurer                    |
| Payments            | Stripe 17 (existant)                                                       | OK En place                     |

---

## 3. Pourquoi Next.js (vs autres options envisageables)

| Critère             | Next.js 15                  | Remix     | SvelteKit | Nuxt 3 |
| ------------------- | --------------------------- | --------- | --------- | ------ |
| Écosystème React    | ✅ #1                       | ✅        | ❌        | ❌     |
| App Router + RSC    | ✅ Natif                    | Loaders   | —         | —      |
| SSG / ISR / SSR mix | ✅                          | SSR-first | ✅        | ✅     |
| Talent pool         | ✅ Énorme                   | Moyen     | Petit     | Moyen  |
| Stabilité Railway   | ✅ (`output: standalone`)   | ✅        | ✅        | ✅     |
| Supabase support    | ✅ `@supabase/ssr` officiel | OK        | OK        | OK     |
| Sentry support      | ✅ wizard officiel          | OK        | OK        | OK     |

**Verdict** : Next.js 15 + App Router donne l'équilibre maximal pour un produit B2C avec pages SEO + dashboard authentifié. Pas de tradeoff majeur. Stack 100 % MIT, aucune licence commerciale.

---

## 4. Roadmap phasée

### Phase 0 — Cadrage (1 sem.)

- Validation des 8 décisions §1
- POC court (3-5 jours) : `create-next-app`, page mémorial publique en RSC qui lit Supabase + auth login fonctionnelle
- Provisioning préliminaire Supabase + Railway envs `dev`
- **Livrable** : note de cadrage + repo bootstrappé

(Phase de POC bloquante supprimée — la stack Next.js est éprouvée, pas besoin de Go/No-Go formel comme pour Ext JS.)

---

### Phase 1 — Infrastructure cible (2 sem.)

- Création projet Supabase (3 envs : dev/staging/prod), région eu-central-1
- Activer extensions Postgres : `uuid-ossp`, `pgcrypto`, `citext`
- Création services Railway (3 envs)
  - `testimona-web` (Next.js standalone, Node 22)
  - `testimona-api` (Express, Node 22)
  - `redis`
- Secrets via Railway shared variables groups (ou Doppler)
- DNS : `app.testimona.com` (web), `api.testimona.com` (BFF)
- Sentry + Better Stack projects créés
- Mono-repo `pnpm workspace` :
  ```
  testimona/
    apps/
      web/                 # Next.js
      api/                 # Express BFF
    packages/
      database/            # Prisma client + types partagés
      shared/              # Types domaine, validators Zod
    infra/
      supabase/
        migrations/
        seed.sql
        rls/policies.sql
      railway/
        railway.toml
    .github/workflows/
    pnpm-workspace.yaml
    turbo.json
  ```
- Husky + lint-staged + Conventional Commits
- Cleanup `.DS_Store`, `.gitignore` racine propre

**Livrable** : 3 environnements opérationnels, monitorés, README racine.

---

### Phase 2 — Migration data Postgres → Supabase (2-3 sem.)

#### 2.1 Reproduction du schéma

```bash
cd apps/api
DATABASE_URL=$SUPABASE_DEV_DB pnpm prisma migrate deploy
```

#### 2.2 Dump et restore data prod

- `pg_dump --no-owner --no-acl --data-only` source → `pg_restore` Supabase
- Cutover : freeze 4-8 h le week-end

#### 2.3 Activation RLS (`infra/supabase/rls/policies.sql`)

- `memorial` : SELECT public si `is_public = true`, UPDATE/DELETE si `auth.uid() = owner_id`
- `testimonial` : SELECT public, INSERT auth, UPDATE/DELETE si auteur
- `photo` : idem
- `donation` : SELECT/INSERT/UPDATE auth (donor) ou service_role (BFF)
- `user` : SELECT self, UPDATE self
- Clé `service_role` réservée au BFF Express
- Clé `anon` pour read-only public RSC Next.js

#### 2.4 Tests d'intégrité

- Comptage par table avant/après
- Smoke tests CRUD via API + RSC depuis Next.js dev

**Livrable** : Supabase dev rempli, RLS active, scripts data documentés et rejouables.

---

### Phase 3 — Migration Auth (3 sem., parallèle à Phase 2)

#### 3.1 Activation Supabase Auth

- Email/Password
- Google OAuth (réutiliser `GOOGLE_CLIENT_ID` existant)
- Templates email custom (signup, password reset, magic link)
- Redirect URLs : `https://app.testimona.com/auth/callback`

#### 3.2 Lazy migration des utilisateurs existants

Backend Express conserve l'endpoint `/api/v1/auth/login` pendant la transition :

```ts
async login(email, password) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Unauthorized();
  if (user.migratedAt) throw new RedirectToSupabase();

  if (!await crypto.verifyPassword(password, user.passwordHash)) throw new Unauthorized();
  // verifyPassword gère bcrypt + isLegacyPassword AES legacy

  await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { legacy_id: user.id },
  });
  await prisma.user.update({ where: { id: user.id }, data: { migratedAt: new Date() } });
  return supabaseAdmin.auth.signInWithPassword({ email, password });
}
```

À J+30 : batch import des dormants via `supabase.auth.admin.createUser` avec `password_hash` (bcrypt direct, supporté Supabase).
À J+90 : suppression colonne `passwordHash` legacy.

#### 3.3 Setup `@supabase/ssr` côté Next.js

`apps/web/middleware.ts` :

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n) => req.cookies.get(n)?.value,
        set: (n, v, o) => res.cookies.set({ name: n, value: v, ...o }),
        remove: (n, o) => res.cookies.set({ name: n, value: '', ...o }),
      },
    },
  );
  await supabase.auth.getUser(); // refresh token automatique
  return res;
}
```

Helpers `lib/supabase/{server,client}.ts` pour RSC, Server Actions et Client Components.

#### 3.4 Backend Express : valider JWT Supabase

```ts
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(new URL(`${process.env.SUPABASE_URL}/auth/v1/keys`));

export async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `${process.env.SUPABASE_URL}/auth/v1`,
  });
  req.user = { id: payload.sub, email: payload.email, role: payload.role };
  next();
}
```

#### 3.5 Cleanup post-migration

- Suppression `JwtService`, `crypto.service.ts` réduit à `decryptAnswer` (questions sécurité conservées)
- Suppression constantes `TokenKey`, `RegisterToken`, `RefreshToken`
- `RedisService` allégé (Supabase gère refresh)
- Mise à jour `.env.example`

**Livrable** : Auth Supabase actif en dev, lazy migration prouvée, plan cutover users écrit.

---

### Phase 4 — Refacto API en BFF léger (2 sem., parallèle à Phase 3)

- `DATABASE_URL` pointe sur Supabase (pooler `:6543`)
- Client Supabase admin :
  ```ts
  // apps/api/src/services/commons/supabase.service.ts
  export const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } },
  );
  ```
- Sentry SDK (`@sentry/node`)
- Endpoints recentrés : `/api/v2/webhooks/stripe`, `/api/v2/admin/*`, `/api/v2/mail/*`, `/api/v2/cron/*`
- Achèvement audit restant :
  - **DI léger** (tsyringe ou awilix) → remplace les `getInstance()` manuels
  - **Validation Zod** (au lieu de Joi, pour partager les schémas avec Next.js via `packages/shared`)
  - **Types Prisma** → élimination des `Promise<any>`
  - **Winston** → suppression des 6 `console.log` résiduels dans `jwt.service.ts` (devenu obsolète après Phase 3)
  - **Helmet CSP** custom : whitelister Cloudinary, Stripe, Supabase, Sentry, Vercel preview origins
  - **CSRF** : double-submit cookie pour les endpoints mutables non-Bearer

**Livrable** : BFF stable, smoke tests OK, latence mesurée vs anciens endpoints.

---

### Phase 5 — Bootstrap Next.js (3-4 j)

- `pnpm create next-app@latest apps/web --typescript --tailwind --app --turbo --src-dir --import-alias "@/*"`
- Configuration `output: 'standalone'` (compatible Railway)
- Installation : `@supabase/ssr`, `@supabase/supabase-js`, `next-intl`, `react-hook-form`, `zod`, `@sentry/nextjs`, `lucide-react`
- Setup shadcn/ui : `pnpm dlx shadcn@latest init` + composants de base (Button, Input, Card, Dialog, Toast, Form)
- Structure `apps/web/src/app/` :
  ```
  src/
    app/
      (public)/
        page.tsx                  # accueil
        memorial/[slug]/page.tsx  # SSG + ISR
        search/page.tsx
      (auth)/
        login/page.tsx
        signup/page.tsx
        forgot-password/page.tsx
        callback/route.ts         # OAuth Supabase
      (admin)/
        layout.tsx                # auth guard
        dashboard/page.tsx
        memorials/page.tsx
        donations/page.tsx
        users/page.tsx
      (dashboard)/
        layout.tsx                # auth guard user
        my-memorials/page.tsx
        profile/page.tsx
      api/
        donate/checkout/route.ts  # Stripe Checkout init
        memorial/[id]/route.ts    # CRUD léger
      sitemap.ts
      robots.ts
      layout.tsx
      not-found.tsx
    components/
      ui/                         # shadcn
      memorial/
      auth/
    lib/
      supabase/
        server.ts
        client.ts
        middleware.ts
      stripe.ts
      cloudinary.ts
    middleware.ts                 # auth refresh
    i18n/
      messages/{fr,en}.json
  ```
- ESLint + Prettier + Tailwind class sorting
- `next.config.mjs` : Sentry wizard, image domains Cloudinary
- Layout racine avec `<html lang>` dynamique pour i18n
- A11y : focus management, skip links, `prefers-reduced-motion`

**Livrable** : `pnpm dev` opérationnel, page d'accueil + login Supabase + 1 mémorial RSC.

---

### Phase 6 — Réécriture frontend par domaine (8-12 sem.)

Ordre : auth → public → user → admin.

| Sprint | Domaine                  | Pages                                                           | Approche                                           | Effort   |
| ------ | ------------------------ | --------------------------------------------------------------- | -------------------------------------------------- | -------- |
| S1     | Auth                     | Login, Signup, Forgot, Callback OAuth, Email verify             | Client Components + Server Actions                 | 1-2 sem. |
| S2     | Public — Listing         | Accueil, recherche, filtres                                     | RSC + Server Actions pagination                    | 1-2 sem. |
| S3     | Public — Mémorial (read) | Page mémorial : header, photos gallery, témoignages, biographie | **RSC + SSG/ISR** (revalidate 60s)                 | 2-3 sem. |
| S4     | Donations                | Stripe Checkout (redirect)                                      | Route Handler `/api/donate/checkout` + webhook BFF | 1 sem.   |
| S5     | Biographie & Chapters    | Vue + édition WYSIWYG (Tiptap)                                  | Server Actions pour save                           | 1-2 sem. |
| S6     | Funérailles              | Events, RSVP, géoloc map (mapbox-gl ou maplibre)                | Server Components + Client island map              | 1 sem.   |
| S7     | Espace user              | Profil, mes mémoriaux, mes donations, paramètres                | Server Components                                  | 1 sem.   |
| S8     | Admin global             | Dashboard mémoriaux, donations, users, logs, exports            | RSC + tables paginées                              | 1-2 sem. |

**Conventions** :

- Server Components par défaut, `"use client"` uniquement quand nécessaire
- 1 Server Action par mutation, validation Zod systématique
- `loading.tsx` et `error.tsx` à chaque segment de route
- `generateMetadata` pour Open Graph / Twitter cards
- `generateStaticParams` pour pages mémoriaux connus + ISR pour le reste
- A11y : axe-core en CI sur toutes les pages
- i18n FR/EN via `next-intl`, lazy-loadé par locale

**Livrable** : application Next.js complète, isofonctionnelle à l'app Angular, indexable Google.

---

### Phase 7 — Tests, observabilité, CI/CD (3-5 sem., parallèle à Phase 6)

#### 7.1 Tests backend

- Vitest + Supertest sur Express
- Cibles : `auth.service`, `memorial.service`, `donation.service`, middlewares, webhooks Stripe
- **Objectif 70 %** couverture

#### 7.2 Tests frontend

- Vitest + Testing Library + MSW
- Cibles : composants Client, Server Actions (via API extraction), helpers
- **Objectif 70 %** couverture

#### 7.3 E2E Playwright

- Scénarios :
  1. Signup email + confirm + login
  2. OAuth Google end-to-end
  3. Création mémorial → upload photo Cloudinary → ajout témoignage public
  4. Donation Stripe (mode test)
  5. Reset password
- Headless en CI, headed en local
- Artefacts : screenshots, traces, vidéos
- Page Object Model

#### 7.4 Sentry

- `@sentry/nextjs` wizard sur web (RSC + Client + Server Actions)
- `@sentry/node` sur api Express
- Source maps uploadées par tag commit SHA
- Tags : env, version

#### 7.5 Logs centralisés

- Winston transport vers Better Stack (api)
- `console.log` Next.js piped via Railway logs → Better Stack drain
- Retention 30j prod, 7j staging

#### 7.6 GitHub Actions

```
.github/workflows/
  ci.yml              # PR : lint + typecheck + test + build (api + web)
  deploy-staging.yml  # push main → Railway staging (api + web)
  deploy-prod.yml     # tag v* → Railway prod
  e2e.yml             # nightly Playwright sur staging
  lighthouse.yml      # PR check perf web (mobile)
```

Secrets : `RAILWAY_TOKEN`, `SENTRY_AUTH_TOKEN`, `SUPABASE_*`, `STRIPE_*`.

#### 7.7 Health endpoints

- `apps/api/src/app.ts` :
  ```ts
  app.get('/health', async (_req, res) => {
    const checks = await Promise.all([
      prisma.$queryRaw`SELECT 1`.then(() => 'ok').catch(() => 'down'),
      redis
        .ping()
        .then(() => 'ok')
        .catch(() => 'down'),
      supabaseAdmin.auth.admin
        .listUsers({ perPage: 1 })
        .then(() => 'ok')
        .catch(() => 'down'),
    ]);
    const [db, cache, auth] = checks;
    const allOk = checks.every((c) => c === 'ok');
    res.status(allOk ? 200 : 503).json({ db, cache, auth, version: process.env.GIT_SHA });
  });
  ```
- Next.js `/api/health` similaire (DB + Supabase Auth).

#### 7.8 Documentation

- `README.md` racine : quickstart `pnpm install && docker compose up`
- `ARCHITECTURE.md` : topologie + flux auth + flux donation
- `CONTRIBUTING.md` : workflow Git, conventional commits
- `CHANGELOG.md` via `release-please`
- `docs/runbook.md` : DB down, Stripe webhook fail, Supabase outage, etc.

**Livrable** : pipeline CI verte, prod monitorée, doc complète.

---

### Phase 8 — Cutover & décommissionnement Angular (1 sem.)

- Bascule DNS canary : 10 % → 50 % → 100 % sur 1 sem. (Cloudflare load balancer)
- Surveillance Sentry : aucun spike d'erreurs
- Suppression Angular `apps/web-angular-legacy/` → archive Git tag puis suppression à J+30
- Suppression flags migration auth backend (colonne `passwordHash` purgée à J+90)
- Post-mortem & retro

---

## 5. Mapping audit → plan

| Item audit                           | Statut audit       | Traité en                                                      |
| ------------------------------------ | ------------------ | -------------------------------------------------------------- |
| Angular 15→19                        | À traiter          | **Annulé : remplacé par Next.js 15 (Phase 5-6)**               |
| RxJS 6→7, Zone.js, TS 4.9→5.7        | À traiter          | Annulé (réécriture totale)                                     |
| TSLint→ESLint frontend               | Partiel            | Phase 5 (ESLint via create-next-app)                           |
| Protractor→Playwright                | À traiter          | Phase 7.3                                                      |
| `toPromise()` partout                | À traiter          | Annulé                                                         |
| `HttpSharedService`                  | À traiter          | Annulé (RSC `fetch` natif + Server Actions)                    |
| NgModules→standalone                 | À traiter          | Annulé                                                         |
| Datastore custom (43 services)       | À traiter          | Annulé (RSC + Zustand léger)                                   |
| `environment.prod.ts` URL hardcodées | Partiel            | Phase 5 (env vars `.env.local`/`.env.production`)              |
| Service worker / SSR / SSG           | À traiter          | **Phase 5 — natif Next.js App Router**                         |
| JWT clés séparées                    | À traiter          | Phase 3 (Supabase Auth → sans objet)                           |
| `console.log` jwt.service.ts         | Partiel            | Phase 3-4 (suppression complète post-Auth)                     |
| CORS whitelist fragile               | À traiter          | Phase 4 (validation stricte + tests)                           |
| CSRF                                 | À traiter          | Phase 4 (double-submit + SameSite strict)                      |
| CSP custom                           | Partiel            | Phase 4 (helmet CSP avec domaines explicites)                  |
| Timeouts HTTP frontend               | À traiter          | Phase 5 (RSC `fetch` avec `next.revalidate` + AbortController) |
| Singletons backend manuels           | À traiter          | Phase 4 (DI tsyringe/awilix)                                   |
| `Promise<any>` / `any` types         | À traiter          | Phase 4 (types Prisma + Zod inférés)                           |
| `executeQueries<T>` wrapping         | À vérifier         | Phase 4 (audit ciblé + suppression)                            |
| Tests backend (zéro)                 | À traiter          | Phase 7.1 (objectif 70 %)                                      |
| Tests frontend (zéro)                | À traiter          | Phase 7.2 (objectif 70 %)                                      |
| Pas de CI/CD                         | À traiter          | Phase 7.6                                                      |
| Pas d'APM                            | Partiel            | Phase 7.4 (Sentry)                                             |
| Pas de gestion secrets               | À traiter          | Phase 1 (Railway shared variables / Doppler)                   |
| `move-files.js` post-build           | À traiter          | Phase 5 (sans objet — Next.js standalone build)                |
| Repos git séparés                    | À traiter          | Phase 1 (mono-repo pnpm)                                       |
| `.DS_Store` versionnés               | À traiter          | Phase 1                                                        |
| READMEs minimaux                     | À traiter          | Phase 7.8                                                      |
| A11y / WCAG                          | Hors audit initial | Phase 6 (axe-core en CI)                                       |
| SEO mémoriaux publics                | Hors audit         | **Phase 5-6 — résolu par RSC + SSG/ISR + sitemap dynamique**   |

---

## 6. Critères de succès

| Axe           | Cible                                                       |
| ------------- | ----------------------------------------------------------- |
| Score Global  | ≥ 8/10                                                      |
| Sécurité      | ≥ 8/10 (Supabase Auth + RLS + helmet + CSRF + CSP)          |
| Tests         | ≥ 8/10 (70 % API + 70 % web)                                |
| Performance   | ≥ 8/10 (Lighthouse mobile ≥ 85, LCP < 2.5s, CLS < 0.1)      |
| Observabilité | ≥ 8/10 (Sentry + Better Stack + /health étendu)             |
| CI/CD         | ≥ 8/10 (GH Actions + canary deploy)                         |
| Documentation | ≥ 8/10 (README, ARCHITECTURE, CONTRIBUTING, runbook)        |
| Qualité Code  | ≥ 8/10 (DI, types stricts, ESLint actif, Zod)               |
| **SEO**       | **≥ 9/10** (SSG mémoriaux, sitemap, OG, robots, schema.org) |

**Critères opérationnels** :

- Migration data zero-loss (counts vérifiés sur 5 tables critiques)
- 100 % users migrés vers Supabase Auth à J+90
- RLS active sur 100 % tables exposées
- Lighthouse mobile ≥ 85 perf, ≥ 95 a11y, ≥ 100 SEO sur mémorial public
- Pipeline CI verte, deploy auto staging
- Sentry instrumenté, alertes Slack
- Aucun secret en clair dans le code
- Dépôt Angular archivé puis supprimé à J+30 post-cutover

---

## 7. Estimation effort & jalons

| Phase                         | Durée      | Parallélisable avec |
| ----------------------------- | ---------- | ------------------- |
| Phase 0 — Cadrage             | 1 sem.     | —                   |
| Phase 1 — Infrastructure      | 2 sem.     | —                   |
| Phase 2 — Migration data      | 2-3 sem.   | Phase 3             |
| Phase 3 — Migration auth      | 3 sem.     | Phase 2, 4          |
| Phase 4 — Refacto API en BFF  | 2 sem.     | Phase 3             |
| Phase 5 — Bootstrap Next.js   | 0,5-1 sem. | —                   |
| Phase 6 — Réécriture frontend | 8-12 sem.  | Phase 7             |
| Phase 7 — Tests/CI/CD/APM     | 3-5 sem.   | Phase 6             |
| Phase 8 — Cutover             | 1 sem.     | —                   |

**Chemin critique** : Phase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 8 = **~16 sem. séquentiel**, **~12-14 sem. avec parallélisation maximale**.

**Équipe minimale** :

- 1 lead full-stack (toutes phases)
- 1 dev frontend React/Next.js (Phase 5-8)
- 0,5 DevOps (Phase 1, 7, 8)
- 0,3 designer (Phase 5-6)
- 0,2 product owner (validation phases)

---

## 8. Plan de rollback

| Phase          | Rollback                                                                        |
| -------------- | ------------------------------------------------------------------------------- |
| 2 — Data       | Repointer `DATABASE_URL` vers ancien Postgres ; restore `pg_dump` pré-migration |
| 3 — Auth       | Feature flag `AUTH_PROVIDER=legacy` réactive bcrypt + JWT custom                |
| 4 — BFF        | Tag git pré-refacto ; redéploiement Railway en 1 commande                       |
| 5 — Next.js    | Aucun impact prod (bootstrap isolé)                                             |
| 6 — Réécriture | Coexistence Angular + Next.js via DNS routing ; bascule progressive             |
| 8 — Cutover    | DNS revient à 100 % Angular en < 5 min via Cloudflare                           |

DB ancienne et environnements Angular conservés **30 jours** post-cutover avant suppression définitive.

---

## 9. Hors scope (pour cette migration)

- Refonte UX/UI majeure (réutiliser le design existant, l'adapter à Tailwind/shadcn)
- i18n au-delà de FR/EN
- PWA / offline (sauf si demandé par produit)
- Migration vers GraphQL
- Microservices (rester monolithe Express léger en BFF)
- Mobile natif (l'app reste responsive web)
- Recherche full-text avancée (Algolia / Meilisearch) — peut venir en backlog post-launch via Supabase pgtrgm + tsvector

Ces items pourront être proposés en **Phase 9 — backlog post-launch**.

---

## 10. Prochaines étapes immédiates

1. **Aujourd'hui** : valider les 8 décisions bloquantes du §1 avec sponsor et CTO
2. **Cette semaine** : POC Next.js (3-5 j) — `create-next-app` + 1 page mémorial RSC + login Supabase
3. **Semaine prochaine** : kickoff Phase 1 (infrastructure)
4. **Semaine 4** : Phase 2 (data) + Phase 3 (auth) en parallèle
5. **Semaine 7** : début Phase 5-6 (réécriture frontend)
6. **Semaine 14-16** : cutover prod

---

## 11. Annexe — pourquoi ce plan diffère d'une migration "Angular → Angular 19"

L'audit recommandait à l'origine `Angular 15 → 19`. Choisir Next.js plutôt :

| Critère              | Angular 19                                                   | Next.js 15                               |
| -------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| Effort migration     | Migration incrémentale 15→16→17→18→19 + standalone + signals | Réécriture, mais routes RSC plus simples |
| SEO public           | Angular Universal (SSR), config lourde                       | App Router SSG/ISR natif                 |
| Bundle initial       | ~250-400 KB                                                  | ~80-150 KB (RSC stream)                  |
| Talent pool          | Bon (decline)                                                | Excellent (croissance)                   |
| Stabilité long-terme | LTS 18 mois                                                  | LTS Next.js 24 mois + écosystème React   |
| Coût licence         | 0                                                            | 0                                        |
| Compat Supabase      | OK                                                           | **Officiel** `@supabase/ssr`             |
| Compat Railway       | OK                                                           | OK (`output: 'standalone'`)              |

Migration Angular 15→19 = ~6-8 sem. + mêmes pages legacy reconduites. Réécriture Next.js = ~12-16 sem. **mais** code source moitié moins volumineux, perf et SEO supérieurs, dette future réduite. Au vu de la dette frontend (43 services datastore, NgModules, RxJS 6, Protractor abandonné), le coût marginal de la réécriture est justifié.

---

_Document généré le 2026-05-06, basé sur l'audit révisé `testimona-audit (1).html`.
À versionner dans le repo une fois validé._
