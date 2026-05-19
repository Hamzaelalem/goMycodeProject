import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { mapRecommendationFromDb } from "@/lib/mappers/recommendationMapper";

const STATUSES = new Set(["approved", "under_review", "pending_review", "rejected"]);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sector = searchParams.get("sector");
    const status = searchParams.get("status");
    const minConfidence = searchParams.get("minConfidence");

    const rows = await prisma.recommendation.findMany({
      where: {
        ...(sector ? { sector } : {}),
        ...(status && STATUSES.has(status) ? { status } : {}),
        ...(minConfidence
          ? { confidence: { gte: Number.parseInt(minConfidence, 10) } }
          : {}),
      },
      orderBy: { rank: "asc" },
    });

    return NextResponse.json(rows.map(mapRecommendationFromDb));
  } catch (error) {
    console.error("[GET /api/recommendations]", error);
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}
