import { Brain, Gauge, ArrowUpRight, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SeverityBar } from "@/components/ui/severity-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { TimeAgo } from "@/components/ui/time-ago";
import { useLiveFeedViewModel } from "./useLiveFeedViewModel";

export default function LiveFeedPage() {
  const {
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
  } = useLiveFeedViewModel();

  const MODES: { value: "auto" | "manual" | "off"; label: string }[] = [
    { value: "auto", label: "Auto" },
    { value: "manual", label: "On-demand" },
    { value: "off", label: "Off" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Live Feed (virtualized)</CardTitle>
            {lastRun?.finishedAt && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Updated <TimeAgo iso={lastRun.finishedAt} /> · {lastRun.inserted} new
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ingestStatus && (
              <span className="max-w-[22rem] truncate text-xs text-muted-foreground">
                {ingestStatus}
              </span>
            )}
            <div className="flex items-center rounded-lg border border-border p-0.5" role="group" aria-label="Fetch mode">
              {MODES.map((m) => (
                <Button
                  key={m.value}
                  size="sm"
                  variant={ingestMode === m.value ? "default" : "ghost"}
                  onClick={() => void handleSetMode(m.value)}
                >
                  {m.label}
                </Button>
              ))}
            </div>
            <Button
              size="sm"
              onClick={() => void handleIngestNews()}
              disabled={ingesting || ingestMode === "off"}
            >
              {ingesting ? "Fetching…" : "Fetch latest news"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <Card><CardContent className="p-2 text-sm">Signals {rows.length}</CardContent></Card>
          <Card><CardContent className="p-2 text-sm">Bloomberg {bySource.bloomberg}</CardContent></Card>
          <Card><CardContent className="p-2 text-sm">Talkwalker {bySource.talkwalker}</CardContent></Card>
          <Card><CardContent className="p-2 text-sm">Internal {bySource.internal}</CardContent></Card>
        </div>
        <div className="mb-3 grid gap-2 md:grid-cols-5">
          <div className="flex flex-wrap gap-1">
            {["all", "risk", "opportunity", "policy", "deal", "market"].map((t) => (
              <Button key={t} size="sm" variant={type === t ? "default" : "outline"} onClick={() => setType(t)}>
                {t}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {["all", "critical", "high", "medium", "low"].map((s) => (
              <Button key={s} size="sm" variant={severity === s ? "default" : "outline"} onClick={() => setSeverity(s)}>
                {s}
              </Button>
            ))}
          </div>
          <Select value={region} onValueChange={(v) => setRegion(v ?? "all")}>
            <SelectTrigger><SelectValue placeholder="Region" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All regions</SelectItem>
              {regions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sector} onValueChange={(v) => setSector(v ?? "all")}>
            <SelectTrigger><SelectValue placeholder="Sector" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sectors</SelectItem>
              {sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={resetFilters}>
            Reset
          </Button>
        </div>
        <div
          ref={parentRef}
          className="relative h-[70dvh] overflow-auto rounded-xl border border-border"
        >
          {pendingCount > 0 && (
            <div className="pointer-events-none sticky top-2 z-10 flex justify-center">
              <Button
                size="sm"
                variant="secondary"
                className="pointer-events-auto shadow-md"
                onClick={revealPending}
              >
                ↑ {pendingCount} new signal{pendingCount === 1 ? "" : "s"}
              </Button>
            </div>
          )}
          <div style={{ height: virtualizer.getTotalSize(), position: "relative" }}>
            {virtualizer.getVirtualItems().map((v) => {
              const s = rows[v.index]!;
              return (
                <div
                  key={s.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${v.start}px)`,
                  }}
                  className="p-2"
                >
                  <button
                    type="button"
                    className={
                      selectedSignal?.id === s.id
                        ? "w-full rounded-xl border-2 border-ring bg-card p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        : "w-full rounded-xl border border-border bg-card p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    }
                    onClick={() => handleSelect(s)}
                  >
                    <SeverityBar severity={s.severity}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{s.title}</p>
                        <TimeAgo iso={s.timestamp} className="text-[10px] text-muted-foreground" />
                      </div>
                      {selectedSignal?.id === s.id ? (
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{s.body}</p>
                      ) : (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.body}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge kind="signalType" value={s.type} />
                        <StatusBadge kind="severity" value={s.severity} />
                        <span className="text-xs text-muted-foreground">
                          {s.country} · {s.sector} · {s.publisher ?? s.source}
                        </span>
                      </div>
                      {selectedSignal?.id === s.id && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
                          <Button
                            size="xs"
                            className="text-[11px] h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAIAssessment(s);
                            }}
                          >
                            <Brain className="mr-1 h-3.5 w-3.5" /> AI Assess
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            className="text-[11px] h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStressTest(s);
                            }}
                          >
                            <Gauge className="mr-1 h-3.5 w-3.5" /> Stress Test
                          </Button>
                          <Button
                            size="xs"
                            variant="secondary"
                            className="text-[11px] h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigateFromSignal(s);
                            }}
                          >
                            <ArrowUpRight className="mr-1 h-3.5 w-3.5" /> Investigate
                          </Button>
                          {s.url && (
                            <a
                              href={s.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex h-7 items-center rounded-md border border-border px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                            >
                              <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open article
                            </a>
                          )}
                        </div>
                      )}
                    </SeverityBar>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


