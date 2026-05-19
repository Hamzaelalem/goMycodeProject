"use client";

import { useMemo, useState } from "react";

import { RecommendationCard } from "@/components/cards/RecommendationCard";
import { RecommendationDrawer } from "@/components/drawers/RecommendationDrawer";
import { RecommendationSkeleton } from "@/components/skeletons/RecommendationSkeleton";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateRecommendationApi } from "@/lib/api/mutations";
import { useGlobalStore } from "@/lib/store/useGlobalStore";

export default function RecommendationsPage() {
  const recs = useGlobalStore((s) => s.recommendations);
  const activeRegionFilter = useGlobalStore((s) => s.activeRegionFilter);
  const activeSectorFilter = useGlobalStore((s) => s.activeSectorFilter);
  const setActiveRegionFilter = useGlobalStore((s) => s.setActiveRegionFilter);
  const setActiveSectorFilter = useGlobalStore((s) => s.setActiveSectorFilter);
  const bootstrapData = useGlobalStore((s) => s.bootstrapData);
  const region = activeRegionFilter ?? "all";
  const sector = activeSectorFilter ?? "all";
  const [risk, setRisk] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [confidence, setConfidence] = useState(60);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const sectors = useMemo(() => Array.from(new Set(recs.map((r) => r.sector))), [recs]);
  const regions = useMemo(() => Array.from(new Set(recs.map((r) => r.region))), [recs]);
  const filtered = useMemo(
    () =>
      recs.filter((r) => {
        if (region !== "all" && r.region !== region) return false;
        if (sector !== "all" && r.sector !== sector) return false;
        if (risk !== "all" && r.riskLevel !== risk) return false;
        if (status !== "all" && r.status !== status) return false;
        if (r.confidence < confidence) return false;
        return true;
      }),
    [confidence, recs, region, risk, sector, status],
  );

  async function handleGenerateRecommendation() {
    setGenerationError(null);
    setGenerating(true);
    const result = await generateRecommendationApi({
      focusSector: sector !== "all" ? sector : undefined,
      focusRegion: region !== "all" ? region : undefined,
      riskAppetite: risk !== "all" ? (risk as "low" | "medium" | "high") : undefined,
      horizonYears: 6,
    });
    if (!result.success) {
      setGenerationError(result.error ?? "Generation failed");
      setGenerating(false);
      return;
    }
    setRisk("all");
    setStatus("all");
    setConfidence(0);
    if (result.data) {
      setActiveRegionFilter(result.data.region);
      setActiveSectorFilter(result.data.sector);
    }
    await bootstrapData();
    setGenerating(false);
  }

  if (!recs.length) return <RecommendationSkeleton />;

  return (
    <div className="space-y-4">
      <div className="grid gap-2 rounded-xl border border-border p-3 md:grid-cols-6">
        <Select
          value={region}
          onValueChange={(v) => setActiveRegionFilter(v && v !== "all" ? v : null)}
        >
          <SelectTrigger><SelectValue placeholder="Region" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All regions</SelectItem>
            {regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select
          value={sector}
          onValueChange={(v) => setActiveSectorFilter(v && v !== "all" ? v : null)}
        >
          <SelectTrigger><SelectValue placeholder="Sector" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sectors</SelectItem>
            {sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={risk} onValueChange={(v) => setRisk(v ?? "all")}>
          <SelectTrigger><SelectValue placeholder="Risk" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All risk</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="pending_review">Pending</SelectItem>
            <SelectItem value="under_review">Under review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Confidence ≥ {confidence}</p>
          <Slider value={[confidence]} min={0} max={100} step={1} onValueChange={(v) => {
            const n = Array.isArray(v) ? v[0] : v;
            setConfidence(typeof n === "number" ? n : 60);
          }} />
        </div>
        <Button variant="outline" onClick={() => {
          setActiveRegionFilter(null);
          setActiveSectorFilter(null);
          setRisk("all");
          setStatus("all");
          setConfidence(60);
        }}>
          Reset filters
        </Button>
      </div>
      <div className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <p className="font-medium">Generate RAG recommendation</p>
          {generationError ? (
            <p className="text-xs text-destructive">{generationError}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Uses current filters as focus, then saves a pending review item.
            </p>
          )}
        </div>
        <Button onClick={() => void handleGenerateRecommendation()} disabled={generating}>
          {generating ? "Generating..." : "Generate"}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
          No items match your filters.
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => <RecommendationCard key={r.id} rec={r} />)}
        </div>
      )}

      <RecommendationDrawer />
    </div>
  );
}
