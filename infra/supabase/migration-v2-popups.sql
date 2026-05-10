-- ============================================================================
-- Testimona — migration-v2-popups.sql
-- Ajoute les colonnes/table requises pour activer les popups V2 deferred :
-- BiographyEditPopup, FuneralsEditPopup, DonationsEditModal, MemorialAdminRequestPopup.
-- Exécution : Supabase SQL Editor → coller → Run. Idempotent (IF NOT EXISTS).
-- ============================================================================

-- 1. Biography — info fields (V2 spec p38)
ALTER TABLE "Biography" ADD COLUMN IF NOT EXISTS "username"     TEXT;
ALTER TABLE "Biography" ADD COLUMN IF NOT EXISTS "homeCity"     TEXT;
ALTER TABLE "Biography" ADD COLUMN IF NOT EXISTS "placesLived"  TEXT;
ALTER TABLE "Biography" ADD COLUMN IF NOT EXISTS "relatives"    TEXT;
ALTER TABLE "Biography" ADD COLUMN IF NOT EXISTS "religion"     TEXT;
ALTER TABLE "Biography" ADD COLUMN IF NOT EXISTS "education"    TEXT;
ALTER TABLE "Biography" ADD COLUMN IF NOT EXISTS "work"         TEXT;
ALTER TABLE "Biography" ADD COLUMN IF NOT EXISTS "hobby"        TEXT;

-- 2. Funeral — info description (V2 spec p42)
ALTER TABLE "Funeral" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- 3. Memorial — donation config (V2 spec p32 DonationsEditModal)
ALTER TABLE "Memorial" ADD COLUMN IF NOT EXISTS "donationCurrency" TEXT DEFAULT 'EUR';
ALTER TABLE "Memorial" ADD COLUMN IF NOT EXISTS "donationAbout"    TEXT;

-- 4. MemorialAdminRequest — admin request workflow (V2 spec p23)
CREATE TABLE IF NOT EXISTS "MemorialAdminRequest" (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "memorialId" UUID NOT NULL REFERENCES "Memorial"(id) ON DELETE CASCADE,
  "userId"     UUID NOT NULL,
  relationship TEXT NOT NULL,
  note         TEXT,
  status       TEXT NOT NULL DEFAULT 'pending',
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "MemorialAdminRequest_memorialId_idx" ON "MemorialAdminRequest"("memorialId");
CREATE INDEX IF NOT EXISTS "MemorialAdminRequest_userId_idx"     ON "MemorialAdminRequest"("userId");

-- RLS
ALTER TABLE "MemorialAdminRequest" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "MAR_select_own"     ON "MemorialAdminRequest";
DROP POLICY IF EXISTS "MAR_select_owner"   ON "MemorialAdminRequest";
DROP POLICY IF EXISTS "MAR_insert_authed"  ON "MemorialAdminRequest";

CREATE POLICY "MAR_select_own"
  ON "MemorialAdminRequest" FOR SELECT
  USING (auth.uid() = "userId");

CREATE POLICY "MAR_select_owner"
  ON "MemorialAdminRequest" FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Memorial"
      WHERE "Memorial".id = "MemorialAdminRequest"."memorialId"
        AND "Memorial"."ownerId" = auth.uid()
    )
  );

CREATE POLICY "MAR_insert_authed"
  ON "MemorialAdminRequest" FOR INSERT
  WITH CHECK (auth.uid() = "userId");

-- VÉRIFICATION
SELECT column_name FROM information_schema.columns
WHERE table_name = 'Biography' AND column_name IN ('username','homeCity','hobby');
SELECT column_name FROM information_schema.columns
WHERE table_name = 'Funeral' AND column_name = 'description';
SELECT column_name FROM information_schema.columns
WHERE table_name = 'Memorial' AND column_name IN ('donationCurrency','donationAbout');
