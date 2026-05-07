-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('Pending', 'Success', 'Failed');

-- CreateTable
CREATE TABLE "donations" (
    "donationId" INTEGER NOT NULL,
    "memorialIdFk" INTEGER NOT NULL,
    "userIdFk" TEXT NOT NULL,
    "checkoutId" TEXT NOT NULL,
    "comment" VARCHAR(5000) NOT NULL,
    "amount" INTEGER NOT NULL,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "DonationStatus" NOT NULL,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("donationId")
);

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_memorialIdFk_fkey" FOREIGN KEY ("memorialIdFk") REFERENCES "memorials"("memorialId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_userIdFk_fkey" FOREIGN KEY ("userIdFk") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
