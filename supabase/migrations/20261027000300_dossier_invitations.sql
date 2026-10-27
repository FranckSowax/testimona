-- ============================================================================
-- Lot 1 · PR 1 — invitations à rejoindre un dossier, par lien à usage unique.
-- Seule l'empreinte SHA-256 du jeton est stockée ; le jeton circule dans le lien.
-- ============================================================================

create table public.dossier_invitation (
  id uuid primary key default gen_random_uuid(),
  dossier_id uuid not null references public.dossier (id) on delete cascade,
  role public.dossier_role not null check (role <> 'owner'),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz,
  used_by uuid references auth.users (id) on delete set null
);

create index dossier_invitation_dossier_id_idx on public.dossier_invitation (dossier_id);

alter table public.dossier_invitation enable row level security;
revoke all on public.dossier_invitation from anon;

create policy dossier_invitation_select on public.dossier_invitation
  for select to authenticated
  using (public.is_dossier_member(dossier_id, 'coordinator'));

create policy dossier_invitation_insert on public.dossier_invitation
  for insert to authenticated
  with check (public.is_dossier_member(dossier_id, 'coordinator') and created_by = auth.uid());

create policy dossier_invitation_delete on public.dossier_invitation
  for delete to authenticated
  using (public.is_dossier_member(dossier_id, 'coordinator'));

-- ---------------------------------------------------------------------------
-- Acceptation. Codes d'erreur : TI001 jeton inconnu, TI002 expiré, TI003 déjà
-- utilisé, 28000 non connecté.
-- WHY: security definer, car l'invité n'est pas encore membre et ne peut ni lire
-- l'invitation ni s'ajouter lui-même ; la fonction fait ces vérifications.
-- ---------------------------------------------------------------------------
create function public.accept_dossier_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_inv public.dossier_invitation;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select *
    into v_inv
    from public.dossier_invitation
   where token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
     for update;

  if not found then
    raise exception 'invitation invalid' using errcode = 'TI001';
  end if;
  if v_inv.used_at is not null then
    raise exception 'invitation already used' using errcode = 'TI003';
  end if;
  if v_inv.expires_at < now() then
    raise exception 'invitation expired' using errcode = 'TI002';
  end if;

  insert into public.dossier_member (dossier_id, user_id, role)
  values (v_inv.dossier_id, v_uid, v_inv.role)
  on conflict (dossier_id, user_id) do update
    set role = excluded.role
    where public.dossier_role_rank(public.dossier_member.role) < public.dossier_role_rank(excluded.role);

  update public.dossier_invitation
     set used_at = now(), used_by = v_uid
   where id = v_inv.id;

  return v_inv.dossier_id;
end;
$$;

revoke execute on function public.accept_dossier_invitation(text) from public, anon;
grant execute on function public.accept_dossier_invitation(text) to authenticated;
