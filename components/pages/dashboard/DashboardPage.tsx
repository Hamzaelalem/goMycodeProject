"use client";

import Link from "next/link";
import { Sparkles, Loader2 } from "lucide-react";
import { KPICard } from "@/components/cards/KPICard";
import { RiskTrendLine } from "@/components/charts/RiskTrendLine";
import { RiskRadarChart } from "@/components/charts/RiskRadarChart";
import { ESGBarChart } from "@/components/charts/ESGBarChart";
import { RecommendationCard } from "@/components/cards/RecommendationCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useGlobalStore } from "@/lib/store/useGlobalStore";
import { useDashboardViewModel } from "./useDashboardViewModel";

export default function DashboardPage() {
  const openAIDrawer = useGlobalStore((s) => s.openAIDrawer);
  const {
    kpis,
    riskLine,
    esgSectors,
    topRecs,
    liveFeedPreview,
    activeRegionFilter,
    activeSectorFilter,
    setActiveRegionFilter,
    setActiveSectorFilter,
    availableRegions,
    availableSectors,
    filteredRiskScores,
    statusCounts,
    summaryText,
    summaryLoading,
  } = useDashboardViewModel();

  const getPercentage = (count: number) => {
    return Math.round((count / Math.max(1, statusCounts.total)) * 100);
  };

  return (
    <div className="space-y-4">
      {/* Filters & Header Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border bg-card p-3 shadow-xs">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Executive Dashboard</h1>
          <p className="text-xs text-muted-foreground">Dynamic decision-making overview and analytics.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={activeRegionFilter ?? "all"} onValueChange={(val) => setActiveRegionFilter(val === "all" ? null : val)}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Region" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {availableRegions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={activeSectorFilter ?? "all"} onValueChange={(val) => setActiveSectorFilter(val === "all" ? null : val)}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Sector" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sectors</SelectItem>
              {availableSectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>

          {(activeRegionFilter || activeSectorFilter) && (
            <Button variant="ghost" size="sm" onClick={() => { setActiveRegionFilter(null); setActiveSectorFilter(null); }} className="h-8 text-xs">
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* AI Executive Summary Panel */}
      <Card className="relative overflow-hidden border border-violet-500/25 bg-linear-to-r from-violet-500/5 via-fuchsia-500/5 to-transparent shadow-xs dark:border-violet-500/30">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400">AI Executive Summary</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 hover:text-violet-700"
                onClick={() => openAIDrawer(`Summarize the dashboard under current filters (Region: ${activeRegionFilter ?? "Global"}, Sector: ${activeSectorFilter ?? "All"}).`)}
              >
                Refine in Chat &rarr;
              </Button>
            </div>
            {summaryLoading ? (
              <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                <span>Generating summary...</span>
              </div>
            ) : (
              <p className="text-sm text-foreground leading-relaxed pr-6">{summaryText}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI Stats Grid */}
      <div className="grid gap-3 md:grid-cols-4">
        <KPICard label="Total recommendations" value={`${kpis.totalRecommendations}`} />
        <KPICard label="Avg confidence" value={`${kpis.avgConfidence}%`} />
        <KPICard label="Portfolio risk" value={`${kpis.portfolioRisk}`} />
        <KPICard label="ESG score" value={`${kpis.esgScore}`} />
      </div>

      {/* Charts (Risk Tabbed + ESG Breakdown) */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="flex flex-col">
          <Tabs defaultValue="trend" className="flex flex-col h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Risk analysis</CardTitle>
              <TabsList className="h-8">
                <TabsTrigger value="trend">Trend</TabsTrigger>
                <TabsTrigger value="radar">Radar</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="min-w-0 flex-1">
              <TabsContent value="trend" className="h-full">
                <RiskTrendLine points={riskLine} />
              </TabsContent>
              <TabsContent value="radar" className="h-full">
                <RiskRadarChart factors={filteredRiskScores} />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ESG breakdown by sector</CardTitle>
          </CardHeader>
          <CardContent className="min-w-0">
            <ESGBarChart sectors={esgSectors} />
          </CardContent>
        </Card>
      </div>

      {/* Top Recommendations */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold tracking-tight">Top recommendations</h2>
        <div className="grid gap-3 lg:grid-cols-3">
          {topRecs.map((r) => (
            <RecommendationCard key={r.id} rec={r} />
          ))}
          {topRecs.length === 0 && (
            <div className="col-span-3 rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No recommendations match the selected filters.
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Live Feed Preview & Portfolio Health status breakdown */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Live feed preview</CardTitle>
            <Link href="/live-feed" className="text-xs text-primary hover:underline">
              View full feed &rarr;
            </Link>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2.5">
            {liveFeedPreview.map((s) => (
              <div key={s.id} className="flex items-center gap-2 truncate">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">{s.title}</span>
              </div>
            ))}
            {liveFeedPreview.length === 0 && (
              <p className="text-xs italic">No new signals available.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Portfolio health & pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Approved status */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Approved
                </span>
                <span className="text-muted-foreground">{statusCounts.approved} ({getPercentage(statusCounts.approved)}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${getPercentage(statusCounts.approved)}%` }} />
              </div>
            </div>

            {/* Under review status */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  Under Review
                </span>
                <span className="text-muted-foreground">{statusCounts.underReview} ({getPercentage(statusCounts.underReview)}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${getPercentage(statusCounts.underReview)}%` }} />
              </div>
            </div>

            {/* Pending status */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Pending Review
                </span>
                <span className="text-muted-foreground">{statusCounts.pendingReview} ({getPercentage(statusCounts.pendingReview)}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${getPercentage(statusCounts.pendingReview)}%` }} />
              </div>
            </div>

            {/* Rejected status */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  Rejected
                </span>
                <span className="text-muted-foreground">{statusCounts.rejected} ({getPercentage(statusCounts.rejected)}%)</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${getPercentage(statusCounts.rejected)}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


