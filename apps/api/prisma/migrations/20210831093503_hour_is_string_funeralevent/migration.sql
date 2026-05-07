/*
  Warnings:

  - The `endHour` column on the `funeralEvents` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `startHour` on the `funeralEvents` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "funeralEvents" DROP COLUMN "startHour",
ADD COLUMN     "startHour" VARCHAR(5) NOT NULL,
DROP COLUMN "endHour",
ADD COLUMN     "endHour" VARCHAR(5);
