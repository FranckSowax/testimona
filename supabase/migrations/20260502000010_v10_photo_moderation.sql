-- V10 — Photo moderation: anyone can submit, owner approves.
-- Applied 2026-05-19 via Supabase MCP.

alter table "Photo"
  add column if not exists status text not null default 'approved'
    check (status in ('pending','approved','rejected')),
  add column if not exists "submittedById" uuid references auth.users(id) on delete set null,
  add column if not exists "submittedByName" text,
  add column if not exists "submittedByEmail" text,
  add column if not exists "moderatedAt" timestamptz,
  add column if not exists "moderatedById" uuid references auth.users(id);

create index if not exists photo_memorial_status_idx
  on "Photo" ("memorialId", status, position);

drop policy if exists photo_select_public on "Photo";
drop policy if exists photo_select_approved_public on "Photo";
create policy photo_select_approved_public on "Photo"
  for select using (
    status = 'approved' and exists (
      select 1 from "Memorial" m
      where m.id = "Photo"."memorialId" and m."isPublic" = true
    )
  );

drop policy if exists photo_select_own_memorial on "Photo";
create policy photo_select_own_memorial on "Photo"
  for select using (
    exists (
      select 1 from "Memorial" m
      where m.id = "Photo"."memorialId" and m."ownerId" = auth.uid()
    )
  );

drop policy if exists photo_select_own_submission on "Photo";
create policy photo_select_own_submission on "Photo"
  for select using ("submittedById" = auth.uid());
