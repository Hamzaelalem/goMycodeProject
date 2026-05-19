import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { mapRecommendationFromDb } from "@/lib/mappers/recommendationMapper";
import { mapWorkflowLogFromDb } from "@/lib/mappers/workflowMapper";

const STATUSES = new Set(["approved", "under_review", "pending_review", "rejected"]);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const [recommendations, workflowLogs] = await Promise.all([
      prisma.recommendation.findMany({
        where: status && STATUSES.has(status) ? { status } : {},
        orderBy: { updatedAt: "desc" },
      }),
      prisma.workflowLogEntry.findMany({
        orderBy: { timestamp: "asc" },
      }),
    ]);

    return NextResponse.json({
      recommendations: recommendations.map(mapRecommendationFromDb),
      workflowLogs: workflowLogs.map(mapWorkflowLogFromDb),
    });
  } catch (error) {
    console.error("[GET /api/workflow]", error);
    return NextResponse.json({ error: "Failed to fetch workflow data" }, { status: 500 });
  }
}
