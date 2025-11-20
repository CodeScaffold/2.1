/*
  Warnings:

  - You are about to drop the column `name` on the `User` table. All the data in the column will be lost.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Reasons" AS ENUM ('OpenPriceSlippage', 'SlippageOnSL', 'HighSpread');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "name",
ADD COLUMN     "password" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Result" (
    "id" SERIAL NOT NULL,
    "ticket" TEXT,
    "pair" TEXT,
    "lot" DOUBLE PRECISION,
    "tp" DOUBLE PRECISION,
    "sl" DOUBLE PRECISION,
    "closePrice" DOUBLE PRECISION,
    "resaon" "Reasons" NOT NULL,
    "difference" DOUBLE PRECISION,
    "compensate" DOUBLE PRECISION,

    CONSTRAINT "Result_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Result_ticket_key" ON "Result"("ticket");
