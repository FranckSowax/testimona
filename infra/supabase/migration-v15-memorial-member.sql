-- V15 — Co-ownership of a memorial (recette PDF 2026-06-07 p4 §3 "avoir plus
-- qu'un propriétaire ... courriel et notification de demande, choix d'approuver
-- ou rejeter"). A MemorialMember row grants management rights once accepted.

create table if not exists "MemorialMember" (
  id            uuid primary key default gen_random_uuid(),
  "memorialId"  uuid not null references "Memorial"(id) on delete cascade,
  "userId"      uuid,
  "invitedEmail" text,
  role          text not null default 'admin',
  status        text not null default 'pending',
  "invitedById" uuid,
  "createdAt"   timestamptz not null default now(),
  "updatedAt"   timestamptz not null default now()
);

create unique index if not exists "MemorialMember_memorial_user_key"
  on "MemorialMember"("memorialId", "userId")
  where "userId" is not null;
create index if not exists "MemorialMember_userId_idx" on "MemorialMember"("userId");
create index if not exists "MemorialMember_email_idx" on "MemorialMember"(lower("invitedEmail"));

alter table "MemorialMember" enable row level security;

drop policy if exists memorialmember_select_self on "MemorialMember";
create policy memorialmember_select_self on "MemorialMember"
  for select using (
    "userId" = auth.uid()
    or exists (
      select 1 from "Memorial" m
       where m.id = "MemorialMember"."memorialId" and m."ownerId" = auth.uid()
    )
  );
