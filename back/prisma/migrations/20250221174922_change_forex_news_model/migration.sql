/*
  Warnings:

  - You are about to drop the column `currency` on the `ForexNews` table. All the data in the column will be lost.
  - You are about to drop the column `date` on the `ForexNews` table. All the data in the column will be lost.
  - You are about to drop the column `event` on the `ForexNews` table. All the data in the column will be lost.
  - You are about to drop the column `impact` on the `ForexNews` table. All the data in the column will be lost.
  - You are about to drop the column `time` on the `ForexNews` table. All the data in the column will be lost.
  - Added the required column `data` to the `ForexNews` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ForexNews" DROP COLUMN "currency",
DROP COLUMN "date",
DROP COLUMN "event",
DROP COLUMN "impact",
DROP COLUMN "time",
ADD COLUMN     "data" JSONB NOT NULL;
