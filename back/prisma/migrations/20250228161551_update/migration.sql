/*
  Warnings:

  - You are about to drop the column `statmentNumber` on the `Reports` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Reports" DROP COLUMN "statmentNumber",
ADD COLUMN     "StatementNumber" INTEGER;
