import { NextRequest, NextResponse } from "next/server";

import { getLastIngestRun, isIngestRunning, runNewsIngest } from "@/lib/ingest/newsIngest";
import { getIngestMode, setIngestMode } from "@/lib/ingest/scheduler";
import type { IngestMode } from "@/lib/ingest/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODES: IngestMode[] = ["auto", "manual", "off"];

/** Optional shared-secret guard: if INGEST_TOKEN is set, require it. */
function authorized(req: NextRequest): boolean {
  const token = process.env.INGEST_TOKEN;
  if (!token) return true;
  const header = req.headers.get("x-ingest-token");
  const query = new URL(req.url).searchParams.get("token");
  return header === token || query === token;
}

export async function GET() {
  return NextResponse.json({
    running: isIngestRunning(),
    mode: getIngestMode(),
    lastRun: getLastIngestRun(),
  });
}

export async function PATCH(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const mode = (body as { mode?: unknown }).mode;
  if (typeof mode !== "string" || !MODES.includes(mode as IngestMode)) {
    return NextResponse.json({ error: "mode must be one of: auto, manual, off" }, { status: 400 });
  }

  setIngestMode(mode as IngestMode);
  return NextResponse.json({ mode: getIngestMode() });
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (getIngestMode() === "off") {
    return NextResponse.json({ ok: false, error: "Fetching is turned off" }, { status: 409 });
  }

  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limitPerQuery");
  const limitPerQuery = limitParam ? Math.max(1, Math.min(20, Number.parseInt(limitParam, 10))) : undefined;

  const summary = await runNewsIngest(limitPerQuery ? { limitPerQuery } : undefined);
  return NextResponse.json(summary, { status: summary.ok ? 200 : 502 });
}
