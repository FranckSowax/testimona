/*
  Warnings:

  - You are about to drop the column `liked` on the `testimonials` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "testimonials" DROP COLUMN "liked",
ADD COLUMN     "numberOfLike" BOOLEAN NOT NULL DEFAULT false;
