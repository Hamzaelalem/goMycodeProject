import { NextRequest, NextResponse } from "next/server";

import { importHoldings, PortfolioLimitError } from "@/lib/portfolio/repository";
import { type HoldingInput, MAX_HOLDINGS, validateHoldingInput } from "@/lib/portfolio/validation";

export const runtime = "nodejs";

/**
 * Bulk import of rows the page parsed from a CSV. Every row is re-validated
 * here; if any row is invalid nothing is written.
 */
export async function POST(req: NextRequest) {
  let body: { mode?: unknown; rows?: unknown };
  try {
    body = (await req.json()) as { mode?: unknown; rows?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const mode = body.mode;
  if (mode !== "replace" && mode !== "append") {
    return NextResponse.json({ error: 'mode must be "replace" or "append"' }, { status: 400 });
  }
  if (!Array.isArray(body.rows) || body.rows.length === 0) {
    return NextResponse.json({ error: "rows must be a non-empty array" }, { status: 400 });
  }
  if (body.rows.length > MAX_HOLDINGS) {
    return NextResponse.json({ error: `At most ${MAX_HOLDINGS} rows can be imported.` }, { status: 400 });
  }

  const valid: HoldingInput[] = [];
  const rowErrors: Array<{ row: number; errors: string[] }> = [];
  body.rows.forEach((raw, index) => {
    const result = validateHoldingInput(raw);
    if (result.ok) valid.push(result.value);
    else rowErrors.push({ row: index + 1, errors: result.errors });
  });
  if (rowErrors.length) {
    return NextResponse.json({ error: "Some rows are invalid", rowErrors }, { status: 400 });
  }

  try {
    const holdings = await importHoldings(mode, valid);
    return NextResponse.json({ imported: valid.length, total: holdings.length });
  } catch (error) {
    if (error instanceof PortfolioLimitError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error("[POST /api/portfolio/import]", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
