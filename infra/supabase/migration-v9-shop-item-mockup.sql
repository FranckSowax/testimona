-- V9 — Per-shop-item AI mockup pipeline.
-- Applied 2026-05-19 via Supabase MCP.

alter table "MemorialShopItem"
  add column if not exists "mockupImageUrl" text,
  add column if not exists "mockupJobId" text,
  add column if not exists "mockupStatus" text not null default 'skipped'
    check ("mockupStatus" in ('skipped','pending','processing','ready','failed')),
  add column if not exists "mockupErrorMessage" text;

create index if not exists memorialshopitem_mockup_processing_idx
  on "MemorialShopItem" ("mockupStatus", "createdAt")
  where "mockupStatus" in ('pending','processing');
