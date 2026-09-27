import { Prisma, type PortfolioHolding as PortfolioHoldingRow } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { summarizePortfolio } from "@/lib/portfolio/summary";
import { MAX_HOLDINGS, type HoldingInput } from "@/lib/portfolio/validation";
import { portfolioHoldings as demoHoldings } from "@/mock-data/portfolio";
import type { PortfolioHolding, PortfolioSummary } from "@/types";

/** Thrown when a write would exceed MAX_HOLDINGS. */
export class PortfolioLimitError extends Error {
  constructor(count: number) {
    super(`A portfolio can hold at most ${MAX_HOLDINGS} holdings (this change would make ${count}).`);
    this.name = "PortfolioLimitError";
  }
}

export function toHolding(row: PortfolioHoldingRow): PortfolioHolding {
  return {
    id: row.id,
    name: row.name,
    sector: row.sector,
    region: row.region,
    aumUsdB: row.aumUsdB,
    irrPct: row.irrPct,
    riskScore: row.riskScore,
  };
}

function toData(input: HoldingInput) {
  return {
    name: input.name,
    sector: input.sector,
    region: input.region,
    aumUsdB: input.aumUsdM / 1000,
    irrPct: input.irrPct,
    riskScore: input.riskScore,
  };
}

function audit(action: string, holdingId: string | null, detail: unknown) {
  return prisma.portfolioAuditLog.create({
    data: { action, holdingId, detail: detail as Prisma.InputJsonValue },
  });
}

/**
 * Seed the demo holdings the first time the portfolio is ever read. The
 * "seeded" audit row makes this one-shot, so a client who deletes everything
 * gets an empty portfolio rather than the demo data back.
 */
async function ensureSeeded(): Promise<void> {
  const [count, seeded] = await Promise.all([
    prisma.portfolioHolding.count(),
    prisma.portfolioAuditLog.count({ where: { action: "seeded" } }),
  ]);
  if (count > 0 || seeded > 0) return;

  await prisma.$transaction([
    prisma.portfolioHolding.createMany({
      data: demoHoldings.map(({ id, ...rest }) => ({ id, ...rest })),
      skipDuplicates: true,
    }),
    audit("seeded", null, { count: demoHoldings.length, source: "mock-data/portfolio.ts" }),
  ]);
}

export async function listHoldings(): Promise<PortfolioHolding[]> {
  await ensureSeeded();
  const rows = await prisma.portfolioHolding.findMany({ orderBy: [{ sector: "asc" }, { name: "asc" }] });
  return rows.map(toHolding);
}

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  return summarizePortfolio(await listHoldings());
}

export async function createHolding(input: HoldingInput): Promise<PortfolioHolding> {
  const count = await prisma.portfolioHolding.count();
  if (count + 1 > MAX_HOLDINGS) throw new PortfolioLimitError(count + 1);

  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.portfolioHolding.create({ data: toData(input) });
    await tx.portfolioAuditLog.create({
      data: { action: "created", holdingId: created.id, detail: { after: toHolding(created) } as unknown as Prisma.InputJsonValue },
    });
    return created;
  });
  return toHolding(row);
}

/** Returns null when the holding does not exist. */
export async function updateHolding(id: string, input: HoldingInput): Promise<PortfolioHolding | null> {
  const row = await prisma.$transaction(async (tx) => {
    const before = await tx.portfolioHolding.findUnique({ where: { id } });
    if (!before) return null;
    const updated = await tx.portfolioHolding.update({ where: { id }, data: toData(input) });
    await tx.portfolioAuditLog.create({
      data: {
        action: "updated",
        holdingId: id,
        detail: { before: toHolding(before), after: toHolding(updated) } as unknown as Prisma.InputJsonValue,
      },
    });
    return updated;
  });
  return row ? toHolding(row) : null;
}

/** Returns false when the holding does not exist. */
export async function deleteHolding(id: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const before = await tx.portfolioHolding.findUnique({ where: { id } });
    if (!before) return false;
    await tx.portfolioHolding.delete({ where: { id } });
    await tx.portfolioAuditLog.create({
      data: { action: "deleted", holdingId: id, detail: { before: toHolding(before) } as unknown as Prisma.InputJsonValue },
    });
    return true;
  });
}

/** Bulk CSV import — all rows or none. */
export async function importHoldings(mode: "replace" | "append", inputs: HoldingInput[]): Promise<PortfolioHolding[]> {
  await ensureSeeded();
  const existing = mode === "append" ? await prisma.portfolioHolding.count() : 0;
  if (existing + inputs.length > MAX_HOLDINGS) throw new PortfolioLimitError(existing + inputs.length);

  await prisma.$transaction(async (tx) => {
    let removed = 0;
    if (mode === "replace") removed = (await tx.portfolioHolding.deleteMany({})).count;
    await tx.portfolioHolding.createMany({ data: inputs.map(toData) });
    await tx.portfolioAuditLog.create({
      data: {
        action: mode === "replace" ? "imported_replace" : "imported_append",
        detail: { added: inputs.length, removed } as unknown as Prisma.InputJsonValue,
      },
    });
  });
  return listHoldings();
}

export interface PortfolioAuditEntry {
  id: string;
  action: string;
  holdingId: string | null;
  summary: string;
  at: string;
}

function describe(action: string, detail: unknown): string {
  const d = (detail ?? {}) as {
    before?: PortfolioHolding;
    after?: PortfolioHolding;
    added?: number;
    removed?: number;
    count?: number;
  };
  switch (action) {
    case "created":
      return `Added ${d.after?.name ?? "a holding"}`;
    case "updated":
      return `Edited ${d.after?.name ?? d.before?.name ?? "a holding"}`;
    case "deleted":
      return `Deleted ${d.before?.name ?? "a holding"}`;
    case "imported_replace":
      return `CSV import replaced the portfolio (${d.removed ?? 0} removed, ${d.added ?? 0} added)`;
    case "imported_append":
      return `CSV import appended ${d.added ?? 0} holding(s)`;
    case "seeded":
      return `Loaded ${d.count ?? 0} demo holdings`;
    default:
      return action;
  }
}

export async function recentAudit(limit = 15): Promise<PortfolioAuditEntry[]> {
  const rows = await prisma.portfolioAuditLog.findMany({ orderBy: { at: "desc" }, take: limit });
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    holdingId: row.holdingId,
    summary: describe(row.action, row.detail),
    at: row.at.toISOString(),
  }));
}
