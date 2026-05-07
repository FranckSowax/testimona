/*
  Warnings:

  - You are about to drop the column `orderId` on the `mailLogs` table. All the data in the column will be lost.
  - Added the required column `memorialId` to the `mailLogs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "mailLogs" DROP COLUMN "orderId",
ADD COLUMN     "memorialId" VARCHAR(100) NOT NULL;
