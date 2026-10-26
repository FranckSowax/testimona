-- V4.1 — Owner validation gate before clips go public.
-- Applied 2026-05-19 via Supabase MCP.

alter table "MemorialClip"
  add column if not exists "validatedAt" timestamptz;

create index if not exists memorialclip_validated_idx
  on "MemorialClip" ("memorialId", "validatedAt")
  where "validatedAt" is not null;

drop policy if exists memorialclip_select_public_ready on "MemorialClip";
create policy memorialclip_select_public_ready on "MemorialClip"
  for select using (
    status = 'ready' and "validatedAt" is not null and exists (
      select 1 from "Memorial" m
      where m.id = "MemorialClip"."memorialId" and m."isPublic" = true
    )
  );
