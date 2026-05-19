-- V5 — Studia (compute) balance + per-clip provider cost.
-- Applied 2026-05-19 via Supabase MCP.

create table if not exists "StudiaBalance" (
  id int primary key default 1 check (id = 1),
  balance numeric(12,2) not null default 0,
  "updatedAt" timestamptz not null default now()
);
insert into "StudiaBalance" (id, balance) values (1, 0)
on conflict (id) do nothing;
alter table "StudiaBalance" enable row level security;

create table if not exists "StudiaTransaction" (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12,2) not null,
  type text not null check (type in ('topup','spend','refund','adjust')),
  "memorialClipId" uuid references "MemorialClip"(id) on delete set null,
  note text,
  "createdAt" timestamptz not null default now()
);
create index if not exists studiatx_created_idx on "StudiaTransaction" ("createdAt" desc);
alter table "StudiaTransaction" enable row level security;

create or replace function "applyStudiaTransaction"()
returns trigger language plpgsql as $$
begin
  update "StudiaBalance"
     set balance = greatest(0, balance + new.amount),
         "updatedAt" = now()
   where id = 1;
  return new;
end;
$$;
drop trigger if exists trg_apply_studia_tx on "StudiaTransaction";
create trigger trg_apply_studia_tx
  after insert on "StudiaTransaction"
  for each row execute function "applyStudiaTransaction"();

alter table "MemorialClip"
  add column if not exists "providerCreditCost" numeric(12,2) default 0;
