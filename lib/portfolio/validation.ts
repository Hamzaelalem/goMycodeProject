/**
 * Portfolio holding validation + CSV import/export. Dependency-free and shared by
 * the "My Portfolio" page (CSV preview) and the API, so both enforce identical rules.
 */

/** The nine sectors from the brief — must match ESG sector names exactly. */
export const PORTFOLIO_SECTORS = [
  "Solar & Energy",
  "Oil & Gas",
  "Properties",
  "Banking",
  "Hospitals",
  "Hotels",
  "Water Treatment",
  "Agriculture",
  "Logistics",
] as const;

export const PORTFOLIO_REGIONS = [
  "North Africa",
  "West Africa",
  "East Africa",
  "Central Africa",
  "Southern Africa",
  "Sub-Saharan Africa",
  "Middle East",
  "Europe",
  "Asia",
  "Americas",
] as const;

/**
 * Upper bound on holdings: one Sentinel scan sends every holding + its headlines
 * to the LLM, and ~25 holdings is what fits Groq's free-tier tokens/minute.
 */
export const MAX_HOLDINGS = 25;

/** What a client enters (AUM in $M — the unit people think in). */
export interface HoldingInput {
  name: string;
  sector: string;
  region: string;
  aumUsdM: number;
  irrPct: number;
  riskScore: number;
}

export type HoldingValidation =
  | { ok: true; value: HoldingInput }
  | { ok: false; errors: string[] };

function canonical(value: unknown, options: readonly string[]): string | undefined {
  const text = String(value ?? "").trim().toLowerCase();
  return options.find((option) => option.toLowerCase() === text);
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  const text = String(value ?? "").trim().replace(/[$,%\s]/g, "");
  if (!text) return undefined;
  const n = Number(text);
  return Number.isFinite(n) ? n : undefined;
}

export function validateHoldingInput(raw: unknown): HoldingValidation {
  const record = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const errors: string[] = [];

  const name = String(record.name ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) errors.push("name must be 2–80 characters");

  const sector = canonical(record.sector, PORTFOLIO_SECTORS);
  if (!sector) errors.push(`sector must be one of: ${PORTFOLIO_SECTORS.join(", ")}`);

  const region = canonical(record.region, PORTFOLIO_REGIONS);
  if (!region) errors.push(`region must be one of: ${PORTFOLIO_REGIONS.join(", ")}`);

  const aumUsdM = toNumber(record.aumUsdM);
  if (aumUsdM === undefined || aumUsdM <= 0 || aumUsdM > 100_000) {
    errors.push("AUM ($M) must be a number between 0 and 100,000");
  }

  const irrPct = toNumber(record.irrPct);
  if (irrPct === undefined || irrPct < -50 || irrPct > 100) {
    errors.push("IRR % must be a number between -50 and 100");
  }

  const riskScore = toNumber(record.riskScore);
  if (riskScore === undefined || !Number.isInteger(riskScore) || riskScore < 0 || riskScore > 100) {
    errors.push("risk score must be a whole number between 0 and 100");
  }

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    value: {
      name,
      sector: sector!,
      region: region!,
      aumUsdM: Math.round(aumUsdM! * 100) / 100,
      irrPct: Math.round(irrPct! * 10) / 10,
      riskScore: riskScore!,
    },
  };
}

// ── CSV ─────────────────────────────────────────────────────────────────────

export const CSV_HEADERS = ["name", "sector", "region", "aum_usd_m", "irr_pct", "risk_score"] as const;

/** Accepted header spellings → HoldingInput field. */
const HEADER_ALIASES: Record<string, keyof HoldingInput> = {
  name: "name",
  holding: "name",
  asset: "name",
  sector: "sector",
  region: "region",
  aum_usd_m: "aumUsdM",
  aum: "aumUsdM",
  aumusdm: "aumUsdM",
  "aum ($m)": "aumUsdM",
  irr_pct: "irrPct",
  irr: "irrPct",
  irrpct: "irrPct",
  "irr %": "irrPct",
  risk_score: "riskScore",
  risk: "riskScore",
  riskscore: "riskScore",
};

/**
 * Delimiter from the header line: `;` (Excel in French/European locales) when it
 * has more semicolons than commas, otherwise `,`. Only one delimiter is used, so
 * "$1,100" stays one cell in a semicolon file.
 */
function detectDelimiter(input: string): "," | ";" {
  const header = input.split(/\r?\n/, 1)[0] ?? "";
  const count = (ch: string) => header.split(ch).length - 1;
  return count(";") > count(",") ? ";" : ",";
}

/** Split CSV text into rows of cells (RFC 4180 quotes, CRLF, BOM, `,` or `;`). */
export function parseCsvCells(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "");
  const delimiter = detectDelimiter(input);

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

export interface CsvRowResult {
  /** 1-based line number in the file (header = line 1). */
  line: number;
  result: HoldingValidation;
}

export interface CsvParseResult {
  headerErrors: string[];
  rows: CsvRowResult[];
}

export function parsePortfolioCsv(text: string): CsvParseResult {
  const cells = parseCsvCells(text);
  if (cells.length === 0) return { headerErrors: ["The file is empty."], rows: [] };

  const header = cells[0]!.map((h) => HEADER_ALIASES[h.trim().toLowerCase()]);
  const missing = (["name", "sector", "region", "aumUsdM", "irrPct", "riskScore"] as const).filter(
    (field) => !header.includes(field),
  );
  if (missing.length) {
    return {
      headerErrors: [`Missing column(s): ${missing.join(", ")}. Expected header: ${CSV_HEADERS.join(",")}`],
      rows: [],
    };
  }

  const rows = cells.slice(1).map((line, index) => {
    const record: Record<string, string> = {};
    header.forEach((field, col) => {
      if (field) record[field] = line[col] ?? "";
    });
    return { line: index + 2, result: validateHoldingInput(record) };
  });
  return { headerErrors: [], rows };
}

function csvEscape(value: string | number): string {
  const text = String(value);
  return /[",;\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function holdingsToCsv(holdings: HoldingInput[]): string {
  const lines = holdings.map((h) =>
    [h.name, h.sector, h.region, h.aumUsdM, h.irrPct, h.riskScore].map(csvEscape).join(","),
  );
  return [CSV_HEADERS.join(","), ...lines].join("\n") + "\n";
}

export const CSV_TEMPLATE = holdingsToCsv([
  { name: "Sahara Solar PPA", sector: "Solar & Energy", region: "North Africa", aumUsdM: 900, irrPct: 16.2, riskScore: 49 },
  { name: "Gulf Care Network", sector: "Hospitals", region: "Middle East", aumUsdM: 900, irrPct: 13.7, riskScore: 43 },
]);
