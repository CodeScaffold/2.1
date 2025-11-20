-- CreateTable
CREATE TABLE "ZapierMailTrack" (
    "email" TEXT NOT NULL,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ZapierMailTrack_pkey" PRIMARY KEY ("email")
);
