import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { mapSignalFromDb } from "@/lib/mappers/signalMapper";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const severity = searchParams.get("severity");
    const sector = searchParams.get("sector");
    const country = searchParams.get("country");
    const after = searchParams.get("after");
    const limit = Math.min(Number.parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200);

    const where: Prisma.SignalWhereInput = {
      ...(type ? { type } : {}),
      ...(severity ? { severity } : {}),
      ...(sector ? { sector } : {}),
      ...(country ? { country } : {}),
      ...(after
        ? {
            timestamp: {
              gt: new Date(after),
            },
          }
        : {}),
    };

    const rows = await prisma.signal.findMany({
      where,
      orderBy: { timestamp: after ? "asc" : "desc" },
      take: limit,
    });

    return NextResponse.json(rows.map(mapSignalFromDb));
  } catch (error) {
    console.error("[GET /api/signals]", error);
    return NextResponse.json({ error: "Failed to fetch signals" }, { status: 500 });
  }
}

function parseSignalCreateBody(input: unknown): Prisma.SignalCreateInput | null {
  if (!input || typeof input !== "object") return null;
  const o = input as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : null;
  const title = typeof o.title === "string" ? o.title : null;
  const body = typeof o.body === "string" ? o.body : null;
  const type = typeof o.type === "string" ? o.type : null;
  const severity = typeof o.severity === "string" ? o.severity : null;
  const source = typeof o.source === "string" ? o.source : null;
  const country = typeof o.country === "string" ? o.country : null;
  const region = typeof o.region === "string" ? o.region : null;
  const sector = typeof o.sector === "string" ? o.sector : null;
  if (!id || !title || !body || !type || !severity || !source || !country || !region || !sector) {
    return null;
  }
  const sentiment = typeof o.sentiment === "number" && Number.isFinite(o.sentiment) ? o.sentiment : 0;
  const reach = typeof o.reach === "number" && Number.isFinite(o.reach) ? Math.trunc(o.reach) : 0;
  const ts =
    typeof o.timestamp === "string" ? new Date(o.timestamp) : new Date(Number.NaN);
  const timestamp = Number.isFinite(ts.getTime()) ? ts : new Date();
  const riskFactor = typeof o.riskFactor === "string" ? o.riskFactor : null;
  const workflowItemId = typeof o.workflowItemId === "string" ? o.workflowItemId : null;
  return {
    id,
    title,
    body,
    type,
    severity,
    sentiment,
    reach,
    timestamp,
    source,
    country,
    region,
    sector,
    riskFactor,
    workflowItemId,
  };
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const data = parseSignalCreateBody(raw);
    if (!data) {
      return NextResponse.json({ error: "Invalid signal payload" }, { status: 400 });
    }
    const row = await prisma.signal.create({ data });
    return NextResponse.json(mapSignalFromDb(row), { status: 201 });
  } catch (error) {
    console.error("[POST /api/signals]", error);
    return NextResponse.json({ error: "Failed to create signal" }, { status: 500 });
  }
}
