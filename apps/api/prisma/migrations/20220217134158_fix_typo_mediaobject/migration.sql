/*
  Warnings:

  - The values [Chapitre] on the enum `MediaObjectType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MediaObjectType_new" AS ENUM ('Chapter', 'MemorialBackground', 'MemorialProfile', 'Photo', 'Testimonial');
ALTER TABLE "photos" ALTER COLUMN "objectType" TYPE "MediaObjectType_new" USING ("objectType"::text::"MediaObjectType_new");
ALTER TYPE "MediaObjectType" RENAME TO "MediaObjectType_old";
ALTER TYPE "MediaObjectType_new" RENAME TO "MediaObjectType";
DROP TYPE "MediaObjectType_old";
COMMIT;
