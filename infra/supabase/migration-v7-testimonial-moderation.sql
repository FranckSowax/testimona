-- V7 — Testimonials open to anonymous posts + admin moderation.
-- Applied 2026-05-19 via Supabase MCP.

alter table "Testimonial"
  add column if not exists "authorFirstname" text,
  add column if not exists "authorEmail" text,
  add column if not exists status text not null default 'approved'
    check (status in ('pending','approved','rejected')),
  add column if not exists "moderatedAt" timestamptz,
  add column if not exists "moderatedById" uuid references auth.users(id);

create index if not exists testimonial_status_idx
  on "Testimonial" (status, "createdAt" desc);
create index if not exists testimonial_memorial_status_idx
  on "Testimonial" ("memorialId", status, "createdAt" desc);

alter table "Testimonial" alter column "authorId" drop not null;

drop policy if exists testimonial_select_all on "Testimonial";
drop policy if exists testimonial_select_anon on "Testimonial";
drop policy if exists testimonial_select_public on "Testimonial";
drop policy if exists testimonial_select_approved_public on "Testimonial";

create policy testimonial_select_approved_public on "Testimonial"
  for select using (
    status = 'approved' and exists (
      select 1 from "Memorial" m
      where m.id = "Testimonial"."memorialId" and m."isPublic" = true
    )
  );

drop policy if exists testimonial_select_own_memorial on "Testimonial";
create policy testimonial_select_own_memorial on "Testimonial"
  for select using (
    exists (
      select 1 from "Memorial" m
      where m.id = "Testimonial"."memorialId" and m."ownerId" = auth.uid()
    )
  );

drop policy if exists testimonial_select_own_author on "Testimonial";
create policy testimonial_select_own_author on "Testimonial"
  for select using ("authorId" = auth.uid());
