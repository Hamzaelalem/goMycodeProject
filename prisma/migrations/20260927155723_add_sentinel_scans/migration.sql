-- CreateTable
CREATE TABLE "sentinel_scans" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mode" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "portfolioSource" TEXT NOT NULL,
    "headlineCount" INTEGER NOT NULL,
    "fallbackReason" TEXT,
    "providerNote" TEXT,
    "assets" JSONB NOT NULL,
    "signedOffAt" TIMESTAMP(3),
    "signedOffBy" TEXT,
    "appliedWeights" JSONB,

    CONSTRAINT "sentinel_scans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sentinel_scans_createdAt_idx" ON "sentinel_scans"("createdAt");
