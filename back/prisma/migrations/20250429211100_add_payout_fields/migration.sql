-- CreateTable
CREATE TABLE "Payout" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "transferAmount" DOUBLE PRECISION NOT NULL,
    "profitSplit" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "payoutDetails" JSONB NOT NULL,
    "state" TEXT NOT NULL,
    "rejectionReason" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paymentAgent" TEXT,

    CONSTRAINT "Payout_pkey" PRIMARY KEY ("id")
);
