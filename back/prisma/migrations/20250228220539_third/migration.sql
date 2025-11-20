/*
  Warnings:

  - The `MetaTraderVersion` column on the `Reports` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Reports" DROP COLUMN "MetaTraderVersion",
ADD COLUMN     "MetaTraderVersion" TEXT;
