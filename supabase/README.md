# Supabase — schéma, migrations et tests

Source de vérité du schéma Testimona. Remplace l'ancien `infra/supabase/` (fichiers SQL appliqués à
la main) et `packages/database` (Prisma, supprimé).

## Contenu

```
supabase/
  migrations/      # migrations ordonnées : <AAAAMMJJHHMMSS>_<nom>.sql
  tests/           # tests SQL : chaîne de migrations + RLS (PGlite, sans Docker)
  seed.sql         # données de démo (jamais en production)
  seed-avatars.sql
```

| Migration                               | Origine                                                           |
| --------------------------------------- | ----------------------------------------------------------------- |
| `20260501000000_baseline_prisma.sql`    | Tables historiques, générées depuis l'ancien `schema.prisma`      |
| `20260501000100_rls_policies.sql`       | Ancien `infra/supabase/rls/policies.sql`                          |
| `20260501000200_storage_buckets.sql`    | Ancien `infra/supabase/storage/buckets.sql`                       |
| `20260502000001` → `20260502000024`     | Anciennes migrations `migration-v2` → `migration-v24`, même ordre |
| `20261026000100_dossier_foundation.sql` | Lot 0 : dossier familial, rôles, RLS par dossier                  |

Les horodatages des migrations historiques sont **synthétiques** : ils ne servent qu'à fixer l'ordre.

## Tests

```bash
pnpm --filter @testimona/supabase test
```

Chaque fichier de test démarre un Postgres embarqué (PGlite), recrée les objets Supabase dont
dépendent les migrations (rôles `anon` / `authenticated` / `service_role`, `auth.uid()`,
`storage.*`, privilèges par défaut), rejoue toutes les migrations puis vérifie :

- que la chaîne s'applique sans erreur sur une base vierge ;
- que **100 % des tables** du schéma `public` ont la RLS activée ;
- que les visiteurs anonymes ne peuvent pas écrire dans les tables financières ;
- les règles d'accès du dossier familial (lecture, écriture, rôles, dernier propriétaire).

Toute nouvelle table sans RLS fait échouer la CI.

## Raccorder la base de production (à faire une fois)

La production a reçu ces migrations à la main. Avant le premier `supabase db push` :

1. Installer la CLI Supabase et lier le projet : `supabase link --project-ref <ref>`.
2. Comparer la base réelle au repo : `supabase db diff --linked`. Tout écart (colonne ajoutée
   depuis le dashboard, policy modifiée…) doit devenir une migration avant d'aller plus loin.
3. Marquer les migrations historiques comme déjà appliquées, sans les rejouer :
   `supabase migration repair --status applied 20260501000000` (puis chaque horodatage jusqu'à
   `20260502000024`).
4. Appliquer les nouvelles migrations : `supabase db push`.

## Types TypeScript

```bash
SUPABASE_PROJECT_ID=<ref> pnpm --filter @testimona/supabase db:types
```

Génère `packages/shared/src/database.types.ts` (nécessite `supabase login`). À relancer après chaque
migration.

## Configuration Auth (dashboard)

- Email/mot de passe avec confirmation d'e-mail ; Google OAuth optionnel.
- URLs de redirection : `https://<domaine>/auth/callback` et `http://localhost:3000/auth/callback`.
- Modèles d'e-mails (inscription, récupération) en français et anglais.
