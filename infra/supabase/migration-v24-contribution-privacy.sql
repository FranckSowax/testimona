-- ============================================================================
-- Testimona — migration-v24-contribution-privacy.sql
-- Donors and shop contributors can give their real name (so the memorial
-- owner always sees who contributed) while choosing to appear as "Anonymous"
-- on public-facing lists. Shop contributors can also flag that they'd like to
-- receive a physical item in exchange for their contribution — the owner
-- follows up to arrange it (no address collection at this stage).
-- Run in Supabase SQL Editor (service_role). Idempotent.
-- ============================================================================

ALTER TABLE "Donation" ADD COLUMN IF NOT EXISTS "isAnonymous" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ShopContribution" ADD COLUMN IF NOT EXISTS "isAnonymous" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ShopContribution" ADD COLUMN IF NOT EXISTS "wantsItem"   BOOLEAN NOT NULL DEFAULT false;
