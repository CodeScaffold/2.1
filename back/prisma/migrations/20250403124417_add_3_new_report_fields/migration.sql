-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('LEGEND', 'PEAK_SCALP', 'BLACK', 'FLASH');

-- CreateEnum
CREATE TYPE "RiskType" AS ENUM ('AGGRESSIVE', 'NORMAL');

-- AlterTable
ALTER TABLE "Reports" ADD COLUMN     "accountBalance" DOUBLE PRECISION,
ADD COLUMN     "accountType" "AccountType",
ADD COLUMN     "riskType" "RiskType";
