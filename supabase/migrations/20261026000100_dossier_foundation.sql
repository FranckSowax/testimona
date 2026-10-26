-- ============================================================================
-- Socle « dossier familial » — stratégie Parcours d'accompagnement, lot 0.
--
-- Un dossier regroupe tout ce qu'une famille prépare pour une personne
-- (volontés, annonce, funérailles, budget, après). Chaque table métier future
-- portera un `dossier_id` et sa RLS passera par `is_dossier_member()`.
--
-- Convention : les nouvelles tables sont en snake_case (convention Postgres /
-- Supabase). Les tables historiques en PascalCase restent inchangées.
-- ============================================================================

create type public.dossier_role as enum ('owner', 'coordinator', 'treasurer', 'contributor', 'viewer');

-- WHY: un rang numérique permet d'exprimer « au moins coordinateur » dans les
-- policies. Le trésorier peut éditer le contenu mais pas gérer les membres ;
-- ses droits financiers propres seront vérifiés explicitement au lot 2.
create function public.dossier_role_rank(p_role public.dossier_role)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_role
    when 'owner' then 50
    when 'coordinator' then 40
    when 'treasurer' then 30
    when 'contributor' then 20
    else 10
  end;
$$;

create table public.dossier (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 200),
  country_code char(2) not null check (country_code ~ '^[A-Z]{2}$'),
  city text not null check (char_length(city) between 1 and 120),
  entry_point text not null check (entry_point in ('death', 'prepare', 'after')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index dossier_created_by_idx on public.dossier (created_by);

create table public.dossier_member (
  dossier_id uuid not null references public.dossier (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.dossier_role not null,
  created_at timestamptz not null default now(),
  primary key (dossier_id, user_id)
);

create index dossier_member_user_id_idx on public.dossier_member (user_id);

-- ---------------------------------------------------------------------------
-- Fonction d'appartenance utilisée par toutes les policies « par dossier ».
-- WHY: security definer pour lire dossier_member sans déclencher sa propre RLS
-- (sinon récursion infinie) ; search_path vide contre le détournement de schéma.
-- ---------------------------------------------------------------------------
create function public.is_dossier_member(
  p_dossier_id uuid,
  p_min_role public.dossier_role default 'viewer'
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.dossier_member m
    where m.dossier_id = p_dossier_id
      and m.user_id = auth.uid()
      and public.dossier_role_rank(m.role) >= public.dossier_role_rank(p_min_role)
  );
$$;

revoke execute on function public.is_dossier_member(uuid, public.dossier_role) from public, anon;
grant execute on function public.is_dossier_member(uuid, public.dossier_role) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Triggers : créateur = propriétaire, horodatage, au moins un propriétaire.
-- ---------------------------------------------------------------------------
create function public.dossier_add_creator_as_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.dossier_member (dossier_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger dossier_add_creator_as_owner
  after insert on public.dossier
  for each row execute function public.dossier_add_creator_as_owner();

-- WHY: `created_by` est figé (traçabilité) ; plus simple et sans récursion RLS
-- qu'une sous-requête dans la policy d'update.
create function public.dossier_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

create trigger dossier_before_update
  before update on public.dossier
  for each row execute function public.dossier_before_update();

-- WHY: un dossier sans propriétaire n'est plus administrable par personne.
-- La suppression du dossier entier (cascade) reste permise.
create function public.dossier_member_keep_one_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'owner'
     and (tg_op = 'DELETE' or new.role <> 'owner')
     and exists (select 1 from public.dossier d where d.id = old.dossier_id)
     and not exists (
       select 1 from public.dossier_member m
       where m.dossier_id = old.dossier_id
         and m.role = 'owner'
         and m.user_id <> old.user_id
     ) then
    raise exception 'Un dossier doit garder au moins un propriétaire'
      using errcode = 'check_violation';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger dossier_member_keep_one_owner
  before update or delete on public.dossier_member
  for each row execute function public.dossier_member_keep_one_owner();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.dossier enable row level security;
alter table public.dossier_member enable row level security;

-- Défense en profondeur : un visiteur anonyme n'a aucun accès aux dossiers.
revoke all on public.dossier, public.dossier_member from anon;

-- WHY: `created_by = auth.uid()` rend la ligne visible juste après l'insert,
-- avant que le trigger ait ajouté le créateur dans dossier_member (RETURNING).
create policy dossier_select on public.dossier
  for select to authenticated
  using (created_by = auth.uid() or public.is_dossier_member(id));

create policy dossier_insert on public.dossier
  for insert to authenticated
  with check (created_by = auth.uid());

create policy dossier_update on public.dossier
  for update to authenticated
  using (public.is_dossier_member(id, 'coordinator'))
  with check (public.is_dossier_member(id, 'coordinator'));

create policy dossier_delete on public.dossier
  for delete to authenticated
  using (public.is_dossier_member(id, 'owner'));

create policy dossier_member_select on public.dossier_member
  for select to authenticated
  using (public.is_dossier_member(dossier_id));

-- Coordinateur et plus : gérer les membres. Seul un propriétaire nomme ou
-- retire un propriétaire.
create policy dossier_member_insert on public.dossier_member
  for insert to authenticated
  with check (
    public.is_dossier_member(dossier_id, 'coordinator')
    and (role <> 'owner' or public.is_dossier_member(dossier_id, 'owner'))
  );

create policy dossier_member_update on public.dossier_member
  for update to authenticated
  using (
    public.is_dossier_member(dossier_id, 'coordinator')
    and (role <> 'owner' or public.is_dossier_member(dossier_id, 'owner'))
  )
  with check (
    public.is_dossier_member(dossier_id, 'coordinator')
    and (role <> 'owner' or public.is_dossier_member(dossier_id, 'owner'))
  );

-- Chacun peut quitter un dossier ; sinon il faut être coordinateur (ou
-- propriétaire pour retirer un propriétaire).
create policy dossier_member_delete on public.dossier_member
  for delete to authenticated
  using (
    user_id = auth.uid()
    or (
      public.is_dossier_member(dossier_id, 'coordinator')
      and (role <> 'owner' or public.is_dossier_member(dossier_id, 'owner'))
    )
  );
