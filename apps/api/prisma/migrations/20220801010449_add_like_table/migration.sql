-- CreateTable
CREATE TABLE "likeItems" (
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "objectType" "MediaObjectType" NOT NULL,
    "createAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "likeItems_pkey" PRIMARY KEY ("userId","itemId","objectType")
);

-- AddForeignKey
ALTER TABLE "likeItems" ADD CONSTRAINT "likeItems_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
