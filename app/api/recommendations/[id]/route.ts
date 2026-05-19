import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { mapRecommendationFromDb } from "@/lib/mappers/recommendationMapper";
import type { Recommendation } from "@/types";

const VALID_STATUS = new Set<Recommendation["status"]>([
  "approved",
  "under_review",
  "pending_review",
  "rejected",
]);

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const row = await prisma.recommendation.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(mapRecommendationFromDb(row));
  } catch (error) {
    console.error("[GET /api/recommendations/:id]", error);
    return NextResponse.json({ error: "Failed to fetch recommendation" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const body = (await req.json()) as { status?: string; comment?: string };
    const status = body.status;

    if (!status || !VALID_STATUS.has(status as Recommendation["status"])) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updated = await prisma.recommendation.update({
      where: { id },
      data: { status },
    });

    await prisma.recommendationAuditLog.create({
      data: {
        recommendationId: id,
        action: status,
        comment: body.comment ?? null,
      },
    });

    return NextResponse.json(mapRecommendationFromDb(updated));
  } catch (error) {
    console.error("[PATCH /api/recommendations/:id]", error);
    return NextResponse.json({ error: "Failed to update recommendation" }, { status: 500 });
  }
}
