"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useGlobalStore } from "@/lib/store/useGlobalStore";
import { useFilteredSignals } from "@/lib/hooks/useCrossModuleFilter";
import { useSignalActions } from "@/lib/hooks/useSignalActions";
import { getIngestStatusApi, ingestNewsApi, setIngestModeApi } from "@/lib/api/mutations";
import type { IngestMode, IngestSummary } from "@/lib/ingest/types";
import type { Signal } from "@/types";

export function useLiveFeedViewModel() {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const signals = useGlobalStore((s) => s.signals);
  const {
    selectedSignal,
    navigateFromSignal,
    handleSelect: selectSignal,
    handleAIAssessment,
    handleStressTest,
  } = useSignalActions();

  const [type, setType] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [region, setRegion] = useState("all");
  const [sector, setSector] = useState("all");
  const [ingesting, setIngesting] = useState(false);
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);
  const [ingestMode, setIngestMode] = useState<IngestMode>("auto");
  const [lastRun, setLastRun] = useState<IngestSummary | null>(null);
  // When set, signals arriving above this id are buffered (shown as a pill)
  // instead of shifting the list under the user. Cleared on scroll-to-top.
  const [frozenTopId, setFrozenTopId] = useState<string | null>(null);

  // Load the current server-side fetch mode + last run on mount.
  useEffect(() => {
    let active = true;
    void getIngestStatusApi().then((status) => {
      if (!active || !status) return;
      setIngestMode(status.mode);
      setLastRun(status.lastRun);
    });
    return () => {
      active = false;
    };
  }, []);

  // The acknowledged snapshot: everything from the frozen boundary downward.
  const displayed = useMemo<Signal[]>(() => {
    if (frozenTopId === null) return signals;
    const idx = signals.findIndex((s) => s.id === frozenTopId);
    return idx <= 0 ? signals : signals.slice(idx);
  }, [signals, frozenTopId]);

  const linkedDisplayed = useFilteredSignals(displayed);
  const linkedAll = useFilteredSignals(signals);

  const applyLocalFilters = useCallback(
    (list: Signal[]) =>
      list.filter((s) => {
        if (type !== "all" && s.type !== type) return false;
        if (severity !== "all" && s.severity !== severity) return false;
        if (region !== "all" && s.region !== region) return false;
        if (sector !== "all" && s.sector !== sector) return false;
        return true;
      }),
    [region, sector, severity, type],
  );

  const rows = useMemo(() => applyLocalFilters(linkedDisplayed), [applyLocalFilters, linkedDisplayed]);

  const pendingCount = useMemo(() => {
    const shown = new Set(rows.map((s) => s.id));
    return applyLocalFilters(linkedAll).filter((s) => !shown.has(s.id)).length;
  }, [applyLocalFilters, linkedAll, rows]);

  const bySource = useMemo(
    () => ({
      bloomberg: rows.filter((s) => s.source === "bloomberg").length,
      talkwalker: rows.filter((s) => s.source === "talkwalker").length,
      internal: rows.filter((s) => s.source === "internal").length,
    }),
    [rows],
  );

  const regions = useMemo(() => Array.from(new Set(signals.map((s) => s.region))), [signals]);
  const sectors = useMemo(() => Array.from(new Set(signals.map((s) => s.sector))), [signals]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => (rows[index]?.id === selectedSignal?.id ? 240 : 112),
    overscan: 8,
  });

  // Re-measure when selection changes to adjust offsets dynamically
  useEffect(() => {
    virtualizer.measure();
  }, [selectedSignal?.id, virtualizer]);

  // Freeze/unfreeze the top boundary based on scroll position so live inserts
  // don't shift the list while the user is reading further down.
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop <= 8) {
        setFrozenTopId((cur) => (cur !== null ? null : cur));
      } else {
        setFrozenTopId((cur) => cur ?? useGlobalStore.getState().signals[0]?.id ?? null);
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  function handleSelect(s: Signal) {
    // Freeze when opening a row so incoming signals don't push it around.
    if (frozenTopId === null && selectedSignal?.id !== s.id) {
      setFrozenTopId(useGlobalStore.getState().signals[0]?.id ?? null);
    }
    selectSignal(s);
  }

  function revealPending() {
    setFrozenTopId(null);
    parentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetFilters() {
    setType("all");
    setSeverity("all");
    setRegion("all");
    setSector("all");
  }

  async function handleIngestNews() {
    if (ingesting || ingestMode === "off") return;
    setIngesting(true);
    setIngestStatus("Fetching latest news from the web…");
    const result = await ingestNewsApi();
    if (result.success && result.data) {
      const { inserted, fetched, classifier } = result.data;
      setLastRun(result.data);
      setIngestStatus(
        inserted > 0
          ? `Added ${inserted} new signal${inserted === 1 ? "" : "s"} (from ${fetched} articles, ${classifier}). Streaming in…`
          : `No new signals — all ${fetched} articles already ingested.`,
      );
    } else {
      setIngestStatus(`Fetch failed: ${result.error ?? "unknown error"}`);
    }
    setIngesting(false);
  }

  async function handleSetMode(mode: IngestMode) {
    const previous = ingestMode;
    setIngestMode(mode); // optimistic
    const result = await setIngestModeApi(mode);
    if (!result.success) {
      setIngestMode(previous);
      setIngestStatus(`Could not change mode: ${result.error ?? "unknown error"}`);
      return;
    }
    setIngestStatus(
      mode === "auto"
        ? "Automatic fetching on (every 30 min)."
        : mode === "manual"
          ? "On-demand only — use “Fetch latest news”."
          : "Fetching off — no signals will be pulled.",
    );
  }

  return {
    parentRef,
    selectedSignal,
    rows,
    bySource,
    regions,
    sectors,
    type,
    setType,
    severity,
    setSeverity,
    region,
    setRegion,
    sector,
    setSector,
    resetFilters,
    navigateFromSignal,
    virtualizer,
    handleSelect,
    handleAIAssessment,
    handleStressTest,
    ingesting,
    ingestStatus,
    handleIngestNews,
    ingestMode,
    handleSetMode,
    pendingCount,
    revealPending,
    lastRun,
  };
}
