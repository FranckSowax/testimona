-- ============================================================================
-- Baseline : tables créées à l origine par Prisma (packages/database, supprimé).
-- Généré le 2026-10-26 avec :
--   prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
-- Les migrations suivantes (v2 à v24) étaient appliquées à la main sur Supabase.
-- À CONFRONTER à la base de production (supabase db diff) avant tout db push.
-- ============================================================================

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Memorial" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "ownerId" UUID NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "nickname" TEXT,
    "birthDate" DATE,
    "deathDate" DATE,
    "language" TEXT NOT NULL DEFAULT 'fr',
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "coverPhotoId" UUID,
    "portraitUrl" TEXT,
    "coverUrl" TEXT,
    "birthCountry" TEXT,
    "birthCity" TEXT,
    "deathCountry" TEXT,
    "deathCity" TEXT,
    "relationship" TEXT,
    "donationGoalCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Memorial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" UUID NOT NULL,
    "memorialId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "authorName" TEXT NOT NULL,
    "relationship" TEXT,
    "message" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'fr',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestimonialLike" (
    "testimonialId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestimonialLike_pkey" PRIMARY KEY ("testimonialId","userId")
);

-- CreateTable
CREATE TABLE "TestimonialComment" (
    "id" UUID NOT NULL,
    "testimonialId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "authorName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestimonialComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestimonialReport" (
    "id" UUID NOT NULL,
    "testimonialId" UUID NOT NULL,
    "reporterId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TestimonialReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Photo" (
    "id" UUID NOT NULL,
    "memorialId" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Biography" (
    "id" UUID NOT NULL,
    "memorialId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Biography_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemorialFavorite" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "memorialId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemorialFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" UUID NOT NULL,
    "biographyId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "media" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" UUID NOT NULL,
    "memorialId" UUID NOT NULL,
    "donorId" UUID,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" TEXT NOT NULL DEFAULT 'Processing',
    "stripeSessionId" TEXT,
    "donorName" TEXT,
    "donorEmail" TEXT,
    "message" TEXT,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Funeral" (
    "id" UUID NOT NULL,
    "memorialId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Funeral_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuneralEvent" (
    "id" UUID NOT NULL,
    "funeralId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT,
    "hour" TEXT,
    "url" TEXT,
    "note" TEXT,
    "location" TEXT,
    "address" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuneralEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Memorial_slug_key" ON "Memorial"("slug");

-- CreateIndex
CREATE INDEX "Memorial_ownerId_idx" ON "Memorial"("ownerId");

-- CreateIndex
CREATE INDEX "Memorial_isPublic_idx" ON "Memorial"("isPublic");

-- CreateIndex
CREATE INDEX "Testimonial_memorialId_idx" ON "Testimonial"("memorialId");

-- CreateIndex
CREATE INDEX "TestimonialLike_testimonialId_idx" ON "TestimonialLike"("testimonialId");

-- CreateIndex
CREATE INDEX "TestimonialLike_userId_idx" ON "TestimonialLike"("userId");

-- CreateIndex
CREATE INDEX "TestimonialComment_testimonialId_idx" ON "TestimonialComment"("testimonialId");

-- CreateIndex
CREATE INDEX "TestimonialReport_testimonialId_idx" ON "TestimonialReport"("testimonialId");

-- CreateIndex
CREATE INDEX "TestimonialReport_reporterId_idx" ON "TestimonialReport"("reporterId");

-- CreateIndex
CREATE INDEX "Photo_memorialId_position_idx" ON "Photo"("memorialId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Biography_memorialId_key" ON "Biography"("memorialId");

-- CreateIndex
CREATE INDEX "MemorialFavorite_userId_createdAt_idx" ON "MemorialFavorite"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MemorialFavorite_userId_memorialId_key" ON "MemorialFavorite"("userId", "memorialId");

-- CreateIndex
CREATE INDEX "Chapter_biographyId_position_idx" ON "Chapter"("biographyId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Donation_stripeSessionId_key" ON "Donation"("stripeSessionId");

-- CreateIndex
CREATE INDEX "Donation_memorialId_idx" ON "Donation"("memorialId");

-- CreateIndex
CREATE INDEX "Donation_donorId_idx" ON "Donation"("donorId");

-- CreateIndex
CREATE UNIQUE INDEX "Funeral_memorialId_key" ON "Funeral"("memorialId");

-- CreateIndex
CREATE INDEX "FuneralEvent_funeralId_position_idx" ON "FuneralEvent"("funeralId", "position");

-- AddForeignKey
ALTER TABLE "Testimonial" ADD CONSTRAINT "Testimonial_memorialId_fkey" FOREIGN KEY ("memorialId") REFERENCES "Memorial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestimonialLike" ADD CONSTRAINT "TestimonialLike_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "Testimonial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestimonialComment" ADD CONSTRAINT "TestimonialComment_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "Testimonial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestimonialReport" ADD CONSTRAINT "TestimonialReport_testimonialId_fkey" FOREIGN KEY ("testimonialId") REFERENCES "Testimonial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_memorialId_fkey" FOREIGN KEY ("memorialId") REFERENCES "Memorial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Biography" ADD CONSTRAINT "Biography_memorialId_fkey" FOREIGN KEY ("memorialId") REFERENCES "Memorial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemorialFavorite" ADD CONSTRAINT "MemorialFavorite_memorialId_fkey" FOREIGN KEY ("memorialId") REFERENCES "Memorial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_biographyId_fkey" FOREIGN KEY ("biographyId") REFERENCES "Biography"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_memorialId_fkey" FOREIGN KEY ("memorialId") REFERENCES "Memorial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Funeral" ADD CONSTRAINT "Funeral_memorialId_fkey" FOREIGN KEY ("memorialId") REFERENCES "Memorial"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuneralEvent" ADD CONSTRAINT "FuneralEvent_funeralId_fkey" FOREIGN KEY ("funeralId") REFERENCES "Funeral"("id") ON DELETE CASCADE ON UPDATE CASCADE;

