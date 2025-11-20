/*
  Warnings:

  - The values [OpenAndSlSlippage,MaxDd] on the enum `Commends` will be removed. If these variants are still used in the database, this will fail.
  - The values [OpenAndSlSlippage] on the enum `Reasons` will be removed. If these variants are still used in the database, this will fail.
*/
-- Clean up old enum values so ALTER TYPE will succeed

UPDATE "Result"
  SET "commend" = 'OpenSlippage'
  WHERE "commend"::text = 'OpenAndSlSlippage';

UPDATE "Result"
  SET "reason" = 'OpenPriceSlippage'
  WHERE "reason"::text = 'OpenAndSlSlippage';

-- AlterEnum
BEGIN;
CREATE TYPE "Commends_new" AS ENUM ('OpenSlippage', 'SlSlippage', 'OpenSlSlippage', 'HighSpread');
ALTER TABLE "Result" ALTER COLUMN "commend" TYPE "Commends_new" USING ("commend"::text::"Commends_new");
ALTER TYPE "Commends" RENAME TO "Commends_old";
ALTER TYPE "Commends_new" RENAME TO "Commends";
DROP TYPE "Commends_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Reasons_new" AS ENUM ('OpenPriceSlippage', 'SlippageOnSL', 'HighSpread', 'OpenClosePriceSlippage', 'MaxDrawdown');
ALTER TABLE "Result" ALTER COLUMN "reason" TYPE "Reasons_new" USING ("reason"::text::"Reasons_new");
ALTER TYPE "Reasons" RENAME TO "Reasons_old";
ALTER TYPE "Reasons_new" RENAME TO "Reasons";
DROP TYPE "Reasons_old";
COMMIT;
