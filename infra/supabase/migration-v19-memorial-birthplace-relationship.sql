-- ============================================================================
-- Testimona — migration-v19-memorial-birthplace-relationship.sql
-- Persist the memorial-creation fields that the form collected but previously
-- dropped: place of birth/death and the creator's relationship to the deceased.
-- All nullable → zero-downtime, no backfill.
-- Run in Supabase SQL Editor (service_role). Idempotent.
-- ============================================================================

ALTER TABLE "Memorial" ADD COLUMN IF NOT EXISTS "birthCountry" TEXT;
ALTER TABLE "Memorial" ADD COLUMN IF NOT EXISTS "birthCity"    TEXT;
ALTER TABLE "Memorial" ADD COLUMN IF NOT EXISTS "deathCountry" TEXT;
ALTER TABLE "Memorial" ADD COLUMN IF NOT EXISTS "deathCity"    TEXT;
ALTER TABLE "Memorial" ADD COLUMN IF NOT EXISTS "relationship" TEXT;
