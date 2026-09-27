import { NextRequest, NextResponse } from "next/server";

import { getScan } from "@/lib/sentinel/scans";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

/** One saved scan with its directives and sign-off state. */
export async function GET(_req: NextRequest, context: RouteParams) {
  const { id } = await context.params;
  try {
    const scan = await getScan(id);
    if (!scan) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(scan);
  } catch (error) {
    console.error("[GET /api/portfolio/rebalance/:id]", error);
    return NextResponse.json({ error: "Failed to load scan" }, { status: 500 });
  }
}
