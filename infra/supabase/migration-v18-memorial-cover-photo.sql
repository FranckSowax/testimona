-- ============================================================================
-- Testimona — migration-v18-memorial-cover-photo.sql
-- Lets the memorial owner pick which photo is the cover / portrait (banner
-- background + round avatar). NULL = fall back to the first approved photo by
-- position (previous behaviour). Nullable → zero-downtime, no backfill.
-- Run in Supabase SQL Editor (service_role). Idempotent.
-- ============================================================================

ALTER TABLE "Memorial" ADD COLUMN IF NOT EXISTS "coverPhotoId" UUID;

-- If the chosen photo is deleted, fall back to the default automatically.
ALTER TABLE "Memorial"
  DROP CONSTRAINT IF EXISTS "Memorial_coverPhotoId_fkey";
ALTER TABLE "Memorial"
  ADD CONSTRAINT "Memorial_coverPhotoId_fkey"
  FOREIGN KEY ("coverPhotoId") REFERENCES "Photo"("id") ON DELETE SET NULL;
