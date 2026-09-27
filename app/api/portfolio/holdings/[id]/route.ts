import { NextRequest, NextResponse } from "next/server";

import { deleteHolding, updateHolding } from "@/lib/portfolio/repository";
import { validateHoldingInput } from "@/lib/portfolio/validation";

export const runtime = "nodejs";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, context: RouteParams) {
  const { id } = await context.params;
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
    const holding = await updateHolding(id, validation.value);
    if (!holding) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ holding });
  } catch (error) {
    console.error("[PATCH /api/portfolio/holdings/:id]", error);
    return NextResponse.json({ error: "Failed to update holding" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteParams) {
  const { id } = await context.params;
  try {
    const deleted = await deleteHolding(id);
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[DELETE /api/portfolio/holdings/:id]", error);
    return NextResponse.json({ error: "Failed to delete holding" }, { status: 500 });
  }
}
