/*
  Warnings:

  - The values [Relative] on the enum `Relative` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Relative_new" AS ENUM ('Parent', 'Spouse', 'Partner', 'Child', 'Family', 'Friend', 'Colleague', 'Other', 'DoNotWishToDisclose', 'Undefined');
ALTER TABLE "memorialRequestAdmin" ALTER COLUMN "relationship" TYPE "Relative_new" USING ("relationship"::text::"Relative_new");
ALTER TABLE "memorialUserRelationship" ALTER COLUMN "relationship" TYPE "Relative_new" USING ("relationship"::text::"Relative_new");
ALTER TYPE "Relative" RENAME TO "Relative_old";
ALTER TYPE "Relative_new" RENAME TO "Relative";
DROP TYPE "Relative_old";
COMMIT;
