"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useNavigateFromSignal } from "@/lib/hooks/useSignalNavigation";
import { useGlobalStore } from "@/lib/store/useGlobalStore";
import type { Recommendation, Signal } from "@/types";

type Result =
  | { kind: "recommendation"; id: string; label: string; meta: string; payload: Recommendation }
  | { kind: "signal"; id: string; label: string; meta: string; payload: Signal }
  | { kind: "risk"; id: string; label: string; meta: string; payload: string };

function useCmdK(onOpen: () => void) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isK = e.key.toLowerCase() === "k";
      if ((e.metaKey || e.ctrlKey) && isK) {
        e.preventDefault();
        onOpen();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onOpen]);
}

export function GlobalSearch() {
  const router = useRouter();
  const navigateFromSignal = useNavigateFromSignal();
  const recs = useGlobalStore((s) => s.recommendations);
  const signals = useGlobalStore((s) => s.signals);
  const setSelectedRecommendation = useGlobalStore((s) => s.setSelectedRecommendation);
  const setActiveRiskFactor = useGlobalStore((s) => s.setActiveRiskFactor);
  const setActiveRegionFilter = useGlobalStore((s) => s.setActiveRegionFilter);
  const setActiveSectorFilter = useGlobalStore((s) => s.setActiveSectorFilter);
  const setSelectedSignal = useGlobalStore((s) => s.setSelectedSignal);
  const setWorkflowFocusRecommendationId = useGlobalStore((s) => s.setWorkflowFocusRecommendationId);

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  useCmdK(() => setOpen(true));

  const results = useMemo<Result[]>(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];

    const recHits: Result[] = recs
      .filter((r) => r.title.toLowerCase().includes(query) || r.sector.toLowerCase().includes(query))
      .slice(0, 6)
      .map((r) => ({
        kind: "recommendation",
        id: r.id,
        label: r.title,
        meta: `${r.sector} · ${r.region}`,
        payload: r,
      }));

    const sigHits: Result[] = signals
      .filter((s) => s.title.toLowerCase().includes(query) || s.sector.toLowerCase().includes(query))
      .slice(0, 6)
      .map((s) => ({
        kind: "signal",
        id: s.id,
        label: s.title,
        meta: `${s.type} · ${s.severity}`,
        payload: s,
      }));

    const riskFactors = Array.from(
      new Set(recs.flatMap((r) => r.riskFactors)),
    ).filter((rf) => rf.toLowerCase().includes(query));

    const riskHits: Result[] = riskFactors.slice(0, 6).map((rf) => ({
      kind: "risk",
      id: rf,
      label: rf,
      meta: "Risk factor",
      payload: rf,
    }));

    return [...recHits, ...sigHits, ...riskHits];
  }, [q, recs, signals]);

  function onPick(r: Result) {
    if (r.kind === "recommendation") {
      setSelectedRecommendation(r.payload);
      router.push("/recommendations");
    } else if (r.kind === "signal") {
      navigateFromSignal(r.payload);
    } else {
      setSelectedSignal(null);
      setWorkflowFocusRecommendationId(null);
      setActiveRegionFilter(null);
      setActiveSectorFilter(null);
      setActiveRiskFactor(r.payload);
      router.push("/live-feed");
    }
    setOpen(false);
    setQ("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" size="sm" className="gap-2">
            <Search className="h-4 w-4" aria-hidden />
            <span className="hidden sm:inline">Search</span>
            <span className="ml-1 hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
              Ctrl K
            </span>
          </Button>
        }
      />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Search</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Recommendations, signals, risk factors…"
            autoFocus
          />
          <div className="max-h-[360px] overflow-auto rounded-lg border border-border">
            {results.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">No results.</div>
            ) : (
              <ul className="divide-y divide-border">
                {results.map((r) => (
                  <li key={`${r.kind}:${r.id}`}>
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => onPick(r)}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{r.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">{r.meta}</span>
                      </span>
                      <span className="shrink-0 rounded border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                        {r.kind}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
