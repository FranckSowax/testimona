/*
  Warnings:

  - Added the required column `title` to the `funeralEvents` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "funeralEvents" ADD COLUMN     "title" VARCHAR(500) NOT NULL;
