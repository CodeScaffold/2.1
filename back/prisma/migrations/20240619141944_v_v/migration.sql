/*
  Warnings:

  - You are about to drop the column `Version` on the `Result` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Result" DROP COLUMN "Version",
ADD COLUMN     "version" "Versions";
