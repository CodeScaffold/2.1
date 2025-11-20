-- CreateTable
CREATE TABLE "Leverage" (
    "id" SERIAL NOT NULL,
    "pair" TEXT NOT NULL,
    "leverage" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "Leverage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Leverage_pair_key" ON "Leverage"("pair");
