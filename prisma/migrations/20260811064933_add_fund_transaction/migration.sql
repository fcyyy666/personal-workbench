-- CreateTable
CREATE TABLE "FundTransaction" (
    "id" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "shares" DOUBLE PRECISION NOT NULL,
    "nav" DOUBLE PRECISION NOT NULL,
    "date" DATE NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundTransaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FundTransaction" ADD CONSTRAINT "FundTransaction_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "Fund"("id") ON DELETE CASCADE ON UPDATE CASCADE;
