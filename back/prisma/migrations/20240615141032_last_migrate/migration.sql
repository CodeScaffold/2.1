-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Commends" ADD VALUE 'OpenAndSlSlippage';
ALTER TYPE "Commends" ADD VALUE 'MaxDd';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Reasons" ADD VALUE 'OpenAndSlSlippage';
ALTER TYPE "Reasons" ADD VALUE 'MaxDrawdown';

-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "clientId" TEXT;
