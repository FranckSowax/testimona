-- V6 — Memorial Shop: AI-generated visuals + wishlist + contributions.
-- Applied 2026-05-19 via Supabase MCP.

create table if not exists "MemorialVisual" (
  id uuid primary key default gen_random_uuid(),
  "memorialId" uuid not null references "Memorial"(id) on delete cascade,
  "sourcePhotoId" uuid references "Photo"(id) on delete set null,
  "imageUrl" text,
  "providerJobId" text,
  prompt text,
  status text not null default 'pending'
    check (status in ('pending','processing','ready','failed')),
  "errorMessage" text,
  "createdById" uuid not null references auth.users(id),
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists memorialvisual_memorial_status_idx
  on "MemorialVisual" ("memorialId", status);
create index if not exists memorialvisual_processing_idx
  on "MemorialVisual" (status, "createdAt")
  where status in ('pending','processing');
alter table "MemorialVisual" enable row level security;

drop policy if exists memorialvisual_select_public_ready on "MemorialVisual";
create policy memorialvisual_select_public_ready on "MemorialVisual"
  for select using (
    status = 'ready' and exists (
      select 1 from "Memorial" m
      where m.id = "MemorialVisual"."memorialId" and m."isPublic" = true
    )
  );
drop policy if exists memorialvisual_select_own on "MemorialVisual";
create policy memorialvisual_select_own on "MemorialVisual"
  for select using (
    exists (
      select 1 from "Memorial" m
      where m.id = "MemorialVisual"."memorialId" and m."ownerId" = auth.uid()
    )
  );

create table if not exists "MemorialShopItem" (
  id uuid primary key default gen_random_uuid(),
  "memorialId" uuid not null references "Memorial"(id) on delete cascade,
  "productId" text not null,
  "visualId" uuid references "MemorialVisual"(id) on delete set null,
  "targetQuantity" int not null check ("targetQuantity" > 0),
  "unitPriceCents" int not null check ("unitPriceCents" >= 0),
  "fundedCents" int not null default 0 check ("fundedCents" >= 0),
  notes text,
  position int not null default 0,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);
create index if not exists memorialshopitem_memorial_idx
  on "MemorialShopItem" ("memorialId", position);
alter table "MemorialShopItem" enable row level security;

drop policy if exists memorialshopitem_select_public on "MemorialShopItem";
create policy memorialshopitem_select_public on "MemorialShopItem"
  for select using (
    exists (
      select 1 from "Memorial" m
      where m.id = "MemorialShopItem"."memorialId" and m."isPublic" = true
    )
  );
drop policy if exists memorialshopitem_select_own on "MemorialShopItem";
create policy memorialshopitem_select_own on "MemorialShopItem"
  for select using (
    exists (
      select 1 from "Memorial" m
      where m.id = "MemorialShopItem"."memorialId" and m."ownerId" = auth.uid()
    )
  );

create table if not exists "ShopContribution" (
  id uuid primary key default gen_random_uuid(),
  "shopItemId" uuid not null references "MemorialShopItem"(id) on delete cascade,
  "donorId" uuid references auth.users(id) on delete set null,
  "donorName" text,
  "donorEmail" text,
  "amountCents" int not null check ("amountCents" > 0),
  message text,
  "stripeSessionId" text,
  status text not null default 'Succeeded'
    check (status in ('Processing','Succeeded','Refunded','Failed')),
  "createdAt" timestamptz not null default now()
);
create index if not exists shopcontribution_item_idx
  on "ShopContribution" ("shopItemId", "createdAt" desc);
alter table "ShopContribution" enable row level security;

drop policy if exists shopcontribution_select_public on "ShopContribution";
create policy shopcontribution_select_public on "ShopContribution"
  for select using (
    status = 'Succeeded' and exists (
      select 1 from "MemorialShopItem" si
      inner join "Memorial" m on m.id = si."memorialId"
      where si.id = "ShopContribution"."shopItemId" and m."isPublic" = true
    )
  );

create or replace function "applyShopContribution"()
returns trigger language plpgsql as $$
declare
  delta int := 0;
begin
  if (tg_op = 'INSERT' and new.status = 'Succeeded') then
    delta := new."amountCents";
  elsif (tg_op = 'UPDATE') then
    if old.status <> 'Succeeded' and new.status = 'Succeeded' then
      delta := new."amountCents";
    elsif old.status = 'Succeeded' and new.status <> 'Succeeded' then
      delta := -old."amountCents";
    end if;
  elsif (tg_op = 'DELETE' and old.status = 'Succeeded') then
    delta := -old."amountCents";
  end if;

  if delta <> 0 then
    update "MemorialShopItem"
       set "fundedCents" = greatest(0, "fundedCents" + delta),
           "updatedAt" = now()
     where id = coalesce(new."shopItemId", old."shopItemId");
  end if;
  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_apply_shop_contribution on "ShopContribution";
create trigger trg_apply_shop_contribution
  after insert or update or delete on "ShopContribution"
  for each row execute function "applyShopContribution"();
