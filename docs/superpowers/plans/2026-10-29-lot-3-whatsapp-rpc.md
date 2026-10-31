# Lot 3 — Suivi PR 3 : fermer la lecture directe de `provider.whatsapp`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un utilisateur connecté ne peut plus lire `provider.whatsapp` par PostgREST. Le numéro ne sort de la base que par la RPC `request_quote`, qui trace la demande de devis et renvoie le numéro en un seul appel. Les administrateurs le lisent par le client service-role, après `isPlatformAdmin()`.

**Architecture:**

- Migration : `revoke select` sur `provider` pour `authenticated`, puis `grant select` de toutes les colonnes sauf `whatsapp` (même méthode que `20261027000100_shop_contribution_hide_personal_columns.sql`).
- RPC `public.request_quote(p_dossier_id, p_provider_id, p_step_id, p_message) returns text`, `security definer`, `search_path = ''` :
  1. rôle coordinateur et plus, sinon `42501` ;
  2. prestataire actif, non exemple, vérifié, avec numéro, verrouillé `for share`, sinon `TL010` ;
  3. insertion dans `quote_request` (le trigger existant revérifie et impose auteur, date, nom) ;
  4. renvoie le numéro.
- Web :
  - `quotes/repo.ts` : `insertQuoteRequest` devient `requestQuoteRpc`, qui appelle la RPC ;
  - `quote-service.ts` : plus de relecture du prestataire après la trace ;
  - `repo.ts` : l'encadré des familles ne sélectionne plus `whatsapp` (type `PanelProvider`) ;
  - `quote-panel.ts` : un prestataire vérifié a toujours un numéro (contrainte `provider_verified_has_number`), la condition sur le numéro disparaît ;
  - lectures admin (liste, fiche) déplacées dans `src/server/privileged/providers.ts` (client service-role) ; insertion et modification restent sur le client utilisateur (RLS `is_admin()`).

**Tech Stack:** Supabase (Postgres, RLS, droits par colonne), PGlite pour les tests SQL, Next.js 15, Vitest.

## Fichiers

| Fichier                                                                                                      | Rôle                                                |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| `supabase/migrations/20261029000200_provider_whatsapp_private.sql` (créé)                                    | Droits par colonne et RPC `request_quote`           |
| `supabase/tests/provider-whatsapp.test.ts` (créé)                                                            | Colonne illisible, RPC, contrôles 42501 puis TL010  |
| `supabase/tests/providers.test.ts` (modifié si besoin)                                                       | Lectures de `whatsapp`                              |
| `packages/shared/src/database.types.ts` (modifié)                                                            | Signature de `request_quote`                        |
| `apps/web/src/server/privileged/providers.ts` (créé)                                                         | Lectures admin avec numéro                          |
| `apps/web/src/modules/providers/repo.ts`, `service.ts`, `schema.ts`, `panel.ts`, `quote-panel.ts` (modifiés) | Encadré sans numéro, admin par le chemin privilégié |
| `apps/web/src/modules/providers/quotes/repo.ts`, `quote-service.ts` (modifiés)                               | Appel de la RPC, sans relecture                     |
| tests web associés (modifiés)                                                                                |                                                     |
| `docs/superpowers/specs/2026-10-28-lot-3-funerailles-design.md` (modifié)                                    | Le suivi devient la règle                           |

## Tâches

- [ ] **1. Migration et tests SQL** — écrire `provider-whatsapp.test.ts` (rouge), puis la migration ; `pnpm --filter @testimona/supabase test` vert.
- [ ] **2. Types partagés** — ajouter `request_quote` dans `Functions`.
- [ ] **3. Demande de devis** — `quotes/repo.ts` + `quote-service.ts` et leurs tests.
- [ ] **4. Encadré et admin** — `PanelProvider`, `server/privileged/providers.ts`, `service.ts` et tests.
- [ ] **5. Spec** — remplacer le paragraphe « suivi prévu » par la règle en place.
- [ ] **6. Vérification** — `pnpm --filter @testimona/web test`, `typecheck`, `lint`, tests SQL ; revue par sous-agent.
- [ ] **7. Production** — **seulement avec l'accord de l'utilisateur.** Le code de `main` sélectionne encore `whatsapp` (encadré et admin) : si la migration passe seule, l'encadré tombe pour toutes les familles (42501). Ordre sûr, au choix :
  - déployer le code puis appliquer la migration aussitôt (entre les deux, seule la demande de devis échoue : la RPC n'existe pas encore) ;
  - ou couper la migration en deux : RPC d'abord, déploiement du code, puis `revoke`/`grant`.
    Écrire cette séquence dans la description de la PR.
