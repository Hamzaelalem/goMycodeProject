import { NextRequest, NextResponse } from "next/server";

import { createHolding, getPortfolioSummary, PortfolioLimitError, recentAudit } from "@/lib/portfolio/repository";
import { MAX_HOLDINGS, validateHoldingInput } from "@/lib/portfolio/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Sequential: reading the summary may seed the table, and the audit should include that.
    const summary = await getPortfolioSummary();
    const audit = await recentAudit();
    return NextResponse.json({ ...summary, maxHoldings: MAX_HOLDINGS, audit });
  } catch (error) {
    console.error("[GET /api/portfolio/holdings]", error);
    return NextResponse.json({ error: "Failed to load portfolio" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const validation = validateHoldingInput(body);
  if (!validation.ok) {
    return NextResponse.json({ error: "Invalid holding", details: validation.errors }, { status: 400 });
  }

  try {
    const holding = await createHolding(validation.value);
    return NextResponse.json({ holding }, { status: 201 });
  } catch (error) {
    if (error instanceof PortfolioLimitError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[POST /api/portfolio/holdings]", error);
    return NextResponse.json({ error: "Failed to add holding" }, { status: 500 });
  }
}
