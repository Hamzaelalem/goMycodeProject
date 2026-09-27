"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getSentinelScanApi,
  listSentinelScansApi,
  scanAndRebalanceApi,
  signOffSentinelScanApi,
} from "@/lib/api/mutations";
import {
  countActions,
  simulateRebalance,
  type RebalanceResponse,
  type SentinelScanSummary,
} from "@/lib/sentinel/rebalance";

export function usePortfolioSentinelViewModel() {
  const [result, setResult] = useState<RebalanceResponse | null>(null);
  const [history, setHistory] = useState<SentinelScanSummary[]>([]);
  const [scanning, setScanning] = useState(false);
  const [signingOff, setSigningOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedOff, setSignedOff] = useState(false);

  async function refreshHistory() {
    const response = await listSentinelScansApi();
    if (response.success && response.data) setHistory(response.data.scans);
  }

  /** Show a saved scan; a scan that was already signed off stays locked. */
  function show(scan: RebalanceResponse) {
    setResult(scan);
    setSignedOff(Boolean(scan.signedOffAt));
    setError(null);
  }

  // Restore the latest saved scan so results survive a reload.
  useEffect(() => {
    let cancelled = false;
    void listSentinelScansApi().then(async (response) => {
      if (cancelled || !response.success || !response.data) return;
      setHistory(response.data.scans);
      const latest = response.data.scans[0];
      if (!latest) return;
      const scan = await getSentinelScanApi(latest.scanId);
      if (!cancelled && scan.success && scan.data) show(scan.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function scan() {
    setScanning(true);
    setError(null);
    try {
      const response = await scanAndRebalanceApi();
      if (!response.success || !response.data) {
        setError(response.error ?? "Scan failed");
        return;
      }
      // A new scan starts unsigned — any previous sign-off belongs to its own scan.
      show(response.data);
      await refreshHistory();
    } finally {
      setScanning(false);
    }
  }

  async function openScan(scanId: string) {
    if (scanId === result?.scanId) return;
    const response = await getSentinelScanApi(scanId);
    if (!response.success || !response.data) {
      setError(response.error ?? "Could not load that scan");
      return;
    }
    show(response.data);
  }

  async function applySimulatedRebalance() {
    if (!result || !signedOff || result.signedOffAt) return;
    if (!result.scanId) {
      // Scan could not be saved (DB down): simulate locally, clearly unrecorded.
      setResult({ ...result, appliedWeights: simulateRebalance(result.assets), signedOffAt: new Date().toISOString(), signedOffBy: null });
      return;
    }
    setSigningOff(true);
    const response = await signOffSentinelScanApi(result.scanId);
    setSigningOff(false);
    if (!response.success || !response.data) {
      setError(response.error ?? "Sign-off failed");
      return;
    }
    show(response.data);
    await refreshHistory();
  }

  const counts = useMemo(() => countActions(result?.assets ?? []), [result]);
  const actionable = counts.BUY + counts.SELL;

  return {
    result,
    history,
    scanning,
    signingOff,
    error,
    signedOff,
    setSignedOff,
    appliedWeights: result?.appliedWeights ?? null,
    appliedAt: result?.signedOffAt ?? null,
    recorded: Boolean(result?.scanId),
    counts,
    actionable,
    scan,
    openScan,
    applySimulatedRebalance,
  };
}
