-- ============================================================================
-- Lot 1 · PR 4 — compteur d'appels à l'IA, par dossier et par jour (UTC).
--
-- Aucun accès direct pour anon ni authenticated : seule consume_ai_quota()
-- (security definer) lit et écrit la table.
--
-- WHY (choix assumés) :
--  - le quota est partagé par dossier : un contributeur peut épuiser celui des
--    autres, c'est voulu (les contributeurs sont des membres invités) ;
--  - un appel consommé n'est pas rendu si l'IA échoue ensuite : c'est un
--    plafond anti-abus, pas une facturation ;
--  - la fonction exige le JWT de l'utilisateur (client utilisateur, jamais
--    service_role : auth.uid() serait nul) ;
--  - l'upsert ON CONFLICT ... WHERE est sûr sous concurrence : en READ COMMITTED
--    le conflit verrouille la ligne, la condition est réévaluée sur la valeur
--    validée, donc deux appels simultanés ne dépassent jamais le plafond.
-- ============================================================================

create table public.ai_usage (
  dossier_id uuid not null references public.dossier (id) on delete cascade,
  day date not null,
  count integer not null default 0 check (count >= 0),
  primary key (dossier_id, day)
);

alter table public.ai_usage enable row level security;
-- WHY: pas de policy, et pas de privilège de table : la RLS seule laisserait
-- encore un GRANT par défaut ; les deux ensemble ferment l'accès par l'API.
revoke all on table public.ai_usage from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Consomme un appel du quota du jour. Renvoie false quand le plafond est atteint.
-- WHY: security definer pour écrire dans ai_usage sans privilège de table ;
-- search_path vide contre le détournement de schéma. La limite reçue est bornée
-- à v_max (20) : la fonction est appelable en RPC par tout utilisateur connecté,
-- une valeur fournie par le client ne doit pas pouvoir lever le quota.
-- La valeur par défaut du paramètre (20) doit rester égale à v_max.
-- ---------------------------------------------------------------------------
create function public.consume_ai_quota(
  p_dossier_id uuid,
  p_daily_limit integer default 20
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max constant integer := 20;
  v_limit integer := least(greatest(coalesce(p_daily_limit, 0), 0), v_max);
  v_day date := (now() at time zone 'utc')::date;
  v_count integer;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.is_dossier_member(p_dossier_id, 'contributor') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if v_limit = 0 then
    return false;
  end if;

  insert into public.ai_usage as u (dossier_id, day, count)
  values (p_dossier_id, v_day, 1)
  on conflict (dossier_id, day) do update
    set count = u.count + 1
    where u.count < v_limit
  returning u.count into v_count;

  -- WHY: quand le plafond est atteint, la clause where de l'upsert n'écrit
  -- aucune ligne et v_count reste null.
  return v_count is not null;
end;
$$;

revoke execute on function public.consume_ai_quota(uuid, integer) from public, anon;
grant execute on function public.consume_ai_quota(uuid, integer) to authenticated;
