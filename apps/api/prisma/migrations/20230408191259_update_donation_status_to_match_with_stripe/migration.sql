/*
  Warnings:

  - The values [Success,Failed] on the enum `DonationStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DonationStatus_new" AS ENUM ('Pending', 'Canceled', 'Processing', 'Requires_action', 'Requires_capture', 'Requires_confirmation', 'Requires_payment_method', 'Succeeded');
ALTER TABLE "donations" ALTER COLUMN "status" TYPE "DonationStatus_new" USING ("status"::text::"DonationStatus_new");
ALTER TYPE "DonationStatus" RENAME TO "DonationStatus_old";
ALTER TYPE "DonationStatus_new" RENAME TO "DonationStatus";
DROP TYPE "DonationStatus_old";
COMMIT;
