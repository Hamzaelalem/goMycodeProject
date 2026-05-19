import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { mapRiskFactorScoreFromDb } from "@/lib/mappers/riskMapper";

export async function GET() {
  try {
    const rows = await prisma.riskFactorScore.findMany({
      orderBy: { score: "desc" },
    });
    return NextResponse.json(rows.map(mapRiskFactorScoreFromDb));
  } catch (error) {
    console.error("[GET /api/risk]", error);
    return NextResponse.json({ error: "Failed to fetch risk scores" }, { status: 500 });
  }
}
