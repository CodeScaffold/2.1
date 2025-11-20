-- CreateEnum
CREATE TYPE "Commends" AS ENUM ('SlSlippage', 'OpenSlippage', 'HighSpread');

-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "commend" "Commends",
ADD COLUMN     "openPrice" DOUBLE PRECISION;
