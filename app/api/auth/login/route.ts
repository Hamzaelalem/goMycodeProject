import { NextResponse } from "next/server";

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isAuthConfigured,
  verifyPassword,
} from "@/lib/auth/session";
import { clientKey, peekRateLimit, rateLimit, tooManyRequestsResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";

// Throttle password guessing against the single shared password: only failed
// attempts consume the budget, so a correct login is never blocked by its own use.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = Number(process.env.RATE_LIMIT_LOGIN_FAILURES_PER_15MIN ?? 10);

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    console.error("Auth is not configured: set AUTH_PASSWORD and AUTH_SECRET.");
    return NextResponse.json({ error: "Auth is not configured" }, { status: 500 });
  }

  const limitKey = clientKey(request, "login-failures");
  const lockout = peekRateLimit(limitKey, LOGIN_MAX_FAILURES);
  if (!lockout.ok) return tooManyRequestsResponse(lockout);

  let password: unknown;
  try {
    const body = (await request.json()) as { password?: unknown };
    password = body?.password;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof password !== "string" || !verifyPassword(password)) {
    rateLimit(limitKey, LOGIN_MAX_FAILURES, LOGIN_WINDOW_MS);
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
