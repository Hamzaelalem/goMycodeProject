import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { mapRecommendationFromDb } from "@/lib/mappers/recommendationMapper";
import { mapWorkflowLogFromDb } from "@/lib/mappers/workflowMapper";
import type { Recommendation, WorkflowStatus } from "@/types";

function toWorkflowStatus(status: Recommendation["status"]): WorkflowStatus {
  return status.toUpperCase() as WorkflowStatus;
}

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
    const row = await prisma.recommendation.findUnique({
      where: { id },
      include: { auditLogs: { orderBy: { at: "asc" } } },
    });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { auditLogs, ...rec } = row;
    return NextResponse.json({
      ...mapRecommendationFromDb(rec),
      auditLogs: auditLogs.map((log) => ({
        id: log.id,
        action: log.action,
        comment: log.comment,
        at: log.at.toISOString(),
      })),
    });
  } catch (error) {
    console.error("[GET /api/recommendations/:id]", error);
    return NextResponse.json({ error: "Failed to fetch recommendation" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    let body: { status?: string; comment?: string };
    try {
      body = (await req.json()) as { status?: string; comment?: string };
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const status = body.status;

    if (!status || !VALID_STATUS.has(status as Recommendation["status"])) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const existing = await prisma.recommendation.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const comment = typeof body.comment === "string" && body.comment.trim() ? body.comment.trim() : null;

    // Status change, durable audit row and the Workflow timeline entry commit together,
    // so the timeline can never disagree with the recommendation's status.
    const [updated, , workflowLog] = await prisma.$transaction([
      prisma.recommendation.update({ where: { id }, data: { status } }),
      prisma.recommendationAuditLog.create({
        data: { recommendationId: id, action: status, comment },
      }),
      prisma.workflowLogEntry.create({
        data: {
          id: `wl-${randomUUID()}`,
          recommendationId: id,
          status: toWorkflowStatus(status as Recommendation["status"]),
          // Shared-password auth has no per-user identity yet (see risks backlog S1).
          actor: "Dashboard reviewer",
          role: "Reviewer",
          timestamp: new Date(),
          comment: comment ?? `Status set to ${status.replace("_", " ")}.`,
        },
      }),
    ]);

    return NextResponse.json({
      recommendation: mapRecommendationFromDb(updated),
      workflowLogEntry: mapWorkflowLogFromDb(workflowLog),
    });
  } catch (error) {
    console.error("[PATCH /api/recommendations/:id]", error);
    return NextResponse.json({ error: "Failed to update recommendation" }, { status: 500 });
  }
}
