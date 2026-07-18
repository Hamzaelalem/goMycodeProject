import { NextRequest } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { mapSignalFromDb } from "@/lib/mappers/signalMapper";

// SSE requires a long-lived Node runtime (Prisma is not edge-compatible here).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 5_000;

/**
 * Server-Sent Events stream of newly-created signals.
 *
 * On connect we snapshot the current time and, every few seconds, push any
 * signals with `timestamp > cursor` as `event: signal` messages. One DB poll
 * runs per connection (server-side) instead of every client polling directly,
 * and clients receive pushes in real time. Comment heartbeats keep the
 * connection alive through proxies.
 */
export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();
  let cursor = new Date();
  let timer: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const enqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Controller already closed — stop the timer.
          cleanup();
        }
      };

      const sendEvent = (event: string, data: unknown) =>
        enqueue(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (timer) clearInterval(timer);
        timer = null;
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      const poll = async () => {
        if (closed) return;
        try {
          const rows = await prisma.signal.findMany({
            where: { timestamp: { gt: cursor } },
            orderBy: { timestamp: "asc" },
            take: 50,
          });
          if (rows.length > 0) {
            cursor = rows[rows.length - 1]!.timestamp;
            for (const row of rows) sendEvent("signal", mapSignalFromDb(row));
          } else {
            enqueue(": heartbeat\n\n");
          }
        } catch {
          // Transient DB error — keep the connection alive; retry next tick.
          enqueue(": heartbeat\n\n");
        }
      };

      // Announce readiness, then begin polling.
      sendEvent("ready", { at: cursor.toISOString() });
      timer = setInterval(() => {
        void poll();
      }, POLL_INTERVAL_MS);

      // Close when the client disconnects.
      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
      timer = null;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
