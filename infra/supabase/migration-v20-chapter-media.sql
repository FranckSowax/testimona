-- ============================================================================
-- Testimona — migration-v20-chapter-media.sql
-- Adds real photo/video attachments to biography chapters (previously a fake
-- client-side counter). Stored as a JSON array of { url, type } on Chapter.
-- Nullable/defaulted → zero-downtime, no backfill.
-- Run in Supabase SQL Editor (service_role). Idempotent.
-- ============================================================================

ALTER TABLE "Chapter" ADD COLUMN IF NOT EXISTS "media" JSONB NOT NULL DEFAULT '[]'::jsonb;
