/*
  Warnings:

  - The primary key for the `memorialRequestAdmin` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "memorialRequestAdmin" DROP CONSTRAINT "memorialRequestAdmin_pkey",
ALTER COLUMN "memorialRequestAdminId" DROP DEFAULT,
ALTER COLUMN "memorialRequestAdminId" SET DATA TYPE TEXT,
ADD CONSTRAINT "memorialRequestAdmin_pkey" PRIMARY KEY ("memorialRequestAdminId");
DROP SEQUENCE "memorialRequestAdmin_memorialRequestAdminId_seq";
