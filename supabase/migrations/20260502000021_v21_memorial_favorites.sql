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

-- RLS — without this the table is wide open to the public anon key via
-- PostgREST (every other table in this project enables RLS). Favorites are
-- private: only their owner can read them. Writes go through the service-role
-- client in toggleFavoriteAction (bypasses RLS); the self policies below are
-- defense-in-depth should a user-scoped write ever be added.
ALTER TABLE "MemorialFavorite" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "memorial_favorite_select_self" ON "MemorialFavorite";
CREATE POLICY "memorial_favorite_select_self" ON "MemorialFavorite"
  FOR SELECT
  USING (auth.uid()::text = "userId"::text OR public.is_admin());

DROP POLICY IF EXISTS "memorial_favorite_insert_self" ON "MemorialFavorite";
CREATE POLICY "memorial_favorite_insert_self" ON "MemorialFavorite"
  FOR INSERT
  WITH CHECK (auth.uid()::text = "userId"::text);

DROP POLICY IF EXISTS "memorial_favorite_delete_self" ON "MemorialFavorite";
CREATE POLICY "memorial_favorite_delete_self" ON "MemorialFavorite"
  FOR DELETE
  USING (auth.uid()::text = "userId"::text OR public.is_admin());
