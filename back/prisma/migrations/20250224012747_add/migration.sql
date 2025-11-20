-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('Approved', 'Rejected', 'Review');

-- CreateTable
CREATE TABLE "Reports" (
    "id" SERIAL NOT NULL,
    "ThirtySecondTrades" TEXT NOT NULL,
    "NewsHedgeTrades" TEXT NOT NULL,
    "Rule80Percent" TEXT NOT NULL,
    "MarginViolations" TEXT NOT NULL,
    "Agent" TEXT NOT NULL,
    "Decision" "Decision",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reports_pkey" PRIMARY KEY ("id")
);
