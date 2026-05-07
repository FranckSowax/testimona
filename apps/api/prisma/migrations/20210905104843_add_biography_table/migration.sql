-- CreateTable
CREATE TABLE "biographies" (
    "biographyId" SERIAL NOT NULL,
    "memorialIdFk" INTEGER NOT NULL,
    "createByIdFk" TEXT NOT NULL,
    "createAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateByIdFk" TEXT NOT NULL,
    "updateAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabled" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("memorialIdFk")
);

-- AddForeignKey
ALTER TABLE "biographies" ADD FOREIGN KEY ("memorialIdFk") REFERENCES "memorials"("memorialId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biographies" ADD FOREIGN KEY ("createByIdFk") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biographies" ADD FOREIGN KEY ("updateByIdFk") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
