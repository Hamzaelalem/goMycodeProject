import { afterEach, describe, expect, it, vi } from "vitest";

import { clientKey, peekRateLimit, rateLimit } from "./rateLimit";

function request(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/x", { headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("clientKey", () => {
  it("ignores spoofable forwarding headers unless TRUST_PROXY is set", () => {
    vi.stubEnv("TRUST_PROXY", "");
    expect(clientKey(request({ "x-forwarded-for": "1.2.3.4" }), "generate")).toBe("generate:shared");
    expect(clientKey(request({ "x-forwarded-for": "5.6.7.8" }), "generate")).toBe("generate:shared");
  });

  it("uses the last X-Forwarded-For hop behind a trusted proxy", () => {
    vi.stubEnv("TRUST_PROXY", "true");
    expect(clientKey(request({ "x-forwarded-for": "9.9.9.9, 10.0.0.7" }), "login")).toBe("login:10.0.0.7");
    expect(clientKey(request({ "x-real-ip": "10.0.0.8" }), "login")).toBe("login:10.0.0.8");
  });
});

describe("rateLimit", () => {
  it("blocks after the limit and peek does not consume a slot", () => {
    const key = `test:${Math.random()}`;
    expect(peekRateLimit(key, 2).ok).toBe(true);
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    expect(peekRateLimit(key, 2).ok).toBe(false);
    const blocked = rateLimit(key, 2, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});
