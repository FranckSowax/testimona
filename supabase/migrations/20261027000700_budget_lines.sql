-- ============================================================================
-- Lot 2 · PR 3 — postes du budget, scénario retenu, dépenses par poste.
--
-- WHY (choix assumés) :
--  - le scénario retenu s'écrit par set_budget_scenario (trésorier et plus) ; la
--    policy de mise à jour de dossier_finance reste au propriétaire (visibilité) ;
--  - montants nommés amount_sober / amount_intermediate / amount_full : « full »
--    est un mot réservé de Postgres ;
--  - un poste qui porte des dépenses ne se supprime pas (on delete no action :
--    23503 ; « restrict » lèverait 23001) ;
--  - un poste dont toutes les dépenses ont été annulées reste impossible à
--    supprimer : le registre est en ajout seul, les dépenses annulées et leurs
--    annulations restent rattachées au poste. C'est voulu ;
--  - les dépenses sont visibles de tout membre : ledger_spent_by_line est en
--    security invoker, la RLS du registre suffit.
-- ============================================================================

alter table public.dossier_finance
  add column scenario text check (scenario in ('sober', 'intermediate', 'full'));

-- WHY: security definer pour écrire la seule colonne scenario sans ouvrir au
-- trésorier la mise à jour de dossier_finance (visibilité réservée au propriétaire).
create function public.set_budget_scenario(p_dossier_id uuid, p_scenario text)
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
-- budget_line : les postes du budget du dossier
-- ---------------------------------------------------------------------------
create table public.budget_line (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossier (id) on delete cascade,
  grid_key text check (grid_key ~ '^[a-zA-Z]{1,40}$'),
  label text not null check (char_length(label) between 1 and 120),
  amount_sober integer not null default 0 check (amount_sober between 0 and 100000000),
  amount_intermediate integer not null default 0
    check (amount_intermediate between 0 and 100000000),
  amount_full integer not null default 0 check (amount_full between 0 and 100000000),
  edited boolean not null default false,
  position integer not null default 0 check (position between 0 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (dossier_id, grid_key)
);

create index budget_line_dossier_idx on public.budget_line (dossier_id, position);

-- WHY: au plus 100 postes par dossier, pour borner un écran et une saisie abusive.
create function public.budget_line_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- WHY: contrôle du rôle avant le comptage, pour qu'un non-membre ne puisse pas
  -- sonder le nombre de postes d'un dossier par le code 23514. La RLS reste la
  -- règle de référence.
  if not public.is_dossier_member(new.dossier_id, 'treasurer') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  -- WHY: deux insertions concurrentes compteraient chacune 99 postes et
  -- passeraient toutes deux ; le verrou sur la ligne du dossier les sérialise.
  -- « for no key update » plutôt que « for update » : il ne bloque pas les
  -- insertions des autres tables qui référencent le dossier (verrou « key share »
  -- des clés étrangères), seulement les autres insertions de postes.
  perform 1 from public.dossier d where d.id = new.dossier_id for no key update;
  if (select count(*) from public.budget_line l where l.dossier_id = new.dossier_id) >= 100 then
    raise exception 'too many budget lines' using errcode = '23514';
  end if;
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

create trigger budget_line_before_insert
  before insert on public.budget_line
  for each row execute function public.budget_line_before_insert();

-- WHY: l'identifiant, le dossier, la clé de grille et la date de création ne
-- changent jamais.
create function public.budget_line_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id := old.id;
  new.dossier_id := old.dossier_id;
  new.grid_key := old.grid_key;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

create trigger budget_line_before_update
  before update on public.budget_line
  for each row execute function public.budget_line_before_update();

revoke execute on function public.budget_line_before_insert() from public, anon, authenticated;
revoke execute on function public.budget_line_before_update() from public, anon, authenticated;

alter table public.budget_line enable row level security;
revoke all on public.budget_line from anon;
revoke truncate, trigger, references on public.budget_line from authenticated;

create policy budget_line_select on public.budget_line
  for select to authenticated
  using (public.is_dossier_member(dossier_id));

create policy budget_line_insert on public.budget_line
  for insert to authenticated
  with check (public.is_dossier_member(dossier_id, 'treasurer'));

create policy budget_line_update on public.budget_line
  for update to authenticated
  using (public.is_dossier_member(dossier_id, 'treasurer'))
  with check (public.is_dossier_member(dossier_id, 'treasurer'));

create policy budget_line_delete on public.budget_line
  for delete to authenticated
  using (public.is_dossier_member(dossier_id, 'treasurer'));

-- ---------------------------------------------------------------------------
-- ledger_entry.budget_line_id : poste d'une dépense
-- ---------------------------------------------------------------------------
alter table public.ledger_entry
  add column budget_line_id uuid references public.budget_line (id) on delete no action,
  add constraint ledger_entry_budget_line_expense
    check (budget_line_id is null or kind = 'expense');

create index ledger_entry_budget_line_idx on public.ledger_entry (budget_line_id);

-- ---------------------------------------------------------------------------
-- Trigger du registre : contrôle du poste d'une dépense.
-- ---------------------------------------------------------------------------
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
  -- ne puisse pas sonder le registre par les codes TL001 à TL003. La RLS reste la
  -- règle de référence.
  if not public.is_dossier_member(
    new.dossier_id,
    (case when new.kind = 'pledge' then 'contributor' else 'treasurer' end)::public.dossier_role
  ) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  -- WHY: un second envoi (même clé d'idempotence) doit donner 23505, que le dépôt traite comme
  -- un double envoi ; il ne doit pas être jugé à nouveau (par exemple TL002 une fois que la
  -- première cotisation a soldé la promesse). On lève 23505 ici plutôt que de laisser passer la
  -- ligne : non normalisée par la suite du trigger, elle échouerait d'abord sur une contrainte
  -- check (23514, par exemple reverses_kind d'une annulation). La contrainte d'unicité reste le
  -- garde-fou pour deux envois concurrents.
  if exists (
    select 1
      from public.ledger_entry e
     where e.dossier_id = new.dossier_id
       and e.idempotency_key = new.idempotency_key
  ) then
    raise exception 'duplicate idempotency key' using errcode = '23505';
  end if;

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
-- Dépenses actives par poste (null : dépenses sans poste).
-- ---------------------------------------------------------------------------
create function public.ledger_spent_by_line(p_dossier_id uuid)
returns table (budget_line_id uuid, spent bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select e.budget_line_id, sum(e.amount)::bigint
    from public.ledger_entry e
   where e.dossier_id = p_dossier_id
     and e.kind = 'expense'
     and not exists (select 1 from public.ledger_entry r where r.reverses_id = e.id)
   group by e.budget_line_id;
$$;

revoke execute on function public.ledger_spent_by_line(uuid) from public, anon;
grant execute on function public.ledger_spent_by_line(uuid) to authenticated;
