import { NextRequest, NextResponse } from "next/server";

import { ScanAlreadySignedOffError, signOffScan } from "@/lib/sentinel/scans";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * Human-in-the-loop sign-off: records who/when and the simulated weights
 * (recomputed server-side from the stored directives). One sign-off per scan.
 */
export async function POST(_req: NextRequest, context: RouteParams) {
  const { id } = await context.params;
  try {
    const scan = await signOffScan(id);
    if (!scan) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(scan);
  } catch (error) {
    if (error instanceof ScanAlreadySignedOffError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[POST /api/portfolio/rebalance/:id/signoff]", error);
    return NextResponse.json({ error: "Sign-off failed" }, { status: 500 });
  }
}
