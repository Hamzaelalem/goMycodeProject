import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { mockPortfolio } from "@/mock-data/portfolio";
import {
  baseFromPortfolio,
  baseFromRecommendation,
  computeScenarioBundle,
} from "@/lib/scenarios/compute";
import type { RiskLevel, ScenarioInputs } from "@/types";

export const runtime = "nodejs";

function parseInputs(raw: unknown): ScenarioInputs | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const oilPrice = num(o.oilPrice);
  const fxDeltaPct = num(o.fxDeltaPct);
  const interestRate = num(o.interestRate);
  const inflationRate = num(o.inflationRate);
  if (oilPrice === null || fxDeltaPct === null || interestRate === null || inflationRate === null) {
    return null;
  }
  return { oilPrice, fxDeltaPct, interestRate, inflationRate };
}

export async function POST(req: NextRequest) {
  let body: { inputs?: unknown; recommendationId?: unknown };
  try {
    body = (await req.json()) as { inputs?: unknown; recommendationId?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const inputs = parseInputs(body.inputs);
  if (!inputs) {
    return NextResponse.json({ error: "Invalid scenario inputs" }, { status: 400 });
  }

  const portfolioBase = baseFromPortfolio(mockPortfolio);
  let base = portfolioBase;

  const recommendationId =
    typeof body.recommendationId === "string" ? body.recommendationId : null;

  if (recommendationId) {
    try {
      const rec = await prisma.recommendation.findUnique({
        where: { id: recommendationId },
        select: { irrPct: true, riskLevel: true },
      });
      if (rec) {
        base = baseFromRecommendation(
          { irrPct: rec.irrPct, riskLevel: rec.riskLevel as RiskLevel },
          portfolioBase,
        );
      }
    } catch (error) {
      console.warn("[scenarios/compute] recommendation lookup failed:", error);
    }
  }

  const bundle = computeScenarioBundle(inputs, base);
  return NextResponse.json(bundle);
}
