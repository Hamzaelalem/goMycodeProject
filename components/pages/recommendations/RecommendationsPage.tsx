"use client";

import { RecommendationCard } from "@/components/cards/RecommendationCard";
import { RecommendationDrawer } from "@/components/drawers/RecommendationDrawer";
import { RecommendationSkeleton } from "@/components/skeletons/RecommendationSkeleton";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRecommendationsViewModel } from "./useRecommendationsViewModel";

export default function RecommendationsPage() {
  const {
    recs,
    filtered,
    region,
    sector,
    risk,
    status,
    confidence,
    flaggedOnly,
    flaggedCount,
    generatingProvider,
    generationError,
    sectors,
    regions,
    setRegion,
    setSector,
    setRisk,
    setStatus,
    setConfidence,
    setFlaggedOnly,
    handleGenerateRecommendation,
    resetFilters,
  } = useRecommendationsViewModel();

  const generating = generatingProvider !== null;

  if (!recs.length) return <RecommendationSkeleton />;

  return (
    <div className="space-y-4">
      <div className="grid gap-2 rounded-xl border border-border p-3 md:grid-cols-4 lg:grid-cols-7">
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger><SelectValue placeholder="Region" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All regions</SelectItem>
            {regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sector} onValueChange={setSector}>
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
        <Button
          variant={flaggedOnly ? "default" : "outline"}
          onClick={() => setFlaggedOnly(!flaggedOnly)}
          aria-pressed={flaggedOnly}
        >
          Needs review{flaggedCount > 0 ? ` (${flaggedCount})` : ""}
        </Button>
        <Button variant="outline" onClick={resetFilters}>
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
              Uses current filters as focus, then saves a pending review item. Pick a provider.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => void handleGenerateRecommendation("gemini")}
            disabled={generating}
          >
            {generatingProvider === "gemini" ? "Generating…" : "Generate · Gemini"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => void handleGenerateRecommendation("ollama")}
            disabled={generating}
          >
            {generatingProvider === "ollama" ? "Generating…" : "Generate · Ollama"}
          </Button>
        </div>
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

