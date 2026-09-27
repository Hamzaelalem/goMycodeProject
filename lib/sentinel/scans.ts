import type { Prisma, SentinelScan } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  type AssetRebalance,
  countActions,
  type RebalanceMode,
  type RebalanceResponse,
  type SentinelScanSummary,
  simulateRebalance,
} from "@/lib/sentinel/rebalance";

/** Shared-password auth has no per-user identity yet (see risks backlog S1). */
const REVIEWER = "Dashboard reviewer";

export class ScanAlreadySignedOffError extends Error {
  constructor() {
    super("This scan was already signed off.");
    this.name = "ScanAlreadySignedOffError";
  }
}

function toResponse(row: SentinelScan): RebalanceResponse {
  return {
    scanId: row.id,
    mode: row.mode as RebalanceMode,
    model: row.model,
    portfolioSource: row.portfolioSource as RebalanceResponse["portfolioSource"],
    generatedAt: row.createdAt.toISOString(),
    headlineCount: row.headlineCount,
    fallbackReason: row.fallbackReason ?? undefined,
    providerNote: row.providerNote ?? undefined,
    assets: row.assets as unknown as AssetRebalance[],
    signedOffAt: row.signedOffAt?.toISOString() ?? null,
    signedOffBy: row.signedOffBy,
    appliedWeights: (row.appliedWeights as Record<string, number> | null) ?? null,
  };
}

export async function saveScan(scan: RebalanceResponse): Promise<RebalanceResponse> {
  const row = await prisma.sentinelScan.create({
    data: {
      createdAt: new Date(scan.generatedAt),
      mode: scan.mode,
      model: scan.model,
      portfolioSource: scan.portfolioSource,
      headlineCount: scan.headlineCount,
      fallbackReason: scan.fallbackReason ?? null,
      providerNote: scan.providerNote ?? null,
      assets: scan.assets as unknown as Prisma.InputJsonValue,
    },
  });
  return toResponse(row);
}

export async function listScans(limit = 10): Promise<SentinelScanSummary[]> {
  const rows = await prisma.sentinelScan.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  return rows.map((row) => ({
    scanId: row.id,
    generatedAt: row.createdAt.toISOString(),
    mode: row.mode as RebalanceMode,
    model: row.model,
    counts: countActions(row.assets as unknown as AssetRebalance[]),
    signedOffAt: row.signedOffAt?.toISOString() ?? null,
  }));
}

export async function getScan(id: string): Promise<RebalanceResponse | null> {
  const row = await prisma.sentinelScan.findUnique({ where: { id } });
  return row ? toResponse(row) : null;
}

/**
 * Record the human sign-off and the resulting simulated weights. Weights are
 * recomputed from the stored directives, never taken from the client. A scan
 * can be signed off once. Returns null when the scan does not exist.
 */
export async function signOffScan(id: string): Promise<RebalanceResponse | null> {
  const row = await prisma.sentinelScan.findUnique({ where: { id } });
  if (!row) return null;
  const appliedWeights = simulateRebalance(row.assets as unknown as AssetRebalance[]);

  const { count } = await prisma.sentinelScan.updateMany({
    where: { id, signedOffAt: null },
    data: { signedOffAt: new Date(), signedOffBy: REVIEWER, appliedWeights },
  });
  if (count === 0) throw new ScanAlreadySignedOffError();
  return getScan(id);
}
