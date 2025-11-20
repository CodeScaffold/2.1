/*
  Warnings:

  - Added the required column `statmentNumber` to the `Reports` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Reports" ADD COLUMN     "statmentNumber" TEXT NOT NULL;
