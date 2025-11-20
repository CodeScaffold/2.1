/*
  Warnings:

  - You are about to drop the column `fisrtCheck` on the `Result` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Result" DROP COLUMN "fisrtCheck",
ADD COLUMN     "firstCheck" BOOLEAN NOT NULL DEFAULT false;
