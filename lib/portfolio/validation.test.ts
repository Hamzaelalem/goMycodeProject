import { describe, expect, it } from "vitest";

import {
  CSV_TEMPLATE,
  holdingsToCsv,
  parseCsvCells,
  parsePortfolioCsv,
  validateHoldingInput,
} from "./validation";

const valid = { name: "Sahara Solar PPA", sector: "Solar & Energy", region: "North Africa", aumUsdM: 900, irrPct: 16.2, riskScore: 49 };

describe("validateHoldingInput", () => {
  it("accepts a valid holding and canonicalises sector/region casing", () => {
    const result = validateHoldingInput({ ...valid, sector: "solar & energy", region: "NORTH AFRICA" });
    expect(result).toEqual({ ok: true, value: valid });
  });

  it("accepts numbers formatted as text ($, commas, %)", () => {
    const result = validateHoldingInput({ ...valid, aumUsdM: "$1,250.5", irrPct: "12.3%", riskScore: "40" });
    expect(result.ok && result.value).toMatchObject({ aumUsdM: 1250.5, irrPct: 12.3, riskScore: 40 });
  });

  it("reports every invalid field", () => {
    const result = validateHoldingInput({ name: "x", sector: "Crypto", region: "Mars", aumUsdM: -1, irrPct: 500, riskScore: 55.5 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveLength(6);
  });
});

describe("CSV", () => {
  it("parses quoted cells with commas, CRLF and a BOM", () => {
    expect(parseCsvCells('﻿a,"b, c","d ""e"""\r\n1,2,3\r\n')).toEqual([
      ["a", "b, c", 'd "e"'],
      ["1", "2", "3"],
    ]);
  });

  it("round-trips the template", () => {
    const parsed = parsePortfolioCsv(CSV_TEMPLATE);
    expect(parsed.headerErrors).toEqual([]);
    expect(parsed.rows.every((r) => r.result.ok)).toBe(true);
    const values = parsed.rows.flatMap((r) => (r.result.ok ? [r.result.value] : []));
    expect(holdingsToCsv(values)).toBe(CSV_TEMPLATE);
  });

  it("accepts header aliases in any order and semicolon separators", () => {
    const parsed = parsePortfolioCsv("Risk;IRR;AUM;Region;Sector;Holding\n42;11.5;300;Europe;Banking;Test Bank\n");
    expect(parsed.rows[0]?.result).toEqual({
      ok: true,
      value: { name: "Test Bank", sector: "Banking", region: "Europe", aumUsdM: 300, irrPct: 11.5, riskScore: 42 },
    });
  });

  it("keeps thousands separators intact in semicolon files", () => {
    const parsed = parsePortfolioCsv("Holding;Sector;Region;AUM;IRR;Risk\n\"Lagos Port, Phase 2\";logistics;west africa;$1,100;12.4;58\n");
    expect(parsed.rows[0]?.result).toEqual({
      ok: true,
      value: { name: "Lagos Port, Phase 2", sector: "Logistics", region: "West Africa", aumUsdM: 1100, irrPct: 12.4, riskScore: 58 },
    });
  });

  it("reports missing columns and per-row errors with file line numbers", () => {
    expect(parsePortfolioCsv("name,sector\nA,Banking\n").headerErrors[0]).toMatch(/Missing column/);
    const parsed = parsePortfolioCsv(`${CSV_TEMPLATE}Bad Row,Crypto,North Africa,100,10,50\n`);
    const bad = parsed.rows.find((r) => !r.result.ok);
    expect(bad?.line).toBe(4);
  });

  it("rejects an empty file", () => {
    expect(parsePortfolioCsv("").headerErrors).toEqual(["The file is empty."]);
  });
});
