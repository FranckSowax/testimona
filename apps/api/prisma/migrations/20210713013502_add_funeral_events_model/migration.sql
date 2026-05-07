-- CreateEnum
CREATE TYPE "HourPeriod" AS ENUM ('AM', 'PM');

-- CreateTable
CREATE TABLE "funeralEvents" (
    "funeralEventId" SERIAL NOT NULL,
    "memorialIdFk" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "startHour" TIME NOT NULL,
    "startHourPeriod" "HourPeriod" NOT NULL,
    "endHour" TIME NOT NULL,
    "endHourPeriod" "HourPeriod" NOT NULL,
    "url" VARCHAR(500),
    "note" VARCHAR(5000),
    "location" VARCHAR(5000),
    "createByIdFk" TEXT NOT NULL,
    "createAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateByIdFk" TEXT NOT NULL,
    "updateAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabled" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("funeralEventId")
);

-- AddForeignKey
ALTER TABLE "funeralEvents" ADD FOREIGN KEY ("memorialIdFk") REFERENCES "memorials"("memorialId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funeralEvents" ADD FOREIGN KEY ("createByIdFk") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "funeralEvents" ADD FOREIGN KEY ("updateByIdFk") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
