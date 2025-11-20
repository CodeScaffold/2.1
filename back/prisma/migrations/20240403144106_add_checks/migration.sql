/*
  Warnings:

  - Added the required column `archivedAt` to the `Result` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fisrtCheck` to the `Result` table without a default value. This is not possible if the table is not empty.
  - Added the required column `secondCheck` to the `Result` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "archivedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "fisrtCheck" BOOLEAN NOT NULL,
ADD COLUMN     "secondCheck" BOOLEAN NOT NULL;
