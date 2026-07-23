-- ============================================================================
-- Testimona — migration-v23-memorial-portrait-cover.sql
-- Client recette: the memorial's portrait (round miniature) and cover (banner)
-- must be uploadable directly from the create/edit modal, independently of the
-- Photos gallery. Two dedicated URL columns; NULL = fall back to the previous
-- behaviour (coverPhotoId star choice, then first gallery photo).
-- Run in Supabase SQL Editor (service_role). Idempotent.
-- ============================================================================

ALTER TABLE "Memorial" ADD COLUMN IF NOT EXISTS "portraitUrl" TEXT;
ALTER TABLE "Memorial" ADD COLUMN IF NOT EXISTS "coverUrl"    TEXT;
