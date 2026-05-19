import fs from "fs";
import path from "path";

import type { NextConfig } from "next";

/** Load committed dev DB URL when DATABASE_URL is not already set (e.g. CI or .env.local). */
function loadDatabaseUrlFallback() {
  if (process.env.DATABASE_URL) return;
  const file = path.join(process.cwd(), "config", "database.env");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key !== "DATABASE_URL") continue;
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env.DATABASE_URL = val;
    return;
  }
}

loadDatabaseUrlFallback();

const defaultDevOrigins = ["localhost", "127.0.0.1", "192.168.1.18"];

const nextConfig: NextConfig = {
  allowedDevOrigins: process.env.NEXT_ALLOWED_DEV_ORIGINS
    ? process.env.NEXT_ALLOWED_DEV_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
    : defaultDevOrigins,
};

export default nextConfig;
