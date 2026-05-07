-- CreateTable
CREATE TABLE "chapters" (
    "chapterId" SERIAL NOT NULL,
    "memorialIdFk" INTEGER NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "content" VARCHAR(5000) NOT NULL,
    "createByIdFk" TEXT NOT NULL,
    "createAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateByIdFk" TEXT NOT NULL,
    "updateAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabled" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("chapterId")
);

-- AddForeignKey
ALTER TABLE "chapters" ADD FOREIGN KEY ("memorialIdFk") REFERENCES "memorials"("memorialId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD FOREIGN KEY ("createByIdFk") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD FOREIGN KEY ("updateByIdFk") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
