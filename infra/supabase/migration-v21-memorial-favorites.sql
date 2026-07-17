-- ============================================================================
-- Testimona — migration-v21-memorial-favorites.sql
-- Per-account memorial favorites (heart). Replaces the previous device-only
-- localStorage list so any logged-in user can favorite a memorial and find it
-- again in "My memorials". Written via the service-role client after an auth
-- check, so no RLS policy is required here.
-- Run in Supabase SQL Editor (service_role). Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS "MemorialFavorite" (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"     UUID NOT NULL,
  "memorialId" UUID NOT NULL REFERENCES "Memorial"(id) ON DELETE CASCADE,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE ("userId", "memorialId")
);

CREATE INDEX IF NOT EXISTS "MemorialFavorite_user_idx"
  ON "MemorialFavorite" ("userId", "createdAt" DESC);
