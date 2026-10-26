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

## État de la production (2026-10-27)

Projet Supabase « Testimona app » (`ryfbfpgwuqyfymxcxmny`, eu-west-1). Comparaison faite avec le MCP
Supabase, en rejouant la chaîne du repo dans PGlite :

- mêmes 26 tables, mêmes policies RLS ;
- la v24 (`isAnonymous`, `wantsItem`) manquait : appliquée le 2026-10-27, enregistrée sous la version
  `20261026234530` ;
- l'historique de production ne contient que v2 à v16 et v24, sous des versions différentes du repo
  (ex. `20260510104839_v2_popups_schema_additions`) ; v17 à v23 y ont été appliquées sans historique ;
- écarts mineurs : `MemorialFavorite.id` a un défaut `gen_random_uuid()` en production, index en double
  `chapter_biography_position_idx` en production, index `MemorialFavorite_userId_createdAt_idx` absent
  de la production.

Avant le premier `supabase db push`, marquer les versions de production comme `reverted` et celles du
repo (`20260501000000` → `20260502000024`) comme `applied` avec `supabase migration repair`.

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
