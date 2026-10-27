-- ============================================================================
-- Lot 2 · PR 2 — registre des cotisations et des dépenses.
--
-- WHY (choix assumés) :
--  - registre en ajout seul : aucune modification ni suppression ; une erreur se
--    corrige par une ligne « reversal » qui annule une ligne existante ;
--  - le trigger impose l'auteur, recopie dans une annulation le montant, le nom et
--    le membre de la ligne visée, et vérifie promesses et membres liés ;
--  - la RLS de lecture dépend du réglage de visibilité du dossier ; une
--    annulation porte le type de la ligne visée (reverses_kind) pour éviter une
--    politique qui relirait sa propre table ;
--  - les totaux passent par ledger_totals, qui ne renvoie que des sommes : tout
--    membre les voit, même quand les lignes individuelles lui sont masquées.
-- ============================================================================

create table public.dossier_finance (
  dossier_id uuid primary key references public.dossier (id) on delete cascade,
  amounts_visibility text not null default 'restricted'
    check (amounts_visibility in ('restricted', 'members')),
  updated_at timestamptz not null default now()
);

alter table public.dossier_finance enable row level security;
revoke all on public.dossier_finance from anon;
revoke delete, truncate, trigger, references on public.dossier_finance from authenticated;

create policy dossier_finance_select on public.dossier_finance
  for select to authenticated
  using (public.is_dossier_member(dossier_id));

create policy dossier_finance_insert on public.dossier_finance
  for insert to authenticated
  with check (public.is_dossier_member(dossier_id, 'owner'));

create policy dossier_finance_update on public.dossier_finance
  for update to authenticated
  using (public.is_dossier_member(dossier_id, 'owner'))
  with check (public.is_dossier_member(dossier_id, 'owner'));

-- ---------------------------------------------------------------------------
-- ledger_entry : une ligne par promesse, cotisation reçue, dépense ou annulation
-- ---------------------------------------------------------------------------
create table public.ledger_entry (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossier (id) on delete cascade,
  kind text not null check (kind in ('pledge', 'receipt', 'expense', 'reversal')),
  amount integer not null check (amount between 1 and 100000000),
  method text check (
    method in ('cash', 'airtel_money', 'moov_money', 'transfer', 'card', 'other')
  ),
  party_name text not null check (char_length(party_name) between 1 and 120),
  member_id uuid references auth.users (id) on delete set null,
  pledge_id uuid references public.ledger_entry (id),
  note text not null default '' check (char_length(note) <= 500),
  occurred_on date not null default current_date,
  reverses_id uuid unique references public.ledger_entry (id),
  reverses_kind text check (reverses_kind in ('pledge', 'receipt', 'expense')),
  idempotency_key uuid not null,
  created_by uuid not null default auth.uid() references auth.users (id),
  created_at timestamptz not null default now(),
  unique (dossier_id, idempotency_key),
  check ((kind = 'reversal') = (reverses_id is not null)),
  check ((kind = 'reversal') = (reverses_kind is not null)),
  check (pledge_id is null or kind = 'receipt'),
  check (kind in ('pledge', 'reversal') or method is not null)
);

create index ledger_entry_dossier_idx on public.ledger_entry (dossier_id, occurred_on desc);
create index ledger_entry_member_idx on public.ledger_entry (member_id);
create index ledger_entry_pledge_idx on public.ledger_entry (pledge_id);
create index ledger_entry_created_by_idx on public.ledger_entry (created_by);

-- WHY: security definer pour lire la ligne visée ou la promesse quelle que soit la
-- RLS du lecteur ; search_path vide contre le détournement de schéma.
create function public.ledger_entry_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.ledger_entry;
begin
  new.created_by := auth.uid();
  new.created_at := now();

  if new.kind = 'reversal' then
    select * into v_target from public.ledger_entry where id = new.reverses_id;
    if not found or v_target.dossier_id <> new.dossier_id or v_target.kind = 'reversal' then
      raise exception 'invalid reversal' using errcode = 'TL001';
    end if;
    new.amount := v_target.amount;
    new.party_name := v_target.party_name;
    new.member_id := v_target.member_id;
    new.reverses_kind := v_target.kind;
    new.method := null;
    new.pledge_id := null;
    return new;
  end if;
  new.reverses_kind := null;

  if new.pledge_id is not null then
    select * into v_target from public.ledger_entry where id = new.pledge_id;
    if not found
      or v_target.dossier_id <> new.dossier_id
      or v_target.kind <> 'pledge'
      or exists (select 1 from public.ledger_entry r where r.reverses_id = v_target.id)
      or exists (
        select 1 from public.ledger_entry rc
         where rc.pledge_id = v_target.id
           and rc.kind = 'receipt'
           and not exists (select 1 from public.ledger_entry rv where rv.reverses_id = rc.id)
      )
    then
      raise exception 'invalid pledge' using errcode = 'TL002';
    end if;
    -- WHY: le membre qui a promis doit voir sa cotisation, même en mode restreint.
    new.member_id := coalesce(new.member_id, v_target.member_id);
  end if;

  if new.member_id is not null and not exists (
    select 1 from public.dossier_member m
     where m.dossier_id = new.dossier_id and m.user_id = new.member_id
  ) then
    raise exception 'invalid member' using errcode = 'TL003';
  end if;
  return new;
end;
$$;

create trigger ledger_entry_before_insert
  before insert on public.ledger_entry
  for each row execute function public.ledger_entry_before_insert();

revoke execute on function public.ledger_entry_before_insert() from public, anon, authenticated;

alter table public.ledger_entry enable row level security;
revoke all on public.ledger_entry from anon;
revoke update, delete, truncate, trigger, references on public.ledger_entry from authenticated;

create policy ledger_entry_select on public.ledger_entry
  for select to authenticated
  using (
    public.is_dossier_member(dossier_id, 'treasurer')
    or (
      public.is_dossier_member(dossier_id)
      and (
        exists (
          select 1 from public.dossier_finance f
           where f.dossier_id = ledger_entry.dossier_id and f.amounts_visibility = 'members'
        )
        or kind = 'expense'
        or reverses_kind = 'expense'
        or member_id = auth.uid()
      )
    )
  );

create policy ledger_entry_insert on public.ledger_entry
  for insert to authenticated
  with check (
    public.is_dossier_member(dossier_id, 'treasurer')
    or (
      kind = 'pledge'
      and member_id = auth.uid()
      and public.is_dossier_member(dossier_id, 'contributor')
    )
  );

-- ---------------------------------------------------------------------------
-- Totaux du registre, sommes seulement, pour tout membre du dossier.
-- ---------------------------------------------------------------------------
create function public.ledger_totals(p_dossier_id uuid)
returns table (received bigint, pledged_open bigint, spent bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  if not public.is_dossier_member(p_dossier_id) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  with active as (
    select e.id, e.kind, e.amount, e.pledge_id
      from public.ledger_entry e
     where e.dossier_id = p_dossier_id
       and e.kind <> 'reversal'
       and not exists (select 1 from public.ledger_entry r where r.reverses_id = e.id)
  )
  select
    (select coalesce(sum(a.amount), 0)::bigint from active a where a.kind = 'receipt'),
    (select coalesce(sum(p.amount), 0)::bigint
       from active p
      where p.kind = 'pledge'
        and not exists (select 1 from active rc where rc.kind = 'receipt' and rc.pledge_id = p.id)),
    (select coalesce(sum(a.amount), 0)::bigint from active a where a.kind = 'expense');
end;
$$;

revoke execute on function public.ledger_totals(uuid) from public, anon;
grant execute on function public.ledger_totals(uuid) to authenticated;
