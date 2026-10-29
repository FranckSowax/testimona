-- Lot 3, PR 3 : nom du prestataire figé dans la demande de devis.
-- WHY: la RLS cache un prestataire désactivé aux familles ; l'historique « Devis demandés » doit
-- pourtant le nommer. Le trigger, security definer, lit le nom au moment de la demande.

-- WHY: le défaut '' garde la colonne facultative à l'insertion dans les types générés ; le trigger
-- l'écrase toujours par le nom réel. Les lignes existantes sont remplies avant not null.
alter table public.quote_request add column provider_name text default '';

update public.quote_request q
set provider_name = p.name
from public.provider p
where p.id = q.provider_id;

alter table public.quote_request alter column provider_name set not null;

create or replace function public.quote_request_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reachable_name text;
begin
  if not public.is_dossier_member(new.dossier_id, 'coordinator') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select p.name into reachable_name
  from public.provider p
  where p.id = new.provider_id and p.active and not p.is_example
    and p.whatsapp is not null and p.verified_at is not null;
  if reachable_name is null then
    raise exception 'provider not reachable' using errcode = 'TL010';
  end if;
  new.provider_name := reachable_name;
  new.created_by := auth.uid();
  new.created_at := now();
  return new;
end;
$$;

revoke execute on function public.quote_request_before_insert() from public, anon, authenticated;
