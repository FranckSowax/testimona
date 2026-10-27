-- ============================================================================
-- Lot 1 · PR 1 — retire l'exécution directe des fonctions de trigger du dossier.
--
-- WHY: Postgres accorde EXECUTE à PUBLIC par défaut, donc l'API exposait ces
-- fonctions security definer en RPC (alerte get_advisors 0028/0029). Elles ne
-- servent qu'aux triggers, qui ne vérifient pas EXECUTE au déclenchement :
-- retirer le droit ne change rien à leur fonctionnement.
-- ============================================================================

revoke execute on function public.dossier_add_creator_as_owner() from public, anon, authenticated;
revoke execute on function public.dossier_member_keep_one_owner() from public, anon, authenticated;
revoke execute on function public.dossier_member_set_display_name() from public, anon, authenticated;
-- Même hygiène pour les fonctions de trigger security invoker du lot.
revoke execute on function public.dossier_before_update() from public, anon, authenticated;
revoke execute on function public.person_before_update() from public, anon, authenticated;
revoke execute on function public.journey_answer_before_write() from public, anon, authenticated;
