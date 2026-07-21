import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

/**
 * Shared-password access gate (Next.js 16 `proxy.ts`, formerly `middleware.ts`).
 *
 * Every matched request must carry a valid signed session cookie. The login
 * page and the auth endpoints that mint/clear that cookie are the only public
 * paths. Unauthenticated page loads redirect to `/login`; unauthenticated API
 * calls get a `401` so client fetches fail loudly instead of rendering stale UI.
 */

const PUBLIC_PATHS = new Set<string>(["/login"]);
const PUBLIC_API_PATHS = new Set<string>(["/api/auth/login", "/api/auth/logout"]);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname) || PUBLIC_API_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  if (pathname && pathname !== "/") {
    loginUrl.searchParams.set("from", pathname);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Run on everything except Next.js internals and the favicon. API routes are
  // intentionally included so the gate covers data and AI endpoints too.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
