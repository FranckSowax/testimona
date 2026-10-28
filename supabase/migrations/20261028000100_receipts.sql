-- ============================================================================
-- Lot 2 · PR 4 — reçus des dépenses : table receipt et bucket privé receipts.
--
-- WHY (choix assumés) :
--  - une photo est d'abord « préparée » (ligne receipt non rattachée), puis
--    envoyée au stockage par un lien signé, puis rattachée à la dépense
--    enregistrée ;
--  - la base impose le chemin (<dossier>/<reçu>.<ext>), l'auteur, la date et
--    l'absence de rattachement à la création : le client ne choisit rien de cela ;
--  - l'envoi au stockage n'est permis que sur le chemin d'un reçu préparé et pas
--    encore rattaché, par un trésorier du dossier ;
--  - la lecture d'un objet suit la RLS de receipt : trésorier et plus pour un
--    reçu non rattaché, tout membre pour un reçu rattaché (comme les dépenses) ;
--  - un reçu par dépense ; seule la colonne entry_id se modifie, une seule fois ;
--    aucune suppression au lot 2 ;
--  - un reçu ne se rattache qu'une fois sa photo envoyée au stockage (TL006,
--    retentable) ; les autres refus de rattachement sont définitifs (TL008) ;
--  - au plus 200 reçus par dossier (TL007), pour borner le stockage d'un dossier :
--    rattachés, plus non rattachés de moins de 24 heures ;
--  - aucune écriture par service-role : tout passe par le client utilisateur et la
--    RLS, comme pour le registre.
-- ============================================================================

create table public.receipt (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossier (id) on delete cascade,
  entry_id uuid unique references public.ledger_entry (id) on delete no action,
  storage_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  size_bytes integer not null check (size_bytes between 1 and 5242880),
  -- WHY: nullable et « on delete set null », comme le registre : un membre peut supprimer son
  -- compte sans effacer les reçus. Le trigger l'impose à auth.uid().
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    storage_path = dossier_id::text || '/' || id::text || '.' || (
      case mime_type
        when 'image/jpeg' then 'jpg'
        when 'image/png' then 'png'
        when 'image/webp' then 'webp'
        else 'bin'
      end
    )
  )
);

-- WHY: « include (entry_id) » pour que le comptage de la limite (rattachés ou récents) se lise
-- dans l'index seul.
create index receipt_dossier_idx on public.receipt (dossier_id, created_at desc) include (entry_id);
create index receipt_created_by_idx on public.receipt (created_by);

-- WHY: security definer pour compter les reçus du dossier quelle que soit la RLS du lecteur ;
-- search_path vide contre le détournement de schéma.
create function public.receipt_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- WHY: contrôle du rôle avant le comptage, pour qu'un non-membre ne puisse pas sonder le
  -- nombre de reçus d'un dossier par le code TL007. La RLS reste la règle de référence.
  if not public.is_dossier_member(new.dossier_id, 'treasurer') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  -- WHY: deux préparations concurrentes compteraient chacune 199 reçus ; le verrou sur la ligne
  -- du dossier les sérialise (« for no key update » ne bloque pas les clés étrangères).
  perform 1 from public.dossier d where d.id = new.dossier_id for no key update;
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

create trigger receipt_before_insert
  before insert on public.receipt
  for each row execute function public.receipt_before_insert();

-- WHY: tout est figé sauf entry_id ; un rattachement va vers une dépense du même dossier et
-- ne change plus ensuite (le même rattachement rejoué est sans effet). Deux codes pour que
-- l'application sache s'il faut réessayer : TL006 (photo pas encore au stockage) peut réussir
-- plus tard, TL008 (déjà rattaché ailleurs, détachement, ligne invalide) est définitif. Security definer pour lire
-- storage.objects quelle que soit la RLS du stockage ; search_path vide contre le détournement.
create function public.receipt_before_update()
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
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  if old.entry_id is not null and new.entry_id is distinct from old.entry_id then
    raise exception 'receipt already attached' using errcode = 'TL008';
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

create trigger receipt_before_update
  before update on public.receipt
  for each row execute function public.receipt_before_update();

revoke execute on function public.receipt_before_insert() from public, anon, authenticated;
revoke execute on function public.receipt_before_update() from public, anon, authenticated;

alter table public.receipt enable row level security;
revoke all on public.receipt from anon;
revoke update, delete, truncate, trigger, references on public.receipt from authenticated;
-- WHY: droit de colonne en plus du trigger : seul le rattachement est modifiable.
grant update (entry_id) on public.receipt to authenticated;

create policy receipt_select on public.receipt
  for select to authenticated
  using (
    public.is_dossier_member(dossier_id, 'treasurer')
    or (entry_id is not null and public.is_dossier_member(dossier_id))
  );

create policy receipt_insert on public.receipt
  for insert to authenticated
  with check (public.is_dossier_member(dossier_id, 'treasurer'));

create policy receipt_update on public.receipt
  for update to authenticated
  using (public.is_dossier_member(dossier_id, 'treasurer'))
  with check (public.is_dossier_member(dossier_id, 'treasurer'));

-- ---------------------------------------------------------------------------
-- Bucket privé receipts : 5 Mo, JPEG, PNG et WebP.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- WHY: l'envoi n'est permis que sur le chemin d'un reçu préparé et non rattaché du dossier,
-- par un trésorier : aucun chemin libre, aucun remplacement d'une photo déjà jointe. Le type et
-- la taille réels de l'objet sont bornés par le bucket (file_size_limit, allowed_mime_types) et
-- vérifiés côté serveur par la signature des octets avant la lecture par l'IA.
drop policy if exists receipts_insert on storage.objects;
create policy receipts_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and exists (
      select 1 from public.receipt r
       where r.storage_path = objects.name
         and r.entry_id is null
         and public.is_dossier_member(r.dossier_id, 'treasurer')
    )
  );

-- WHY: la sous-requête passe par la RLS de receipt : la photo se lit exactement quand la ligne
-- se lit (trésorier et plus avant rattachement, tout membre après). Une seule règle.
drop policy if exists receipts_select on storage.objects;
create policy receipts_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and exists (select 1 from public.receipt r where r.storage_path = objects.name)
  );
