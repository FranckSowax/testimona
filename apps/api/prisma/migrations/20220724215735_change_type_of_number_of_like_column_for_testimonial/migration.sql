/*
  Warnings:

  - The `numberOfLike` column on the `testimonials` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "testimonials" DROP COLUMN "numberOfLike",
ADD COLUMN     "numberOfLike" INTEGER NOT NULL DEFAULT 0;
