import { NextResponse } from "next/server";

import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  isAuthConfigured,
  verifyPassword,
} from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    console.error("Auth is not configured: set AUTH_PASSWORD and AUTH_SECRET.");
    return NextResponse.json({ error: "Auth is not configured" }, { status: 500 });
  }

  let password: unknown;
  try {
    const body = (await request.json()) as { password?: unknown };
    password = body?.password;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof password !== "string" || !verifyPassword(password)) {
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
