-- Lot 3, suivi de la PR 3 : le numéro WhatsApp d'un prestataire ne se lit plus par l'API.
-- Spec : docs/superpowers/specs/2026-10-28-lot-3-funerailles-design.md, § Demande de devis.
--
-- WHY: Postgres ne filtre pas les colonnes avec la RLS, seulement les lignes. `provider_select`
-- laissait tout utilisateur connecté lire `whatsapp` sans tracer de demande de devis. On retire
-- la lecture de la table, puis on rend les seules colonnes sans numéro (même méthode que
-- 20261027000100). Une colonne ajoutée plus tard ne sera pas lisible par défaut.
-- Les administrateurs lisent le numéro par le client service-role, côté serveur, après
-- vérification de leur rôle. Insertion et modification ne changent pas (RLS `is_admin()`).

revoke select on table public.provider from authenticated;

grant select (
  id,
  category_key,
  name,
  city,
  district,
  price_note,
  is_example,
  verified_at,
  active,
  created_at,
  updated_at
) on table public.provider to authenticated;

-- ---------------------------------------------------------------------------
-- request_quote : seule sortie du numéro pour une famille.
-- WHY: la trace et le numéro vont ensemble, dans une seule transaction ; une demande refusée
-- n'en donne aucun. Mêmes contrôles et même ordre que le trigger `quote_request_before_insert`
-- (42501 puis TL010 ; 28000 avant, sans utilisateur, comme les autres RPC). Le trigger
-- s'exécute aussi à l'insertion et impose auteur, date et nom.
-- La lecture est tracée, pas confidentielle : un coordinateur peut obtenir chaque numéro vérifié,
-- une demande tracée à la fois. Aucune limite de débit dans ce lot.
-- `for share` empêche une désactivation concurrente entre la lecture du numéro et l'insertion.
-- ---------------------------------------------------------------------------
create function public.request_quote(
  p_dossier_id uuid,
  p_provider_id uuid,
  p_step_id text,
  p_message text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  reachable_number text;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  if not public.is_dossier_member(p_dossier_id, 'coordinator') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select p.whatsapp into reachable_number
  from public.provider p
  where p.id = p_provider_id and p.active and not p.is_example
    and p.whatsapp is not null and p.verified_at is not null
  for share;
  if reachable_number is null then
    raise exception 'provider not reachable' using errcode = 'TL010';
  end if;
  insert into public.quote_request (dossier_id, provider_id, step_id, message)
  values (p_dossier_id, p_provider_id, p_step_id, p_message);
  return reachable_number;
end;
$$;

revoke execute on function public.request_quote(uuid, uuid, text, text) from public, anon;
grant execute on function public.request_quote(uuid, uuid, text, text) to authenticated;
