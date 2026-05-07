/*
  Warnings:

  - A unique constraint covering the columns `[objectId]` on the table `photos` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `objectId` on the `photos` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "photos" DROP COLUMN "objectId",
ADD COLUMN     "objectId" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "photos_objectId_key" ON "photos"("objectId");
