/*
  Warnings:

  - Made the column `education` on table `biographies` required. This step will fail if there are existing NULL values in that column.
  - Made the column `hobbies` on table `biographies` required. This step will fail if there are existing NULL values in that column.
  - Made the column `homeCity` on table `biographies` required. This step will fail if there are existing NULL values in that column.
  - Made the column `nicknames` on table `biographies` required. This step will fail if there are existing NULL values in that column.
  - Made the column `placesLived` on table `biographies` required. This step will fail if there are existing NULL values in that column.
  - Made the column `religion` on table `biographies` required. This step will fail if there are existing NULL values in that column.
  - Made the column `work` on table `biographies` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "biographies" ALTER COLUMN "education" SET NOT NULL,
ALTER COLUMN "hobbies" SET NOT NULL,
ALTER COLUMN "homeCity" SET NOT NULL,
ALTER COLUMN "nicknames" SET NOT NULL,
ALTER COLUMN "placesLived" SET NOT NULL,
ALTER COLUMN "religion" SET NOT NULL,
ALTER COLUMN "work" SET NOT NULL;
