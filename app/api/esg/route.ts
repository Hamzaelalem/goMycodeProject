import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { mapEsgSectorFromDb } from "@/lib/mappers/esgMapper";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sector = searchParams.get("sector");

    const rows = await prisma.esgSectorInput.findMany({
      where: sector ? { sector } : {},
      orderBy: { sector: "asc" },
    });

    return NextResponse.json(rows.map(mapEsgSectorFromDb));
  } catch (error) {
    console.error("[GET /api/esg]", error);
    return NextResponse.json({ error: "Failed to fetch ESG data" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      sector?: string;
      payload?: { kpis: unknown; scores: unknown };
    };
    if (!body.sector || !body.payload || typeof body.payload !== "object") {
      return NextResponse.json({ error: "sector and payload required" }, { status: 400 });
    }
    const updated = await prisma.esgSectorInput.update({
      where: { sector: body.sector },
      data: { payload: body.payload as object },
    });
    return NextResponse.json(mapEsgSectorFromDb(updated));
  } catch (error) {
    console.error("[PATCH /api/esg]", error);
    return NextResponse.json({ error: "Failed to update ESG data" }, { status: 500 });
  }
}
