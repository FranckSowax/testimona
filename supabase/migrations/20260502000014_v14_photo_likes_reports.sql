-- V14 — Photo engagement: likes + reports, so visitors can like/report photos
-- like they do testimonials (recette PDF 2026-06-07 p26 "ajouter en bas des
-- photos les mêmes options que les témoignages: commenter, partager, liker,
-- report"). Comments are handled in a later iteration.

create table if not exists "PhotoLike" (
  id        uuid primary key default gen_random_uuid(),
  "photoId" uuid not null references "Photo"(id) on delete cascade,
  "userId"  uuid not null,
  "createdAt" timestamptz not null default now(),
  unique ("photoId", "userId")
);
create index if not exists "PhotoLike_photoId_idx" on "PhotoLike"("photoId");

create table if not exists "PhotoReport" (
  id          uuid primary key default gen_random_uuid(),
  "photoId"   uuid not null references "Photo"(id) on delete cascade,
  "reporterId" uuid,
  reason      text not null,
  status      text not null default 'open',
  "createdAt" timestamptz not null default now()
);
create index if not exists "PhotoReport_photoId_idx" on "PhotoReport"("photoId");

alter table "PhotoLike" enable row level security;
alter table "PhotoReport" enable row level security;

drop policy if exists photolike_select_public on "PhotoLike";
create policy photolike_select_public on "PhotoLike" for select using (true);
