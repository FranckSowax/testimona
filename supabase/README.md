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

| Migration                                                    | Origine                                                                                        |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `20260501000000_baseline_prisma.sql`                         | Tables historiques, générées depuis l'ancien `schema.prisma`                                   |
| `20260501000100_rls_policies.sql`                            | Ancien `infra/supabase/rls/policies.sql`                                                       |
| `20260501000200_storage_buckets.sql`                         | Ancien `infra/supabase/storage/buckets.sql`                                                    |
| `20260502000001` → `20260502000024`                          | Anciennes migrations `migration-v2` → `migration-v24`, même ordre                              |
| `20261026000100_dossier_foundation.sql`                      | Lot 0 : dossier familial, rôles, RLS par dossier                                               |
| `20261027000100_shop_contribution_hide_personal_columns.sql` | Contributions boutique : colonnes personnelles masquées à l'API publique                       |
| `20261027000200_dossier_person_answers.sql`                  | Lot 1 : fiche de la personne, réponses du parcours, création atomique, nom affiché des membres |
| `20261027000300_dossier_invitations.sql`                     | Lot 1 : invitations par lien à usage unique                                                    |
| `20261027000400_revoke_trigger_function_execute.sql`         | Lot 1 : fonctions de trigger du dossier non exécutables via l'API                              |
| `20261027000500_ai_usage.sql`                                | Lot 1 : compteur d'appels à l'IA par dossier et par jour                                       |
| `20261027000600_ledger.sql`                                  | Lot 2 : registre des cotisations et des dépenses, visibilité, totaux                           |
| `20261027000700_budget_lines.sql`                            | Lot 2 : postes du budget, scénario retenu, dépenses par poste                                  |
| `20261028000100_receipts.sql`                                | Lot 2 : reçus des dépenses, bucket privé `receipts`                                            |

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

## État de la production (2026-10-28)

Projet Supabase « Testimona app » (`ryfbfpgwuqyfymxcxmny`, eu-west-1). Historique vérifié le
2026-10-28 avec `list_migrations` (MCP Supabase).

**Déjà en production :**

- v2 à v16 ;
- `v24_contribution_privacy`, version enregistrée `20261026234530` ;
- `shop_contribution_hide_personal_columns`, version enregistrée `20261026235537` ;
- `dossier_foundation` (lot 0), version enregistrée `20261027090617` ;
- `dossier_person_answers`, version enregistrée `20261027090645` ;
- `dossier_invitations`, version enregistrée `20261027090710` ;
- `revoke_trigger_function_execute`, version enregistrée `20261027094508` ;
- `ai_usage` (lot 1, PR 4), version enregistrée `20261027151057` ;
- `ledger` (lot 2, PR 2), version enregistrée `20261027190919` ;
- `budget_lines` (lot 2, PR 3), version enregistrée `20261028001104`.

**Pas encore en production :**

- `receipts` (lot 2, PR 4) : à appliquer avant de déployer le web de la PR.

Toutes les migrations du dépôt jusqu'à `budget_lines` sont donc en production. Après `ledger`, vérifié : RLS active sur
`ledger_entry` et `dossier_finance`, aucun droit pour `anon`, `authenticated` limité à
`select`/`insert` sur `ledger_entry` et `select`/`insert`/`update` sur `dossier_finance`, fonctions
de trigger non exécutables, `ledger_totals` exécutable par `authenticated` seulement.

Après `budget_lines`, vérifié : RLS active sur `budget_line` avec ses quatre policies, aucun droit
pour `anon`, `authenticated` limité à `select`/`insert`/`update`/`delete` ; colonnes
`ledger_entry.budget_line_id` (clé étrangère `on delete no action`, aucune ligne existante
rattachée) et `dossier_finance.scenario` ; fonctions de trigger non exécutables ;
`set_budget_scenario` et `ledger_spent_by_line` exécutables par `authenticated` seulement.

`get_advisors` (sécurité), revérifié le 2026-10-28 après `budget_lines` : sur le dossier, seules
`is_dossier_member`, `accept_dossier_invitation`, `consume_ai_quota`, `ledger_totals` et
`set_budget_scenario` sont signalées comme security definer exécutables par `authenticated` (0029),
c'est voulu (appelées par les policies, l'acceptation d'une invitation, le quota d'IA, les totaux du
registre et le choix du scénario, qui vérifient eux-mêmes l'appartenance ou le rôle). `ai_usage` est
signalée « RLS sans policy » (0008, INFO), c'est voulu : aucun accès direct, seule
`consume_ai_quota` y écrit. Les autres alertes sont antérieures au lot 1
(`search_path` non fixé sur `is_admin`, `applyCreditTransaction`, `initUserCredit`,
`applyStudiaTransaction`, `applyShopContribution` ; `initUserCredit` exécutable par `anon` ; tables
`PhotoReport`, `StudiaBalance`, `StudiaTransaction` sans policy ; protection des mots de passe
compromis désactivée dans Supabase Auth).

Les versions enregistrées par `apply_migration` sont des horodatages d'application, **pas** les noms
de fichiers du dépôt (ex. `20261026235537` pour `20261027000100_shop_contribution_hide_personal_columns.sql`,
`20260510104839_v2_popups_schema_additions` pour la v2). Comparer par nom de migration, pas par
version.

Autres constats de la comparaison du schéma (chaîne du repo rejouée dans PGlite) :

- mêmes 26 tables historiques, mêmes policies RLS ;
- v17 à v23 ont été appliquées sans historique ;
- écarts mineurs : `MemorialFavorite.id` a un défaut `gen_random_uuid()` en production, index en double
  `chapter_biography_position_idx` en production, index `MemorialFavorite_userId_createdAt_idx` absent
  de la production.

### À faire avant de déployer le web de la PR « dossier et membres »

Le web de cette PR dépend des tables et fonctions créées par ces migrations.

1. ~~Appliquer, **dans cet ordre** : `20261026000100_dossier_foundation`, puis
   `20261027000200_dossier_person_answers`, puis `20261027000300_dossier_invitations`.~~ Fait le
   2026-10-27.
2. ~~Appliquer `20261027000400_revoke_trigger_function_execute`, puis revérifier `get_advisors`.~~
   Fait le 2026-10-27.
3. Le web peut être déployé (fusion dans `main`).

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
