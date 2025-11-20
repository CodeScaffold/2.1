-- AlterTable
ALTER TABLE "Result" ALTER COLUMN "archivedAt" DROP NOT NULL,
ALTER COLUMN "fisrtCheck" SET DEFAULT false,
ALTER COLUMN "secondCheck" SET DEFAULT false;
