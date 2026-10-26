-- ============================================================================
-- Testimona — migration-v3-story-ads.sql
-- Adds: ambient music + per-photo duration support on the memorial story,
--       AdSpace table for the admin-managed advertising slots.
-- Run in Supabase SQL Editor (service_role). Idempotent (IF NOT EXISTS).
-- ============================================================================

-- 1. Memorial — ambient music URL (YouTube / Vimeo / direct audio URL)
ALTER TABLE "Memorial" ADD COLUMN IF NOT EXISTS "musicUrl" TEXT;

-- 2. Photo — optional per-photo slide duration (milliseconds). NULL = global default.
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "durationMs" INTEGER;

-- 3. AdSpace — admin-managed ad slots
CREATE TABLE IF NOT EXISTS "AdSpace" (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  slot         TEXT NOT NULL,
  -- "html" = inline HTML snippet (script-free, sanitized client-side),
  -- "image" = imageUrl + targetUrl pair.
  type         TEXT NOT NULL DEFAULT 'image',
  "imageUrl"   TEXT,
  "targetUrl"  TEXT,
  html         TEXT,
  "isActive"   BOOLEAN NOT NULL DEFAULT true,
  "startsAt"   TIMESTAMPTZ,
  "expiresAt"  TIMESTAMPTZ,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "AdSpace_slot_active_idx"
  ON "AdSpace" (slot, "isActive");

-- RLS: anonymous users can SELECT only active + currently in window ads;
--      admin role can do everything.
ALTER TABLE "AdSpace" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "adspace_select_active" ON "AdSpace";
CREATE POLICY "adspace_select_active"
  ON "AdSpace" FOR SELECT
  USING (
    "isActive" = true
    AND ("startsAt" IS NULL OR "startsAt" <= now())
    AND ("expiresAt" IS NULL OR "expiresAt" >= now())
  );

DROP POLICY IF EXISTS "adspace_admin_all" ON "AdSpace";
CREATE POLICY "adspace_admin_all"
  ON "AdSpace" FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
