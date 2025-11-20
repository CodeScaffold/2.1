-- CreateEnum
CREATE TYPE "Versions" AS ENUM ('Meta4', 'Meta5', 'cTrader');

-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "version" "Versions";
