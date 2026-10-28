-- ============================================================================
-- Lot 2 · PR 5 — clôture des cotisations, journal de clôture.
--
-- WHY (choix assumés) :
--  - l'état de clôture se lit dans dossier_finance (closed_at, closed_by) ; il ne
--    s'écrit que par close_ledger (trésorier et plus) et reopen_ledger
--    (propriétaire seul), security definer : droits de colonne, le propriétaire
--    n'écrit directement que la visibilité ;
--  - un dossier clôturé refuse toute écriture financière : registre (promesses et
--    annulations comprises), postes (création, modification, suppression),
--    scénario retenu, reçus (préparation et rattachement). Code dédié TL009, levé
--    par ledger_assert_open, toujours après le contrôle du rôle ;
--  - le réglage de visibilité reste modifiable : il ne change aucun montant ;
--  - journal minimal ledger_closure_event (qui, quand, clôture ou réouverture),
--    écrit seulement par les deux fonctions, lisible par trésorier et plus ;
--  - un dossier qui a un registre ne se supprime toujours pas, même clôturé
--    (ledger_entry.dossier_id on delete restrict) : aucune donnée financière n'est
--    effacée ; l'export CSV du registre sert d'archive à la famille.
-- ============================================================================

alter table public.dossier_finance
  add column closed_at timestamptz,
  -- WHY: nullable et « on delete set null », comme le registre : un membre peut supprimer son
  -- compte sans rouvrir le dossier.
  add column closed_by uuid references auth.users (id) on delete set null,
  add constraint dossier_finance_closed_by_needs_closed_at
    check (closed_by is null or closed_at is not null);

create index dossier_finance_closed_by_idx on public.dossier_finance (closed_by);

-- WHY: droits de colonne. Le propriétaire écrit seulement la visibilité (l'upsert de PostgREST
-- réécrit aussi dossier_id, que le trigger de mise à jour fige). scenario passe par
-- set_budget_scenario, la clôture par close_ledger et reopen_ledger : security definer, ces
-- fonctions ne dépendent pas de ces droits.
revoke insert, update on public.dossier_finance from authenticated;
grant insert (dossier_id, amounts_visibility) on public.dossier_finance to authenticated;
grant update (dossier_id, amounts_visibility) on public.dossier_finance to authenticated;

-- ---------------------------------------------------------------------------
-- Journal de clôture : une ligne par clôture ou réouverture effective.
-- ---------------------------------------------------------------------------
create table public.ledger_closure_event (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossier (id) on delete cascade,
  action text not null check (action in ('close', 'reopen')),
  actor_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index ledger_closure_event_dossier_idx
  on public.ledger_closure_event (dossier_id, created_at desc);
create index ledger_closure_event_actor_idx on public.ledger_closure_event (actor_id);

alter table public.ledger_closure_event enable row level security;
revoke all on public.ledger_closure_event from anon;
revoke insert, update, delete, truncate, trigger, references
  on public.ledger_closure_event from authenticated;

create policy ledger_closure_event_select on public.ledger_closure_event
  for select to authenticated
  using (public.is_dossier_member(dossier_id, 'treasurer'));

-- ---------------------------------------------------------------------------
-- Contrôle commun : refuse une écriture financière sur un dossier clôturé.
-- ---------------------------------------------------------------------------
-- WHY: security definer pour lire dossier_finance et verrouiller le dossier quelle que soit la
-- RLS de l'appelant ; non exécutable via l'API (seuls les triggers et set_budget_scenario
-- l'appellent, en tant que propriétaire des fonctions) ; search_path vide contre le
-- détournement de schéma.
create function public.ledger_assert_open(p_dossier_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- WHY: verrou partagé sur la ligne du dossier, en face du verrou exclusif (« for no key
  -- update ») de close_ledger et reopen_ledger : une écriture en cours finit avant la clôture, et
  -- une écriture qui suit la clôture la voit (nouvelle lecture après l'attente). Les écritures
  -- entre elles ne se bloquent pas (verrous partagés compatibles).
  -- WHY: cette garantie suppose le niveau READ COMMITTED (celui de PostgREST par défaut) : après
  -- l'attente du verrou, la lecture de dossier_finance qui suit voit la clôture validée. Effet de
  -- bord accepté : le « for share » attend aussi la fin d'un UPDATE de la ligne dossier (rare et
  -- bref, par exemple un renommage), effet négligeable.
  perform 1 from public.dossier d where d.id = p_dossier_id for share;
  -- WHY: dossier introuvable : suppression en cascade en cours (la ligne du dossier n'est déjà
  -- plus visible), rien à protéger. Une insertion vers un dossier absent est refusée ailleurs
  -- (rôle, clé étrangère).
  if not found then
    return;
  end if;
  if exists (
    select 1 from public.dossier_finance f
     where f.dossier_id = p_dossier_id and f.closed_at is not null
  ) then
    raise exception 'ledger closed' using errcode = 'TL009';
  end if;
end;
$$;

revoke execute on function public.ledger_assert_open(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Clôture et réouverture.
-- ---------------------------------------------------------------------------
create function public.close_ledger(p_dossier_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_closed_at timestamptz;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.is_dossier_member(p_dossier_id, 'treasurer') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  -- WHY: verrou exclusif sur le dossier (voir ledger_assert_open) ; deux clôtures simultanées
  -- se suivent.
  perform 1 from public.dossier d where d.id = p_dossier_id for no key update;
  select f.closed_at into v_closed_at
    from public.dossier_finance f
   where f.dossier_id = p_dossier_id;
  -- WHY: clôturer un dossier déjà clôturé est sans effet (double clic, deux trésoriers) : la date
  -- et l'auteur de la première clôture restent, aucun événement n'est journalisé.
  if v_closed_at is not null then
    return v_closed_at;
  end if;
  -- WHY: clock_timestamp() plutôt que now() : now() est l'heure du début de la transaction,
  -- antérieure à l'attente du verrou ; une écriture validée pendant cette attente serait datée
  -- après la clôture. L'heure prise après le verrou suit toute écriture déjà acceptée.
  v_closed_at := clock_timestamp();
  insert into public.dossier_finance (dossier_id, closed_at, closed_by)
  values (p_dossier_id, v_closed_at, auth.uid())
  on conflict (dossier_id) do update
    set closed_at = excluded.closed_at, closed_by = excluded.closed_by;
  insert into public.ledger_closure_event (dossier_id, action, actor_id)
  values (p_dossier_id, 'close', auth.uid());
  return v_closed_at;
end;
$$;

revoke execute on function public.close_ledger(uuid) from public, anon;
grant execute on function public.close_ledger(uuid) to authenticated;

create function public.reopen_ledger(p_dossier_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.is_dossier_member(p_dossier_id, 'owner') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform 1 from public.dossier d where d.id = p_dossier_id for no key update;
  -- WHY: rouvrir un dossier ouvert est sans effet et n'est pas journalisé.
  if not exists (
    select 1 from public.dossier_finance f
     where f.dossier_id = p_dossier_id and f.closed_at is not null
  ) then
    return;
  end if;
  update public.dossier_finance
     set closed_at = null, closed_by = null
   where dossier_id = p_dossier_id;
  insert into public.ledger_closure_event (dossier_id, action, actor_id)
  values (p_dossier_id, 'reopen', auth.uid());
end;
$$;

revoke execute on function public.reopen_ledger(uuid) from public, anon;
grant execute on function public.reopen_ledger(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Scénario retenu : refusé une fois clôturé.
-- ---------------------------------------------------------------------------
create or replace function public.set_budget_scenario(p_dossier_id uuid, p_scenario text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.is_dossier_member(p_dossier_id, 'treasurer') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  perform public.ledger_assert_open(p_dossier_id);
  if p_scenario is not null and p_scenario not in ('sober', 'intermediate', 'full') then
    raise exception 'invalid scenario' using errcode = '23514';
  end if;
  insert into public.dossier_finance (dossier_id, scenario)
  values (p_dossier_id, p_scenario)
  on conflict (dossier_id) do update set scenario = excluded.scenario;
end;
$$;

revoke execute on function public.set_budget_scenario(uuid, text) from public, anon;
grant execute on function public.set_budget_scenario(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Registre : refusé une fois clôturé (après le rôle et le rejeu).
-- ---------------------------------------------------------------------------
-- WHY: security definer pour lire la ligne visée ou la promesse quelle que soit la
-- RLS du lecteur ; search_path vide contre le détournement de schéma.
create or replace function public.ledger_entry_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.ledger_entry;
begin
  -- WHY: contrôle du rôle avant tout autre, pour qu'un non-membre ou un lecteur
  -- ne puisse pas sonder le registre par les codes TL001 à TL003 ni par TL009. La
  -- RLS reste la règle de référence.
  if not public.is_dossier_member(
    new.dossier_id,
    (case when new.kind = 'pledge' then 'contributor' else 'treasurer' end)::public.dossier_role
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  -- WHY: un second envoi (même clé d'idempotence) doit donner 23505, que le dépôt traite comme
  -- un double envoi ; il ne doit pas être jugé à nouveau (par exemple TL002 une fois que la
  -- première cotisation a soldé la promesse, ou TL009 une fois le dossier clôturé). On lève
  -- 23505 ici plutôt que de laisser passer la ligne : non normalisée par la suite du trigger,
  -- elle échouerait d'abord sur une contrainte check (23514, par exemple reverses_kind d'une
  -- annulation). La contrainte d'unicité reste le garde-fou pour deux envois concurrents.
  if exists (
    select 1
      from public.ledger_entry e
     where e.dossier_id = new.dossier_id
       and e.idempotency_key = new.idempotency_key
  ) then
    raise exception 'duplicate idempotency key' using errcode = '23505';
  end if;

  perform public.ledger_assert_open(new.dossier_id);

  new.created_by := auth.uid();
  new.created_at := now();

  if new.occurred_on > current_date + 1 then
    raise exception 'invalid date' using errcode = '23514';
  end if;

  if new.kind = 'reversal' then
    -- WHY: verrou sur la ligne visée, pour sérialiser une annulation et un
    -- versement concurrents qui la concernent.
    select * into v_target from public.ledger_entry where id = new.reverses_id for update;
    if not found or v_target.dossier_id <> new.dossier_id or v_target.kind = 'reversal' then
      raise exception 'invalid reversal' using errcode = 'TL001';
    end if;
    new.amount := v_target.amount;
    new.party_name := v_target.party_name;
    new.member_id := v_target.member_id;
    new.reverses_kind := v_target.kind;
    new.method := null;
    new.pledge_id := null;
    new.budget_line_id := null;
    return new;
  end if;
  new.reverses_kind := null;
  -- WHY: le poste d'une dépense doit appartenir au même dossier. Pour les autres
  -- types, la contrainte check sur budget_line_id refuse la ligne (23514).
  if new.kind = 'expense' and new.budget_line_id is not null and not exists (
    select 1 from public.budget_line l
     where l.id = new.budget_line_id and l.dossier_id = new.dossier_id
  ) then
    raise exception 'invalid budget line' using errcode = 'TL004';
  end if;

  -- WHY: seule une cotisation reçue peut viser une promesse ; pour les autres types,
  -- la contrainte check sur pledge_id refuse la ligne (23514).
  if new.pledge_id is not null and new.kind = 'receipt' then
    -- WHY: verrou sur la promesse avant de compter ses versements : deux cotisations
    -- concurrentes sur la même promesse se sérialisent sur ce verrou, la seconde
    -- voit donc la première.
    select * into v_target from public.ledger_entry where id = new.pledge_id for update;
    if not found
      or v_target.dossier_id <> new.dossier_id
      or v_target.kind <> 'pledge'
      or exists (select 1 from public.ledger_entry r where r.reverses_id = v_target.id)
      or (
        select coalesce(sum(rc.amount), 0)
          from public.ledger_entry rc
         where rc.pledge_id = v_target.id
           and rc.kind = 'receipt'
           and not exists (select 1 from public.ledger_entry rv where rv.reverses_id = rc.id)
      ) >= v_target.amount
    then
      raise exception 'invalid pledge' using errcode = 'TL002';
    end if;
    -- WHY: le membre qui a promis doit voir sa cotisation, même en mode restreint.
    new.member_id := v_target.member_id;
  end if;

  -- WHY: un versement lié à une promesse reprend le membre de la promesse, même si
  -- ce membre a quitté le dossier depuis : la somme promise reste due.
  if new.pledge_id is null and new.member_id is not null and not exists (
    select 1 from public.dossier_member m
     where m.dossier_id = new.dossier_id and m.user_id = new.member_id
  ) then
    raise exception 'invalid member' using errcode = 'TL003';
  end if;
  return new;
end;
$$;

revoke execute on function public.ledger_entry_before_insert() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Postes : création, modification et suppression refusées une fois clôturé.
-- ---------------------------------------------------------------------------
create or replace function public.budget_line_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- WHY: contrôle du rôle avant le comptage et la clôture, pour qu'un non-membre ne puisse pas
  -- sonder le dossier par TL005 ou TL009. La RLS reste la règle de référence.
  if not public.is_dossier_member(new.dossier_id, 'treasurer') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  -- WHY: deux insertions concurrentes compteraient chacune 99 postes et
  -- passeraient toutes deux ; le verrou sur la ligne du dossier les sérialise.
  -- « for no key update » plutôt que « for update » : il ne bloque pas les
  -- insertions des autres tables qui référencent le dossier (verrou « key share »
  -- des clés étrangères), seulement les autres insertions de postes.
  perform 1 from public.dossier d where d.id = new.dossier_id for no key update;
  perform public.ledger_assert_open(new.dossier_id);
  if (select count(*) from public.budget_line l where l.dossier_id = new.dossier_id) >= 100 then
    raise exception 'too many budget lines' using errcode = 'TL005';
  end if;
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

-- WHY: l'identifiant, le dossier, la clé de grille et la date de création ne changent jamais.
-- Security definer depuis la PR 5 pour appeler ledger_assert_open (non exécutable via l'API) ;
-- la RLS a déjà écarté les lignes que l'appelant ne peut pas modifier.
create or replace function public.budget_line_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.ledger_assert_open(old.dossier_id);
  new.id := old.id;
  new.dossier_id := old.dossier_id;
  new.grid_key := old.grid_key;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

-- WHY: la RLS a déjà écarté les lignes que l'appelant ne peut pas supprimer. Lors de la
-- suppression en cascade d'un dossier, ledger_assert_open ne trouve plus le dossier et laisse
-- passer.
create function public.budget_line_before_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.ledger_assert_open(old.dossier_id);
  return old;
end;
$$;

create trigger budget_line_before_delete
  before delete on public.budget_line
  for each row execute function public.budget_line_before_delete();

revoke execute on function public.budget_line_before_insert() from public, anon, authenticated;
revoke execute on function public.budget_line_before_update() from public, anon, authenticated;
revoke execute on function public.budget_line_before_delete() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reçus : préparation et rattachement refusés une fois clôturé.
-- ---------------------------------------------------------------------------
-- WHY: security definer pour compter les reçus du dossier quelle que soit la RLS du lecteur ;
-- search_path vide contre le détournement de schéma.
create or replace function public.receipt_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- WHY: contrôle du rôle avant le comptage et la clôture, pour qu'un non-membre ne puisse pas
  -- sonder le dossier par TL007 ou TL009. La RLS reste la règle de référence.
  if not public.is_dossier_member(new.dossier_id, 'treasurer') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  -- WHY: deux préparations concurrentes compteraient chacune 199 reçus ; le verrou sur la ligne
  -- du dossier les sérialise (« for no key update » ne bloque pas les clés étrangères).
  perform 1 from public.dossier d where d.id = new.dossier_id for no key update;
  perform public.ledger_assert_open(new.dossier_id);
  -- WHY: les préparations abandonnées (photo jamais envoyée ou dépense jamais enregistrée) ne
  -- doivent pas épuiser la limite, puisqu'aucune suppression n'est possible : on ne compte que les
  -- reçus rattachés et les non rattachés de moins de 24 heures.
  if (
    select count(*) from public.receipt r
     where r.dossier_id = new.dossier_id
       and (r.entry_id is not null or r.created_at > now() - interval '24 hours')
  ) >= 200 then
    raise exception 'too many receipts' using errcode = 'TL007';
  end if;
  new.entry_id := null;
  new.created_by := auth.uid();
  new.created_at := now();
  -- WHY: « bin » pour un type inconnu : la contrainte check sur mime_type refuse alors la ligne
  -- (23514) au lieu d'un chemin nul (23502).
  new.storage_path := new.dossier_id::text || '/' || new.id::text || '.' || (
    case new.mime_type
      when 'image/jpeg' then 'jpg'
      when 'image/png' then 'png'
      when 'image/webp' then 'webp'
      else 'bin'
    end
  );
  return new;
end;
$$;

-- WHY: tout est figé sauf entry_id ; un rattachement va vers une dépense du même dossier et
-- ne change plus ensuite (le même rattachement rejoué est sans effet, même clôturé). Codes pour
-- que l'application sache s'il faut réessayer : TL006 (photo pas encore au stockage) peut
-- réussir plus tard, TL008 (déjà rattaché ailleurs, détachement, ligne invalide) est définitif,
-- TL009 : dossier clôturé. Security definer pour lire storage.objects quelle que soit la RLS du
-- stockage ; search_path vide contre le détournement.
create or replace function public.receipt_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.id := old.id;
  new.dossier_id := old.dossier_id;
  new.storage_path := old.storage_path;
  new.mime_type := old.mime_type;
  new.size_bytes := old.size_bytes;
  -- WHY: l'auteur est figé, sauf le passage à null que fait « on delete set null » quand son
  -- compte est supprimé ; le figer aussi dans ce cas laisserait un identifiant orphelin.
  new.created_by := case when new.created_by is null then null else old.created_by end;
  new.created_at := old.created_at;
  if old.entry_id is not null and new.entry_id is distinct from old.entry_id then
    raise exception 'receipt already attached' using errcode = 'TL008';
  end if;
  if old.entry_id is null and new.entry_id is not null then
    perform public.ledger_assert_open(old.dossier_id);
  end if;
  -- WHY: une dépense annulée (ligne « reversal ») reste une dépense : le rattachement est
  -- accepté, car la photo justifie la ligne d'origine.
  if old.entry_id is null and new.entry_id is not null and not exists (
    select 1 from public.ledger_entry e
     where e.id = new.entry_id and e.dossier_id = new.dossier_id and e.kind = 'expense'
  ) then
    raise exception 'invalid receipt link' using errcode = 'TL008';
  end if;
  -- WHY: le lien d'envoi signé de Supabase reste valide 2 heures et la policy d'envoi n'est pas
  -- réévaluée au moment de l'envoi : on exige donc la photo au stockage avant le rattachement,
  -- pour qu'aucune photo n'arrive sur le chemin d'un reçu déjà rattaché. Le stockage de production
  -- est versionné : seule la version courante (non archivée) compte.
  if old.entry_id is null and new.entry_id is not null and not exists (
    select 1 from storage.objects o
     where o.bucket_id = 'receipts' and o.name = old.storage_path and o.archived_at is null
  ) then
    raise exception 'receipt photo missing' using errcode = 'TL006';
  end if;
  return new;
end;
$$;

revoke execute on function public.receipt_before_insert() from public, anon, authenticated;
revoke execute on function public.receipt_before_update() from public, anon, authenticated;
