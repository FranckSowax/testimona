-- ============================================================================
-- Lot 3 · PR 5 — photo du dossier (livret et affiche) : table dossier_photo et
-- bucket privé dossier-photos.
--
-- WHY (choix assumés) :
--  - une photo est d'abord « préparée » (ligne dossier_photo sans fichier), puis
--    envoyée au stockage par un lien signé, puis désignée comme photo courante
--    par la RPC set_dossier_photo ; la photo courante précédente est archivée ;
--  - la base impose le chemin (<dossier>/<photo>.jpg), l'auteur, la date de
--    création, et l'absence d'activation et d'archivage à la création : le client
--    ne choisit rien de cela ;
--  - JPEG seul : l'application recadre et réencode la photo avant l'envoi ;
--  - préparation, envoi et désignation réservés au coordinateur et plus ;
--  - l'envoi au stockage n'est permis que sur le chemin d'une photo préparée, ni
--    activée ni archivée : aucun chemin libre, aucun remplacement de fichier ;
--  - la photo courante se lit par tout membre ; une photo préparée ou archivée par
--    le coordinateur et plus ; la lecture d'un objet suit la RLS de dossier_photo ;
--  - au plus une photo courante par dossier (index unique partiel) ;
--  - aucune modification ni suppression par l'API : seule la RPC (security
--    definer) pose activated_at et archived_at ;
--  - codes de set_dossier_photo : 28000 sans utilisateur ; 42501 pour un rôle
--    insuffisant ET pour un identifiant inexistant (rien n'est révélé, même à un
--    coordinateur) ; TL012 pour une photo existante, visible du coordinateur, mais
--    déjà activée ou archivée (définitif) ; TL006 tant que le fichier n'est pas au
--    stockage (retentable, comme pour les reçus) ;
--  - pas de limite du nombre de photos préparées (décision produit) ;
--  - aucune écriture par service-role : tout passe par le client utilisateur et la
--    RLS, comme pour les reçus.
-- ============================================================================

create table public.dossier_photo (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossier (id) on delete cascade,
  path text not null unique,
  -- WHY: nullable et « on delete set null », comme les reçus : un membre peut supprimer son
  -- compte sans effacer les photos. Le trigger l'impose à auth.uid().
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  archived_at timestamptz,
  check (path = dossier_id::text || '/' || id::text || '.jpg'),
  check (archived_at is null or activated_at is not null)
);

create unique index dossier_photo_current_idx on public.dossier_photo (dossier_id)
  where activated_at is not null and archived_at is null;
create index dossier_photo_dossier_idx on public.dossier_photo (dossier_id, created_at desc);
create index dossier_photo_created_by_idx on public.dossier_photo (created_by);

-- WHY: security definer et search_path vide, comme receipt_before_insert : la fonction ne lit que
-- is_dossier_member, mais le gabarit reste le même pour tous les triggers du dossier.
create function public.dossier_photo_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- WHY: le rôle d'abord, avant toute autre erreur, pour qu'un non-membre ne reçoive que 42501.
  -- La RLS reste la règle de référence.
  if not public.is_dossier_member(new.dossier_id, 'coordinator') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  new.path := new.dossier_id::text || '/' || new.id::text || '.jpg';
  new.created_by := auth.uid();
  new.created_at := now();
  new.activated_at := null;
  new.archived_at := null;
  return new;
end;
$$;

create trigger dossier_photo_before_insert
  before insert on public.dossier_photo
  for each row execute function public.dossier_photo_before_insert();

revoke execute on function public.dossier_photo_before_insert() from public, anon, authenticated;

-- WHY: désignation en RPC plutôt qu'en update : il faut archiver l'ancienne photo et activer la
-- nouvelle dans la même transaction, et authenticated n'a aucun droit d'update sur la table.
-- Security definer pour écrire hors RLS et lire storage.objects ; search_path vide contre le
-- détournement de schéma.
create function public.set_dossier_photo(p_photo_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_photo public.dossier_photo%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_photo from public.dossier_photo p where p.id = p_photo_id for update;
  -- WHY: un identifiant inexistant reçoit le même 42501 qu'un rôle insuffisant, pour ne rien
  -- révéler de l'existence d'une photo, même à un coordinateur d'un autre dossier.
  if not found then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if not public.is_dossier_member(v_photo.dossier_id, 'coordinator') then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  if v_photo.activated_at is not null or v_photo.archived_at is not null then
    raise exception 'photo already used' using errcode = 'TL012';
  end if;

  -- WHY: le lien d'envoi signé reste valide 2 heures et la policy d'envoi n'est pas réévaluée au
  -- moment de l'envoi : on exige le fichier au stockage avant l'activation, pour qu'aucun fichier
  -- n'arrive ensuite sur le chemin d'une photo activée. Le stockage de production est versionné :
  -- seule la version courante (non archivée) compte.
  if not exists (
    select 1 from storage.objects o
     where o.bucket_id = 'dossier-photos' and o.name = v_photo.path and o.archived_at is null
  ) then
    raise exception 'dossier photo missing' using errcode = 'TL006';
  end if;

  -- WHY: deux désignations concurrentes de photos différentes archiveraient chacune la même
  -- ancienne photo puis buteraient sur l'index unique ; le verrou sur la ligne du dossier les
  -- sérialise (« for no key update » ne bloque pas les clés étrangères).
  perform 1 from public.dossier d where d.id = v_photo.dossier_id for no key update;

  update public.dossier_photo p
     set archived_at = now()
   where p.dossier_id = v_photo.dossier_id
     and p.activated_at is not null
     and p.archived_at is null;

  update public.dossier_photo p set activated_at = now() where p.id = v_photo.id;
end;
$$;

revoke execute on function public.set_dossier_photo(uuid) from public, anon;
grant execute on function public.set_dossier_photo(uuid) to authenticated;

alter table public.dossier_photo enable row level security;
revoke all on public.dossier_photo from anon;
revoke update, delete, truncate, trigger, references on public.dossier_photo from authenticated;

create policy dossier_photo_select on public.dossier_photo
  for select to authenticated
  using (
    public.is_dossier_member(dossier_id)
    and (
      (activated_at is not null and archived_at is null)
      or public.is_dossier_member(dossier_id, 'coordinator')
    )
  );

create policy dossier_photo_insert on public.dossier_photo
  for insert to authenticated
  with check (public.is_dossier_member(dossier_id, 'coordinator'));

-- ---------------------------------------------------------------------------
-- Bucket privé dossier-photos : 5 Mo, JPEG seul.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('dossier-photos', 'dossier-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- WHY: l'envoi n'est permis que sur le chemin d'une photo préparée, ni activée ni archivée, par
-- un coordinateur du dossier : aucun chemin libre, aucun remplacement du fichier d'une photo
-- déjà désignée. Le type et la taille réels de l'objet sont bornés par le bucket.
drop policy if exists dossier_photos_insert on storage.objects;
create policy dossier_photos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'dossier-photos'
    and exists (
      select 1 from public.dossier_photo p
       where p.path = objects.name
         and p.activated_at is null
         and p.archived_at is null
         and public.is_dossier_member(p.dossier_id, 'coordinator')
    )
  );

-- WHY: la sous-requête passe par la RLS de dossier_photo : le fichier se lit exactement quand la
-- ligne se lit (tout membre pour la photo courante, coordinateur et plus sinon). Une seule règle.
drop policy if exists dossier_photos_select on storage.objects;
create policy dossier_photos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'dossier-photos'
    and exists (select 1 from public.dossier_photo p where p.path = objects.name)
  );
