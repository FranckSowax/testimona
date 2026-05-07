-- AlterEnum
ALTER TYPE "HourPeriod" ADD VALUE 'Null';

-- AlterTable
ALTER TABLE "funeralEvents" ALTER COLUMN "endHour" DROP NOT NULL;
