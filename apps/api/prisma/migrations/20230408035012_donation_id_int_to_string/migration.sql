/*
  Warnings:

  - The primary key for the `donations` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "donations" DROP CONSTRAINT "donations_pkey",
ALTER COLUMN "donationId" SET DATA TYPE TEXT,
ADD CONSTRAINT "donations_pkey" PRIMARY KEY ("donationId");
