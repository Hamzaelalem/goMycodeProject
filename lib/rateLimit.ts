import { NextResponse } from "next/server";

/**
 * Minimal in-memory fixed-window rate limiter.
 *
 * Guards the paid LLM routes (recommendation generation + assistant chat)
 * against runaway cost / abuse — the brief's $500/mo budget concern (§6). State
 * lives on `globalThis` so it survives dev hot-reloads, and is per server
 * process (good enough for the single-node target of ~50 concurrent users; swap
 * for Redis if the service is ever horizontally scaled).
 */

type Window = { count: number; resetAt: number };

const globalForRateLimit = globalThis as unknown as {
  __rateLimitStore?: Map<string, Window>;
};

const store: Map<string, Window> = globalForRateLimit.__rateLimitStore ?? new Map();
globalForRateLimit.__rateLimitStore = store;

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

/** Drop expired windows so the map can't grow without bound. */
function prune(now: number): void {
  if (store.size < 5000) return;
  for (const [key, window] of store) {
    if (now >= window.resetAt) store.delete(key);
  }
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  prune(now);

  const existing = store.get(key);
  if (!existing || now >= existing.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { ok: true, limit, remaining: limit - 1, resetAt, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      limit,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    ok: true,
    limit,
    remaining: limit - existing.count,
    resetAt: existing.resetAt,
    retryAfterSeconds: 0,
  };
}

/** Current state of a window without consuming a slot (e.g. to check a lockout first). */
export function peekRateLimit(key: string, limit: number): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);
  if (!existing || now >= existing.resetAt) {
    return { ok: true, limit, remaining: limit, resetAt: now, retryAfterSeconds: 0 };
  }
  const ok = existing.count < limit;
  return {
    ok,
    limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: ok ? 0 : Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/**
 * Build a rate-limit key for a route scope.
 *
 * `X-Forwarded-For` / `X-Real-IP` are client-controlled unless a reverse proxy
 * overwrites them, so they are only trusted when `TRUST_PROXY=true`. Otherwise
 * every caller shares one bucket per scope — a global budget cap that cannot be
 * bypassed by spoofing a header.
 */
export function clientKey(req: Request, scope: string): string {
  if (process.env.TRUST_PROXY !== "true") return `${scope}:shared`;

  // The nearest trusted proxy appends the real client IP, so take the last hop.
  const forwarded = req.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",").map((part) => part.trim()).filter(Boolean).pop() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  return `${scope}:${ip}`;
}

/** Standard `429` response with `Retry-After` + `RateLimit-*` headers. */
export function tooManyRequestsResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: "Rate limit exceeded. Please slow down and try again later.",
      retryAfterSeconds: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
        "RateLimit-Limit": String(result.limit),
        "RateLimit-Remaining": String(result.remaining),
        "RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    },
  );
}
