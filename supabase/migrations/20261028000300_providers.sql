-- Lot 3, PR 1 : prestataires vérifiés, catégories et demandes de devis.
-- Spec : docs/superpowers/specs/2026-10-28-lot-3-funerailles-design.md, § 1.

-- ---------------------------------------------------------------------------
-- is_admin : search_path fixé (alerte 0011 de l'advisor), logique inchangée.
-- WHY: le rôle vient de app_metadata, que l'utilisateur ne peut pas modifier.
-- `create or replace` garde les droits d'exécution existants.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'Admin', false);
$$;

-- ---------------------------------------------------------------------------
-- Catégories : référence fixe, libellés dans les textes FR/EN.
-- ---------------------------------------------------------------------------
create table public.provider_category (
  key text primary key check (key ~ '^[a-z][a-zA-Z]{1,39}$'),
  position smallint not null unique check (position between 0 and 100)
);

alter table public.provider_category enable row level security;
revoke all on public.provider_category from anon, authenticated;
grant select on public.provider_category to authenticated;

create policy provider_category_select on public.provider_category
  for select to authenticated using (true);

insert into public.provider_category (key, position) values
  ('funeralHome', 0),
  ('tentsChairs', 1),
  ('sound', 2),
  ('lighting', 3),
  ('catering', 4),
  ('drinks', 5),
  ('printing', 6);

-- ---------------------------------------------------------------------------
-- Prestataires : écrits par l'équipe Testimona seulement, jamais supprimés.
-- ---------------------------------------------------------------------------
create table public.provider (
  id uuid primary key default gen_random_uuid(),
  category_key text not null references public.provider_category (key),
  name text not null check (char_length(name) between 1 and 120),
  city text not null check (char_length(city) between 1 and 120),
  district text check (district is null or char_length(district) between 1 and 120),
  whatsapp text check (whatsapp is null or whatsapp ~ '^\+[1-9][0-9]{7,14}$'),
  price_note text check (price_note is null or char_length(price_note) between 1 and 200),
  is_example boolean not null default false,
  verified_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- WHY: un prestataire d'exemple ne doit jamais pouvoir être contacté par une famille.
  constraint provider_example_unreachable
    check (not is_example or (whatsapp is null and verified_at is null))
);

create index provider_city_category_idx on public.provider (city, category_key) where active;
create index provider_category_key_idx on public.provider (category_key);

-- WHY: l'identifiant et la date de création sont figés ; la date de modification est imposée.
create function public.provider_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.provider_before_update() from public, anon, authenticated;

create trigger provider_before_update
  before update on public.provider
  for each row execute function public.provider_before_update();

alter table public.provider enable row level security;
revoke all on public.provider from anon, authenticated;
grant select, insert, update on public.provider to authenticated;

create policy provider_select on public.provider
  for select to authenticated using (active or public.is_admin());
create policy provider_insert on public.provider
  for insert to authenticated with check (public.is_admin());
create policy provider_update on public.provider
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- WHY: prestataires fictifs du pilote, sans numéro ni vérification (contrainte ci-dessus).
insert into public.provider (category_key, name, city, district, price_note, is_example) values
  ('funeralHome', 'Pompes funèbres du Centre (exemple)', 'Libreville', 'Centre-ville', 'Prix à demander', true),
  ('funeralHome', 'Services funéraires de l''Estuaire (exemple)', 'Libreville', 'Louis', 'Prix à demander', true),
  ('tentsChairs', 'Location Akanda (exemple)', 'Libreville', 'Akanda', 'Tente 5×10 m, prix indicatif', true),
  ('tentsChairs', 'Chaises et bâches Nzeng-Ayong (exemple)', 'Libreville', 'Nzeng-Ayong', 'Lot de 50 chaises, prix indicatif', true),
  ('sound', 'Sono Owendo (exemple)', 'Libreville', 'Owendo', 'Soirée de veillée, prix indicatif', true),
  ('lighting', 'Éclairage Glass (exemple)', 'Libreville', 'Glass', 'Jeu de lumières, prix indicatif', true),
  ('catering', 'Traiteur Mont-Bouët (exemple)', 'Libreville', 'Mont-Bouët', 'Repas par personne, prix indicatif', true),
  ('catering', 'Cuisine de la veillée (exemple)', 'Libreville', 'PK8', 'Collation par personne, prix indicatif', true),
  ('drinks', 'Boissons Lalala (exemple)', 'Libreville', 'Lalala', 'Packs d''eau et sodas, prix indicatif', true),
  ('printing', 'Imprimerie Batterie IV (exemple)', 'Libreville', 'Batterie IV', 'Livrets et affiches, prix indicatif', true);

-- ---------------------------------------------------------------------------
-- Demandes de devis : trace en ajout seul, utilisée à la PR 3.
-- ---------------------------------------------------------------------------
create table public.quote_request (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossier (id) on delete cascade,
  provider_id uuid not null references public.provider (id),
  step_id text not null check (step_id in ('vigil-setup', 'vigil-catering', 'ceremony-program')),
  message text not null check (char_length(message) between 1 and 2000),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index quote_request_dossier_idx on public.quote_request (dossier_id, created_at desc);
create index quote_request_provider_idx on public.quote_request (provider_id);
create index quote_request_created_by_idx on public.quote_request (created_by);

-- WHY: security definer pour lire un prestataire inactif, que la RLS cache aux familles. Le rôle
-- est vérifié en premier : un non-membre reçoit 42501, jamais TL010, et ne peut pas sonder l'état
-- d'un prestataire.
create function public.quote_request_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_dossier_member(new.dossier_id, 'coordinator') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not exists (
    select 1 from public.provider p
    where p.id = new.provider_id and p.active and not p.is_example and p.whatsapp is not null
  ) then
    raise exception 'provider not reachable' using errcode = 'TL010';
  end if;
  new.created_by := auth.uid();
  new.created_at := now();
  return new;
end;
$$;

revoke execute on function public.quote_request_before_insert() from public, anon, authenticated;

create trigger quote_request_before_insert
  before insert on public.quote_request
  for each row execute function public.quote_request_before_insert();

alter table public.quote_request enable row level security;
revoke all on public.quote_request from anon, authenticated;
grant select, insert on public.quote_request to authenticated;

create policy quote_request_select on public.quote_request
  for select to authenticated using (public.is_dossier_member(dossier_id, 'viewer'));
create policy quote_request_insert on public.quote_request
  for insert to authenticated with check (public.is_dossier_member(dossier_id, 'coordinator'));
