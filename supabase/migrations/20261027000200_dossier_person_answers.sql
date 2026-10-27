-- ============================================================================
-- Lot 1 · PR 1 — fiche de la personne, réponses du parcours, création atomique.
-- Tout est rattaché à un dossier et protégé par is_dossier_member() (lot 0).
-- ============================================================================

-- Nom affiché des membres (les autres membres ne lisent pas auth.users).
alter table public.dossier_member add column display_name text;

create function public.dossier_member_set_display_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.display_name is null then
    select coalesce(
             nullif(u.raw_user_meta_data ->> 'nickname', ''),
             nullif(u.raw_user_meta_data ->> 'full_name', ''),
             split_part(u.email, '@', 1)
           )
      into new.display_name
      from auth.users u
     where u.id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger dossier_member_set_display_name
  before insert on public.dossier_member
  for each row execute function public.dossier_member_set_display_name();

-- ---------------------------------------------------------------------------
-- person : une fiche par dossier
-- ---------------------------------------------------------------------------
create table public.person (
  dossier_id uuid primary key references public.dossier (id) on delete cascade,
  first_name text not null check (char_length(first_name) between 1 and 120),
  last_name text not null check (char_length(last_name) between 1 and 120),
  nickname text check (nickname is null or char_length(nickname) <= 120),
  birth_date date,
  death_date date,
  death_city text check (death_city is null or char_length(death_city) <= 120),
  death_country_code char(2) check (death_country_code is null or death_country_code ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint person_dates_order check (birth_date is null or death_date is null or death_date >= birth_date)
);

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger person_touch_updated_at
  before update on public.person
  for each row execute function public.touch_updated_at();

alter table public.person enable row level security;
revoke all on public.person from anon;

create policy person_select on public.person
  for select to authenticated
  using (public.is_dossier_member(dossier_id));

create policy person_insert on public.person
  for insert to authenticated
  with check (public.is_dossier_member(dossier_id, 'contributor'));

create policy person_update on public.person
  for update to authenticated
  using (public.is_dossier_member(dossier_id, 'contributor'))
  with check (public.is_dossier_member(dossier_id, 'contributor'));

-- ---------------------------------------------------------------------------
-- journey_answer : une ligne par réponse du parcours
-- ---------------------------------------------------------------------------
create table public.journey_answer (
  dossier_id uuid not null references public.dossier (id) on delete cascade,
  key text not null check (key ~ '^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$'),
  value jsonb not null,
  answered_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (dossier_id, key)
);

-- WHY: l'auteur est toujours l'utilisateur courant, jamais une valeur envoyée.
create function public.journey_answer_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.answered_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

create trigger journey_answer_before_write
  before insert or update on public.journey_answer
  for each row execute function public.journey_answer_before_write();

alter table public.journey_answer enable row level security;
revoke all on public.journey_answer from anon;

create policy journey_answer_select on public.journey_answer
  for select to authenticated
  using (public.is_dossier_member(dossier_id));

create policy journey_answer_insert on public.journey_answer
  for insert to authenticated
  with check (public.is_dossier_member(dossier_id, 'contributor'));

create policy journey_answer_update on public.journey_answer
  for update to authenticated
  using (public.is_dossier_member(dossier_id, 'contributor'))
  with check (public.is_dossier_member(dossier_id, 'contributor'));

create policy journey_answer_delete on public.journey_answer
  for delete to authenticated
  using (public.is_dossier_member(dossier_id, 'contributor'));

-- ---------------------------------------------------------------------------
-- Création atomique : dossier + personne + lien du créateur, en une transaction.
-- WHY: security invoker, donc les policies ci-dessus s'appliquent ; le trigger du
-- lot 0 fait du créateur le propriétaire avant l'insertion de la personne.
-- ---------------------------------------------------------------------------
create function public.create_dossier_with_person(
  p_entry_point text,
  p_first_name text,
  p_last_name text,
  p_country_code text,
  p_city text,
  p_relationship text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.dossier (title, country_code, city, entry_point)
  values (
    trim(p_first_name) || ' ' || trim(p_last_name),
    upper(trim(p_country_code)),
    trim(p_city),
    p_entry_point
  )
  returning id into v_id;

  insert into public.person (dossier_id, first_name, last_name)
  values (v_id, trim(p_first_name), trim(p_last_name));

  if p_relationship is not null and char_length(trim(p_relationship)) > 0 then
    insert into public.journey_answer (dossier_id, key, value)
    values (v_id, 'creator.relationship', to_jsonb(trim(p_relationship)));
  end if;

  return v_id;
end;
$$;

revoke execute on function public.create_dossier_with_person(text, text, text, text, text, text) from public, anon;
grant execute on function public.create_dossier_with_person(text, text, text, text, text, text) to authenticated;
