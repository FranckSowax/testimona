# Lot 0 — Socle sécurisé

Branche : `chore/lot-0-socle-securise` · Démarré le 2026-10-26
Référence : [`parcours-proposition.html`](./parcours-proposition.html), section 9.

## Fait

| Chantier               | Résultat                                                                                                                                                                                                                                                                                                                                             | Vérification                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Migrations versionnées | `supabase/migrations/` : baseline générée depuis l'ancien `schema.prisma`, puis les 26 fichiers SQL historiques dans leur ordre (historique Git conservé)                                                                                                                                                                                            | La chaîne complète s'applique sur une base vierge                                                                        |
| RLS : état réel        | Les 26 tables historiques ont bien la RLS (le diagnostic initial « ~14 tables » était faux, corrigé dans `REPRISE_2026-10-26.md`)                                                                                                                                                                                                                    | `supabase/tests/migrations.test.ts` échoue si une table n'a pas de RLS                                                   |
| RLS par dossier        | Tables `dossier` et `dossier_member`, rôles (propriétaire, coordinateur, trésorier, contributeur, lecteur), fonction `is_dossier_member()`, au moins un propriétaire garanti                                                                                                                                                                         | 14 tests dans `supabase/tests/dossier-rls.test.ts`, test de mutation manuel : une policy affaiblie fait échouer la suite |
| Tests unitaires web    | `vitest.config.mts` (les specs Playwright ne sont plus ramassées) ; tests sur la redirection après connexion (redirection ouverte), l'analyse des liens Google Maps et les droits de gestion d'un mémorial                                                                                                                                           | 32 tests                                                                                                                 |
| CI                     | Étape `test` bloquante (plus de `continue-on-error`) ; inclut les tests SQL                                                                                                                                                                                                                                                                          | `pnpm test` vert en local                                                                                                |
| Nettoyage              | Don simulé supprimé (créait de faux dons « réussis ») ; `packages/database` (Prisma) supprimé ; `docker-compose.yml` et `infra/railway` (ancienne API Express) supprimés ; Cloudinary retiré ; `.env.example` aligné sur les variables réellement utilisées ; lockfile purgé de l'ancien `apps/api`                                                  | Build de production vert                                                                                                 |
| Client service-role    | `import 'server-only'` ajouté : un import depuis un composant client casse désormais le build                                                                                                                                                                                                                                                        | —                                                                                                                        |
| Règles ESLint de garde | `apps/web/eslint.config.mjs` (Next.js + TypeScript) : client service-role interdit hors de `src/server/privileged/`, `.from('Table')` interdit hors des `repo.ts`, 300 lignes max par fichier. Les fichiers existants sont gelés dans `eslint.legacy.mjs` (62, 63 et 11 fichiers) ; liens `<a>` des overlays et de l'admin passés au `Link` localisé | `pnpm lint` : 0 erreur ; un fichier test fautif déclenche bien les deux règles                                           |
| Formatage              | Commit Prettier dédié (`.git-blame-ignore-revs`), `format:check` réactivé en CI                                                                                                                                                                                                                                                                      | `pnpm format:check` vert                                                                                                 |

## Bloqué ou en attente

1. **Types générés** : script prêt (`pnpm --filter @testimona/supabase db:types`), mais il faut
   la CLI Supabase et un accès au projet (`supabase login`).
2. **Comparaison avec la production** : `supabase db diff --linked` puis `migration repair`
   (voir `supabase/README.md`). Tant que ce n'est pas fait, la baseline reste une reconstitution.

## Reporté volontairement

- **Avertissements ESLint** : 14 variables ou imports inutilisés dans du code existant (non bloquant).
- **Higgsfield, solde « Studia »** : ils pilotent encore la génération de clips (choix du
  fournisseur, plafond de dépense). Les retirer change le comportement en production ; à traiter
  avec la décision produit sur les modules IA, derrière un interrupteur.
- **Déploiement staging** : `deploy-staging.yml` déploie à chaque push sur `main` sans attendre la
  CI. À conditionner à la CI (protection de branche ou `workflow_run`).
