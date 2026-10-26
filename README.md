# Testimona

Plateforme de pages mémorielles : témoignages, biographies, photos, donations Stripe.

## Stack

| Couche              | Choix                                                        |
| ------------------- | ------------------------------------------------------------ |
| Frontend            | Next.js 15 (App Router), React 19, TypeScript 5, Tailwind v4 |
| Backend             | Server Actions Next.js (pas de BFF séparé)                   |
| DB / Auth / Storage | Supabase (Postgres + Auth + RLS + Storage)                   |
| Paiements           | Stripe Checkout + webhooks                                   |
| Hosting             | Railway                                                      |
| CI/CD               | GitHub Actions                                               |

## Structure

```
testimona/
  apps/web/              # Next.js (frontend + Server Actions)
  packages/
    shared/              # Zod schemas, types domaine
  supabase/              # migrations versionnées + tests SQL/RLS (PGlite)
  docs/                  # analyse de reprise, proposition parcours, notes de lot
  .github/workflows/     # ci, deploy-staging
```

## Démarrage local

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # à remplir avec un projet Supabase
pnpm --filter @testimona/web dev               # http://localhost:3000
```

Variables minimales dans `apps/web/.env.local` :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL` (`http://localhost:3000` en dev)
- `STRIPE_SECRET_KEY` (optionnel, sinon le flow donations renvoie « indisponible »)

## Provisioning Supabase

Schéma, migrations versionnées et tests RLS : voir [`supabase/README.md`](./supabase/README.md).

```bash
pnpm --filter @testimona/supabase test   # rejoue les migrations et vérifie la RLS (sans Docker)
```

## Routes principales

| Route                                 | Description                                                                 |
| ------------------------------------- | --------------------------------------------------------------------------- |
| `/`                                   | Accueil                                                                     |
| `/search?q=...`                       | Recherche par nom/prénom/surnom                                             |
| `/memorial/[slug]`                    | Page mémorielle (RSC + ISR) avec biographie, photos, témoignages, donations |
| `/login`, `/signup`, `/auth/callback` | Auth Supabase (email/password + Google OAuth)                               |
| `/dashboard`, `/dashboard/new`        | Espace propriétaire — liste et création de mémoriels                        |
| `/donate/{success,cancel}`            | Retour Stripe Checkout                                                      |
| `/api/health`                         | Healthcheck (process + Supabase)                                            |

## Licence

Propriétaire — © Testimona.
