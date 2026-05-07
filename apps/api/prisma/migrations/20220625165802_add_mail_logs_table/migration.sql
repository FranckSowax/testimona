-- CreateTable
CREATE TABLE "mailLogs" (
    "mailLogId" UUID NOT NULL,
    "orderId" VARCHAR(100) NOT NULL,
    "mailDetails" JSON NOT NULL,
    "mailId" VARCHAR(200),
    "mailResponse" VARCHAR(100),
    "success" BOOLEAN NOT NULL,
    "error" JSON NOT NULL,
    "createAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mailLogs_pkey" PRIMARY KEY ("mailLogId")
);
