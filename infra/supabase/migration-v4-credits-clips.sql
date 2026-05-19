-- ============================================================
-- V4 — Credits system + Higgsfield-backed MemorialClip
-- Applied 2026-05-19 via Supabase MCP.
-- ============================================================

-- UserCredit (snapshot)
create table if not exists "UserCredit" (
  "userId" uuid primary key references auth.users(id) on delete cascade,
  balance int not null default 0 check (balance >= 0),
  "updatedAt" timestamptz not null default now()
);
alter table "UserCredit" enable row level security;
drop policy if exists usercredit_select_own on "UserCredit";
create policy usercredit_select_own on "UserCredit"
  for select using (auth.uid() = "userId");

-- CreditTransaction (ledger)
create table if not exists "CreditTransaction" (
  id uuid primary key default gen_random_uuid(),
  "userId" uuid not null references auth.users(id) on delete cascade,
  amount int not null,
  type text not null check (type in ('purchase','spend','refund','admin_grant','demo_grant')),
  "stripePaymentId" text,
  "memorialClipId" uuid,
  note text,
  "createdAt" timestamptz not null default now()
);
create index if not exists credittransaction_user_created_idx
  on "CreditTransaction" ("userId", "createdAt" desc);
alter table "CreditTransaction" enable row level security;
drop policy if exists credittransaction_select_own on "CreditTransaction";
create policy credittransaction_select_own on "CreditTransaction"
  for select using (auth.uid() = "userId");

-- MemorialClip
create table if not exists "MemorialClip" (
  id uuid primary key default gen_random_uuid(),
  "memorialId" uuid not null references "Memorial"(id) on delete cascade,
  "photoId" uuid not null references "Photo"(id) on delete cascade,
  caption text,
  "captionSource" text check ("captionSource" in ('testimonial','free')),
  "testimonialId" uuid references "Testimonial"(id),
  "higgsfieldJobId" text,
  "videoUrl" text,
  "durationMs" int not null default 6000,
  status text not null default 'pending'
    check (status in ('pending','processing','ready','failed')),
  "errorMessage" text,
  "creditCost" int not null default 1,
  "createdById" uuid not null references auth.users(id),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists memorialclip_memorial_status_idx on "MemorialClip" ("memorialId", status);
create index if not exists memorialclip_processing_idx on "MemorialClip" (status, "createdAt")
  where status in ('pending','processing');
alter table "MemorialClip" enable row level security;
drop policy if exists memorialclip_select_public_ready on "MemorialClip";
create policy memorialclip_select_public_ready on "MemorialClip"
  for select using (
    status = 'ready' and exists (
      select 1 from "Memorial" m
      where m.id = "MemorialClip"."memorialId" and m."isPublic" = true
    )
  );
drop policy if exists memorialclip_select_own on "MemorialClip";
create policy memorialclip_select_own on "MemorialClip"
  for select using (
    exists (
      select 1 from "Memorial" m
      where m.id = "MemorialClip"."memorialId" and m."ownerId" = auth.uid()
    )
  );

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('memorial-clips', 'memorial-clips', true)
on conflict (id) do nothing;
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects' and policyname='memorial_clips_public_read'
  ) then
    create policy memorial_clips_public_read on storage.objects
      for select using (bucket_id = 'memorial-clips');
  end if;
end$$;

-- Triggers
insert into "UserCredit" ("userId", balance)
select id, 0 from auth.users
on conflict ("userId") do nothing;

create or replace function "applyCreditTransaction"()
returns trigger language plpgsql as $$
begin
  insert into "UserCredit" ("userId", balance, "updatedAt")
  values (new."userId", greatest(0, new.amount), now())
  on conflict ("userId") do update
    set balance = greatest(0, "UserCredit".balance + new.amount),
        "updatedAt" = now();
  return new;
end;
$$;
drop trigger if exists trg_apply_credit_tx on "CreditTransaction";
create trigger trg_apply_credit_tx
  after insert on "CreditTransaction"
  for each row execute function "applyCreditTransaction"();

create or replace function "initUserCredit"()
returns trigger language plpgsql security definer as $$
begin
  insert into "UserCredit" ("userId", balance) values (new.id, 0)
  on conflict ("userId") do nothing;
  return new;
end;
$$;
drop trigger if exists trg_init_user_credit on auth.users;
create trigger trg_init_user_credit
  after insert on auth.users
  for each row execute function "initUserCredit"();
