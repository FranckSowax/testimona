/*
  Warnings:

  - The values [Done,Deleted] on the enum `MemorialRequestAdminStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "MemorialRequestAdminStatus_new" AS ENUM ('Pending', 'Accepted', 'Rejected');
ALTER TABLE "memorialRequestAdmin" ALTER COLUMN "status" TYPE "MemorialRequestAdminStatus_new" USING ("status"::text::"MemorialRequestAdminStatus_new");
ALTER TYPE "MemorialRequestAdminStatus" RENAME TO "MemorialRequestAdminStatus_old";
ALTER TYPE "MemorialRequestAdminStatus_new" RENAME TO "MemorialRequestAdminStatus";
DROP TYPE "MemorialRequestAdminStatus_old";
COMMIT;
