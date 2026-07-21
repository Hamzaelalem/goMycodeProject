/**
 * Shared-password session tokens.
 *
 * The dashboard has a single access password (`AUTH_PASSWORD`); a successful
 * login mints a short-lived, HMAC-signed token that is stored in an HTTP-only
 * cookie. There is no per-user identity — the token only proves "this browser
 * entered the password".
 *
 * Implemented with the Web Crypto API (`globalThis.crypto.subtle`) so the same
 * code runs in `proxy.ts` (Node runtime in Next.js 16) and in route handlers.
 */

export const SESSION_COOKIE = "dl_session";

/** Session lifetime. Re-login required after this window. */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SECONDS * 1000;

const encoder = new TextEncoder();

/** True when the shared-password gate is configured (both secrets present). */
export function isAuthConfigured(): boolean {
  return Boolean(process.env.AUTH_PASSWORD && process.env.AUTH_SECRET);
}

/** The configured access password, or undefined when unset. */
export function getAuthPassword(): string | undefined {
  return process.env.AUTH_PASSWORD || undefined;
}

function getSecret(): string | undefined {
  return process.env.AUTH_SECRET || undefined;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): string {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return atob(base64);
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

/** Length-safe, constant-time-ish string comparison. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/** Verify a user-supplied password against `AUTH_PASSWORD`. */
export function verifyPassword(candidate: string): boolean {
  const expected = getAuthPassword();
  if (!expected) return false;
  return safeEqual(candidate, expected);
}

/** Mint a signed session token (`<payload>.<signature>`). Throws if misconfigured. */
export async function createSessionToken(): Promise<string> {
  const secret = getSecret();
  if (!secret) throw new Error("AUTH_SECRET is not set");
  const payload = toBase64Url(encoder.encode(JSON.stringify({ exp: Date.now() + SESSION_MAX_AGE_MS })));
  const signature = await sign(payload, secret);
  return `${payload}.${signature}`;
}

/** Validate signature + expiry of a session token. Never throws. */
export async function verifySessionToken(token: string | undefined | null): Promise<boolean> {
  if (!token) return false;
  const secret = getSecret();
  if (!secret) return false;

  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = await sign(payload, secret);
  if (!safeEqual(signature, expected)) return false;

  try {
    const decoded = JSON.parse(fromBase64Url(payload)) as { exp?: unknown };
    return typeof decoded.exp === "number" && Date.now() < decoded.exp;
  } catch {
    return false;
  }
}
