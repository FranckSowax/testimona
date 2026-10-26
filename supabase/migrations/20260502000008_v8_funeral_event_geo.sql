-- V8 — Funeral event geo: address + lat/lng for Google Maps embed.
-- Applied 2026-05-19 via Supabase MCP.

alter table "FuneralEvent"
  add column if not exists address text,
  add column if not exists latitude numeric(10,7),
  add column if not exists longitude numeric(10,7);

drop policy if exists funeralevent_select_public on "FuneralEvent";
create policy funeralevent_select_public on "FuneralEvent"
  for select using (
    exists (
      select 1
        from "Funeral" f
        inner join "Memorial" m on m.id = f."memorialId"
       where f.id = "FuneralEvent"."funeralId"
         and (m."isPublic" = true or m."ownerId" = auth.uid())
    )
  );
