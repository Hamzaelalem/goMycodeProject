"use client";

import { useEffect, useMemo, useState } from "react";

import {
  createHoldingApi,
  deleteHoldingApi,
  fetchPortfolioApi,
  importHoldingsApi,
  updateHoldingApi,
} from "@/lib/api/mutations";
import type { PortfolioAuditEntry } from "@/lib/portfolio/repository";
import {
  CSV_TEMPLATE,
  type CsvParseResult,
  type HoldingInput,
  holdingsToCsv,
  MAX_HOLDINGS,
  parsePortfolioCsv,
  PORTFOLIO_REGIONS,
  PORTFOLIO_SECTORS,
  validateHoldingInput,
} from "@/lib/portfolio/validation";
import { useGlobalStore } from "@/lib/store/useGlobalStore";
import type { PortfolioHolding } from "@/types";

/** Form state keeps raw strings so users can type freely; validated on save. */
export interface HoldingDraft {
  name: string;
  sector: string;
  region: string;
  aumUsdM: string;
  irrPct: string;
  riskScore: string;
}

const EMPTY_DRAFT: HoldingDraft = {
  name: "",
  sector: PORTFOLIO_SECTORS[0],
  region: PORTFOLIO_REGIONS[0],
  aumUsdM: "",
  irrPct: "",
  riskScore: "",
};

export const toAumUsdM = (holding: PortfolioHolding) => Math.round(holding.aumUsdB * 1000 * 100) / 100;

function draftFrom(holding: PortfolioHolding): HoldingDraft {
  return {
    name: holding.name,
    sector: holding.sector,
    region: holding.region,
    aumUsdM: String(toAumUsdM(holding)),
    irrPct: String(holding.irrPct),
    riskScore: String(holding.riskScore),
  };
}

function toInput(holding: PortfolioHolding): HoldingInput {
  return {
    name: holding.name,
    sector: holding.sector,
    region: holding.region,
    aumUsdM: toAumUsdM(holding),
    irrPct: holding.irrPct,
    riskScore: holding.riskScore,
  };
}

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function usePortfolioViewModel() {
  const portfolio = useGlobalStore((s) => s.portfolio);
  const setPortfolio = useGlobalStore((s) => s.setPortfolio);

  const [audit, setAudit] = useState<PortfolioAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null); // "new" = add row
  const [draft, setDraft] = useState<HoldingDraft>(EMPTY_DRAFT);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [csv, setCsv] = useState<{ fileName: string; parsed: CsvParseResult } | null>(null);
  const [importing, setImporting] = useState(false);

  function applyLoaded(result: Awaited<ReturnType<typeof fetchPortfolioApi>>) {
    setLoading(false);
    if (!result.success || !result.data) {
      setError(result.error ?? "Failed to load portfolio");
      return;
    }
    const { totalAumB, weightedIrrPct, weightedRiskScore, holdings, audit: entries } = result.data;
    setPortfolio({ totalAumB, weightedIrrPct, weightedRiskScore, holdings });
    setAudit(entries);
    setError(null);
  }

  async function load() {
    applyLoaded(await fetchPortfolioApi());
  }

  useEffect(() => {
    let cancelled = false;
    void fetchPortfolioApi().then((result) => {
      if (!cancelled) applyLoaded(result);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const holdings = portfolio.holdings;
  const atCapacity = holdings.length >= MAX_HOLDINGS;

  const weights = useMemo(() => {
    const total = holdings.reduce((sum, h) => sum + h.aumUsdB, 0);
    return Object.fromEntries(
      holdings.map((h) => [h.id, total > 0 ? Math.round((h.aumUsdB / total) * 1000) / 10 : 0]),
    );
  }, [holdings]);

  function startAdd() {
    setEditingId("new");
    setDraft(EMPTY_DRAFT);
    setFormErrors([]);
    setConfirmDeleteId(null);
  }

  function startEdit(holding: PortfolioHolding) {
    setEditingId(holding.id);
    setDraft(draftFrom(holding));
    setFormErrors([]);
    setConfirmDeleteId(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setFormErrors([]);
  }

  function updateDraft(field: keyof HoldingDraft, value: string) {
    setDraft((d) => ({ ...d, [field]: value }));
  }

  async function saveDraft() {
    const validation = validateHoldingInput(draft);
    if (!validation.ok) {
      setFormErrors(validation.errors);
      return;
    }
    setSaving(true);
    const result =
      editingId === "new"
        ? await createHoldingApi(validation.value)
        : await updateHoldingApi(editingId!, validation.value);
    setSaving(false);
    if (!result.success) {
      setFormErrors(result.details ?? [result.error ?? "Save failed"]);
      return;
    }
    setNotice(editingId === "new" ? `Added ${validation.value.name}.` : `Saved ${validation.value.name}.`);
    setEditingId(null);
    await load();
  }

  async function confirmDelete(holding: PortfolioHolding) {
    const result = await deleteHoldingApi(holding.id);
    setConfirmDeleteId(null);
    if (!result.success) {
      setError(result.error ?? "Delete failed");
      return;
    }
    setNotice(`Deleted ${holding.name}.`);
    await load();
  }

  async function onCsvFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    setCsv({ fileName: file.name, parsed: parsePortfolioCsv(text) });
    setNotice(null);
  }

  const csvValidRows = useMemo(
    () => csv?.parsed.rows.flatMap((r) => (r.result.ok ? [r.result.value] : [])) ?? [],
    [csv],
  );
  const csvInvalidCount = (csv?.parsed.rows.length ?? 0) - csvValidRows.length;
  const csvReady =
    !!csv && csv.parsed.headerErrors.length === 0 && csvValidRows.length > 0 && csvInvalidCount === 0;
  const canReplace = csvReady && csvValidRows.length <= MAX_HOLDINGS;
  const canAppend = csvReady && holdings.length + csvValidRows.length <= MAX_HOLDINGS;

  async function importCsv(mode: "replace" | "append") {
    if (!csvReady) return;
    setImporting(true);
    const result = await importHoldingsApi(mode, csvValidRows);
    setImporting(false);
    if (!result.success || !result.data) {
      setError([result.error, ...(result.details ?? [])].filter(Boolean).join(" — "));
      return;
    }
    setNotice(
      mode === "replace"
        ? `Portfolio replaced with ${result.data.imported} holdings from ${csv!.fileName}.`
        : `Appended ${result.data.imported} holdings from ${csv!.fileName}.`,
    );
    setCsv(null);
    await load();
  }

  return {
    portfolio,
    holdings,
    weights,
    audit,
    loading,
    error,
    notice,
    setNotice,
    setError,
    atCapacity,
    maxHoldings: MAX_HOLDINGS,
    sectors: PORTFOLIO_SECTORS,
    regions: PORTFOLIO_REGIONS,
    editingId,
    draft,
    formErrors,
    saving,
    startAdd,
    startEdit,
    cancelEdit,
    updateDraft,
    saveDraft,
    confirmDeleteId,
    setConfirmDeleteId,
    confirmDelete,
    csv,
    csvValidRows,
    csvInvalidCount,
    canReplace,
    canAppend,
    importing,
    onCsvFile,
    clearCsv: () => setCsv(null),
    importCsv,
    downloadTemplate: () => downloadText("portfolio-template.csv", CSV_TEMPLATE),
    exportCsv: () => downloadText("my-portfolio.csv", holdingsToCsv(holdings.map(toInput))),
  };
}
