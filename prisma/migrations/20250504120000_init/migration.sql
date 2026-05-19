-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "capitalUsd" DOUBLE PRECISION NOT NULL,
    "irrPct" DOUBLE PRECISION NOT NULL,
    "horizonYears" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "tags" TEXT[],
    "rationale" TEXT NOT NULL,
    "scoreBreakdown" JSONB NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "riskFactors" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_audit_logs" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "comment" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "signals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "sentiment" DOUBLE PRECISION NOT NULL,
    "reach" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "riskFactor" TEXT,
    "workflowItemId" TEXT,

    CONSTRAINT "signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "risk_factor_scores" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "previousScore" INTEGER NOT NULL,
    "sparklineData" DOUBLE PRECISION[],
    "source" TEXT NOT NULL,
    "region" TEXT NOT NULL,

    CONSTRAINT "risk_factor_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "esg_sector_inputs" (
    "sector" TEXT NOT NULL,
    "payload" JSONB NOT NULL,

    CONSTRAINT "esg_sector_inputs_pkey" PRIMARY KEY ("sector")
);

-- CreateTable
CREATE TABLE "scenario_snapshots" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'default',
    "defaultInputs" JSONB NOT NULL,
    "scenarioCards" JSONB NOT NULL,
    "irrProjection" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scenario_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_log_entries" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "comment" TEXT NOT NULL,

    CONSTRAINT "workflow_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recommendation_audit_logs_recommendationId_idx" ON "recommendation_audit_logs"("recommendationId");

-- CreateIndex
CREATE INDEX "signals_timestamp_idx" ON "signals"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "scenario_snapshots_key_key" ON "scenario_snapshots"("key");

-- CreateIndex
CREATE INDEX "workflow_log_entries_recommendationId_idx" ON "workflow_log_entries"("recommendationId");

-- AddForeignKey
ALTER TABLE "recommendation_audit_logs" ADD CONSTRAINT "recommendation_audit_logs_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "recommendations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
