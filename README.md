# Testimona

Plateforme de gestion de pages mémorielles : mémoriaux, témoignages, biographies, funérailles, photos, donations Stripe.

> **État du projet (mai 2026)** — chantier de modernisation en cours.
> Voir [`testimona-audit (1).html`](./testimona-audit%20%281%29.html) pour l'audit révisé et
> [`testimona-migration-plan.md`](./testimona-migration-plan.md) pour la feuille de route Next.js + Supabase + Railway.

---

## Stack cible

| Couche | Choix |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript 5, Tailwind, shadcn/ui |
| Backend (BFF) | Express 4.21, Node 22, Prisma 6 |
| DB / Auth | Supabase (Postgres + Auth + RLS) |
| Cache | Redis |
| Storage media | Cloudinary 2.5 |
| Hosting | Railway (web + api + redis) |
| CI/CD | GitHub Actions |
| Observabilité | Sentry + Better Stack (logs Winston) |

## Structure repo cible (mono-repo `pnpm` workspace)

```
testimona/
  apps/
    web/                  # Next.js
    api/                  # Express BFF
    web-angular-legacy/   # ancien frontend Angular 15 (archive post-cutover)
  packages/
    shared/               # Zod schemas, types domaine
    database/             # Prisma client wrapper
  infra/
    supabase/             # migrations + RLS policies
    railway/              # railway.toml
  .github/workflows/      # ci, deploy
  docs/                   # ARCHITECTURE, runbook
```

## Démarrage rapide (à venir)

```bash
pnpm install
docker compose up -d        # postgres + redis local
pnpm --filter api prisma migrate dev
pnpm dev                    # api + web en parallèle (turbo)
```

## Documentation

- [Audit de production](./testimona-audit%20%281%29.html)
- [Plan de migration](./testimona-migration-plan.md)
- `MIGRATION.md` (à venir) — état d'avancement et étapes manuelles restantes

## Licence

Propriétaire — © Testimona.
