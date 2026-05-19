import { Prisma, PrismaClient } from "@prisma/client";

import { recommendations } from "../mock-data/recommendations";
import { seededSignals } from "../mock-data/signals";
import { riskScores } from "../mock-data/riskScores";
import { esgInputs } from "../mock-data/esgInputs";
import { workflowLog } from "../mock-data/workflowLog";
import {
  computeIrrProjection,
  computeScenarioCards,
  DEFAULT_INPUTS,
} from "../mock-data/scenarios.v2";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database from mock data…");

  await prisma.recommendationAuditLog.deleteMany();
  await prisma.workflowLogEntry.deleteMany();
  await prisma.signal.deleteMany();
  await prisma.riskFactorScore.deleteMany();
  await prisma.esgSectorInput.deleteMany();
  await prisma.scenarioSnapshot.deleteMany();
  await prisma.recommendation.deleteMany();

  for (const rec of recommendations) {
    await prisma.recommendation.create({
      data: {
        id: rec.id,
        rank: rec.rank,
        title: rec.title,
        region: rec.region,
        sector: rec.sector,
        country: rec.country,
        capitalUsd: rec.capitalUsd,
        irrPct: rec.irrPct,
        horizonYears: rec.horizonYears,
        riskLevel: rec.riskLevel,
        confidence: rec.confidence,
        status: rec.status,
        tags: rec.tags,
        rationale: rec.rationale,
        scoreBreakdown: rec.scoreBreakdown as unknown as Prisma.InputJsonValue,
        modelVersion: rec.modelVersion,
        generatedAt: new Date(rec.generatedAt),
        riskFactors: rec.riskFactors,
      },
    });
  }

  for (const s of seededSignals) {
    await prisma.signal.create({
      data: {
        id: s.id,
        title: s.title,
        body: s.body,
        type: s.type,
        severity: s.severity,
        sentiment: s.sentiment,
        reach: s.reach,
        timestamp: new Date(s.timestamp),
        source: s.source,
        country: s.country,
        region: s.region,
        sector: s.sector,
        riskFactor: s.riskFactor ?? null,
        workflowItemId: s.workflowItemId ?? null,
      },
    });
  }

  for (const r of riskScores) {
    await prisma.riskFactorScore.create({
      data: {
        id: r.id,
        name: r.name,
        score: r.score,
        previousScore: r.previousScore,
        sparklineData: r.sparklineData,
        source: r.source,
        region: r.region,
      },
    });
  }

  for (const e of esgInputs) {
    await prisma.esgSectorInput.create({
      data: {
        sector: e.sector,
        payload: { kpis: e.kpis, scores: e.scores } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  const cards = computeScenarioCards(DEFAULT_INPUTS);
  const irrProjection = computeIrrProjection(cards);
  await prisma.scenarioSnapshot.create({
    data: {
      key: "default",
      defaultInputs: DEFAULT_INPUTS as unknown as Prisma.InputJsonValue,
      scenarioCards: cards as unknown as Prisma.InputJsonValue,
      irrProjection: irrProjection as unknown as Prisma.InputJsonValue,
    },
  });

  for (const w of workflowLog) {
    await prisma.workflowLogEntry.create({
      data: {
        id: w.id,
        recommendationId: w.recommendationId,
        status: w.status,
        actor: w.actor,
        role: w.role,
        timestamp: new Date(w.timestamp),
        comment: w.comment,
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
