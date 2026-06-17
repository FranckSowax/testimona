-- V16 — Comments under photos (recette PDF p26 — completes P3 alongside the
-- like/share/report shipped in v14). Account required to post (T7).

create table if not exists "PhotoComment" (
  id          uuid primary key default gen_random_uuid(),
  "photoId"   uuid not null references "Photo"(id) on delete cascade,
  "authorId"  uuid not null,
  "authorName" text not null,
  message     text not null,
  "createdAt" timestamptz not null default now()
);
create index if not exists "PhotoComment_photoId_idx" on "PhotoComment"("photoId");

alter table "PhotoComment" enable row level security;

drop policy if exists photocomment_select_public on "PhotoComment";
create policy photocomment_select_public on "PhotoComment" for select using (true);
