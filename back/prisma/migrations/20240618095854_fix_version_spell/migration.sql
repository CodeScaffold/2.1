/*
  Warnings:

  - You are about to drop the column `version` on the `Result` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Result" DROP COLUMN "version",
ADD COLUMN     "Version" "Versions";
