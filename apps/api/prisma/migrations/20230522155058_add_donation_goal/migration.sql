-- CreateTable
CREATE TABLE "memorialDonation" (
    "memorialIdFk" INTEGER NOT NULL,
    "DonationGoal" INTEGER NOT NULL DEFAULT 0,
    "AmountDonation" INTEGER NOT NULL DEFAULT 0
);

-- CreateIndex
CREATE UNIQUE INDEX "memorialDonation_memorialIdFk_key" ON "memorialDonation"("memorialIdFk");

-- AddForeignKey
ALTER TABLE "memorialDonation" ADD CONSTRAINT "memorialDonation_memorialIdFk_fkey" FOREIGN KEY ("memorialIdFk") REFERENCES "memorials"("memorialId") ON DELETE RESTRICT ON UPDATE CASCADE;
