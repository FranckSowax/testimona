-- ============================================================================
-- Testimona — migration-v17-uuid-defaults.sql
-- Root cause fix for repeated `null value in column "id"/"updatedAt"` errors.
--
-- The base tables were created by Prisma `db push`. Prisma turns literal /
-- now() defaults into Postgres column defaults, but its *functional* defaults
-- (@default(uuid()) and the @updatedAt attribute) are applied by Prisma Client
-- only — the Postgres columns have NO default. Any insert that bypasses Prisma
-- Client (all our supabase-js inserts) and omits id / updatedAt therefore fails
-- the NOT NULL constraint.
--
-- The app now supplies these values explicitly, but restoring the DB defaults
-- makes the schema self-consistent and immune to future inserts that forget.
--
-- Run in Supabase SQL Editor (service_role). Idempotent.
-- ============================================================================

-- id defaults for every Prisma-created base table (uuid columns)
ALTER TABLE "Memorial"           ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Testimonial"        ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "TestimonialComment" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "TestimonialReport"  ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Photo"              ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Biography"          ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Chapter"            ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Donation"           ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "Funeral"            ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
ALTER TABLE "FuneralEvent"       ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Memorial.updatedAt has no DB default (Prisma @updatedAt). Give it one so an
-- omitted insert can't violate NOT NULL. (Row-level bumping on UPDATE is still
-- handled by the application.)
ALTER TABLE "Memorial" ALTER COLUMN "updatedAt" SET DEFAULT now();
