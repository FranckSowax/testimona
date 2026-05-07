/*
  Warnings:

  - The primary key for the `funerals` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "funerals" DROP CONSTRAINT "funerals_pkey",
ADD PRIMARY KEY ("memorialIdFk");
