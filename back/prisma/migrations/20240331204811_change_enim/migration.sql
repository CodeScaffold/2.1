/*
  Warnings:

  - You are about to drop the column `resaon` on the `Result` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Result" DROP COLUMN "resaon",
ADD COLUMN     "reason" "Reasons";
