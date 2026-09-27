"use client";

import { create } from "zustand";

import { DATA_DOMAINS, type DataDomain } from "@/lib/dataSource";
import { updateRecommendationStatusApi, saveScenarioBundleApi } from "@/lib/api/mutations";
import type { EsgSectorInputs, Recommendation, RiskFactorScore, Signal, WorkflowLogEntry, ScenarioInputs, ScenarioCard, IrrProjectionPoint } from "@/types";
import { recommendations as mockRecommendations } from "@/mock-data/recommendations";
import { seededSignals as mockSignals } from "@/mock-data/signals";
import { riskScores as mockRiskScores } from "@/mock-data/riskScores";
import { esgInputs as mockEsgInputs } from "@/mock-data/esgInputs";
import { workflowLog as mockWorkflowLog } from "@/mock-data/workflowLog";
import { DEFAULT_INPUTS } from "@/mock-data/scenarios.v2";

const initialSources: Record<DataDomain, boolean> = {
  recommendations: false,
  signals: false,
  risk: false,
  esg: false,
  scenarios: false,
  workflow: false,
};

interface GlobalStore {
  selectedRecommendation: Recommendation | null;
  selectedSignal: Signal | null;
  activeRegionFilter: string | null;
  activeSectorFilter: string | null;
  activeRiskFactor: string | null;
  workflowFocusRecommendationId: string | null;

  signals: Signal[];
  unreadSignalCount: number;

  recommendations: Recommendation[];
  decisionLog: Array<{ recommendationId: string; action: string; comment?: string; at: string }>;

  riskFactorScores: RiskFactorScore[];
  esgSectors: EsgSectorInputs[];
  workflowLogEntries: WorkflowLogEntry[];

  bootstrapComplete: boolean;
  sourcesFromDb: Record<DataDomain, boolean>;
  lastBootstrapError: string | null;

  isAIDrawerOpen: boolean;
  isRecommendationDrawerOpen: boolean;
  aiDrawerContext: string;
  aiDrawerInitialMessage: string | null;
  aiModel: "ollama" | "gemini" | "groq";
  aiPersona: "standard" | "risk" | "esg" | "conservative";
  scenarioInputs: ScenarioInputs;
  savedScenarios: Array<{
    key: string;
    defaultInputs: ScenarioInputs;
    scenarioCards: ScenarioCard[];
    irrProjection: IrrProjectionPoint[];
  }>;

  setSelectedRecommendation: (
    r: Recommendation | null,
    options?: { openDrawer?: boolean },
  ) => void;
  setSelectedSignal: (s: Signal | null) => void;
  setActiveSectorFilter: (sector: string | null) => void;
  setActiveRegionFilter: (region: string | null) => void;
  setActiveRiskFactor: (riskFactor: string | null) => void;
  setWorkflowFocusRecommendationId: (id: string | null) => void;
  addRecommendation: (r: Recommendation) => void;
  addSignal: (s: Signal) => void;
  markSignalsRead: () => void;
  openAIDrawer: (context: string) => void;
  closeAIDrawer: () => void;
  setAiDrawerInitialMessage: (msg: string | null) => void;
  setScenarioInputs: (inputs: ScenarioInputs) => void;
  resetScenarioInputs: () => void;
  setAiModel: (model: "ollama" | "gemini" | "groq") => void;
  setAiPersona: (persona: "standard" | "risk" | "esg" | "conservative") => void;
  saveScenarioAction: (
    name: string,
    inputs: ScenarioInputs,
    cards: ScenarioCard[],
    projection: IrrProjectionPoint[],
  ) => Promise<boolean>;
  loadSavedScenariosAction: () => Promise<void>;
  openRecommendationDrawer: (r: Recommendation) => void;
  closeRecommendationDrawer: () => void;
  updateRecommendationStatus: (id: string, status: Recommendation["status"], comment?: string) => void;
  mergeEsgSector: (next: EsgSectorInputs) => void;
  getPortfolioSnapshot: () => {
    recommendations: number;
    approved: number;
    pending: number;
    underReview: number;
    rejected: number;
    unreadSignals: number;
    recommendationDetails: Array<{
      title: string;
      sector: string;
      region: string;
      country: string;
      status: string;
      irrPct: number;
      capitalUsd: number;
      riskLevel: string;
      confidence: number;
      rationale: string;
    }>;
    recentSignals: Array<{
      title: string;
      type: string;
      severity: string;
      sector: string;
      region: string;
      sentiment: number;
      timestamp: string;
    }>;
    riskScores: Array<{
      name: string;
      score: number;
      previousScore: number;
    }>;
  };

  bootstrapData: () => Promise<void>;
}

function criticalUnreadCount(signals: Signal[]): number {
  return signals.filter((s) => s.severity === "critical").length;
}

export const useGlobalStore = create<GlobalStore>((set, get) => ({
  selectedRecommendation: null,
  selectedSignal: null,
  activeRegionFilter: null,
  activeSectorFilter: null,
  activeRiskFactor: null,
  workflowFocusRecommendationId: null,
  signals: mockSignals,
  unreadSignalCount: criticalUnreadCount(mockSignals),
  recommendations: mockRecommendations,
  decisionLog: [],
  riskFactorScores: mockRiskScores,
  esgSectors: mockEsgInputs,
  workflowLogEntries: mockWorkflowLog,
  bootstrapComplete: false,
  sourcesFromDb: { ...initialSources },
  lastBootstrapError: null,
  isAIDrawerOpen: false,
  isRecommendationDrawerOpen: false,
  aiDrawerContext: "",
  aiDrawerInitialMessage: null,
  aiModel: "groq",
  aiPersona: "standard",
  scenarioInputs: DEFAULT_INPUTS,
  savedScenarios: [],

  setSelectedRecommendation: (r, options) => {
    const openDrawer = options?.openDrawer !== false;
    set({
      selectedRecommendation: r,
      activeRegionFilter: r?.region ?? null,
      activeSectorFilter: r?.sector ?? null,
      activeRiskFactor: r?.riskFactors?.[0] ?? null,
      selectedSignal: null,
      workflowFocusRecommendationId: null,
      isRecommendationDrawerOpen: openDrawer && !!r,
    });
  },
  setSelectedSignal: (s) => {
    set({ selectedSignal: s });
  },
  setActiveSectorFilter: (sector) => set({ activeSectorFilter: sector }),
  setActiveRegionFilter: (region) => set({ activeRegionFilter: region }),
  setActiveRiskFactor: (riskFactor) => set({ activeRiskFactor: riskFactor }),
  setWorkflowFocusRecommendationId: (id) => set({ workflowFocusRecommendationId: id }),
  addRecommendation: (r) =>
    set((state) => ({
      recommendations: [r, ...state.recommendations],
    })),
  addSignal: (s) =>
    set((state) => ({
      signals: [s, ...state.signals].slice(0, 500),
      // Keep "unread" semantics consistent with init/bootstrap: count critical signals only.
      unreadSignalCount: state.unreadSignalCount + (s.severity === "critical" ? 1 : 0),
    })),
  markSignalsRead: () => set({ unreadSignalCount: 0 }),
  openAIDrawer: (context) => set({ isAIDrawerOpen: true, aiDrawerContext: context }),
  closeAIDrawer: () => set({ isAIDrawerOpen: false }),
  setAiDrawerInitialMessage: (msg) => set({ aiDrawerInitialMessage: msg }),
  setScenarioInputs: (inputs) => set({ scenarioInputs: inputs }),
  resetScenarioInputs: () => set({ scenarioInputs: DEFAULT_INPUTS }),
  setAiModel: (model) => set({ aiModel: model }),
  setAiPersona: (persona) => set({ aiPersona: persona }),
  saveScenarioAction: async (name, inputs, cards, projection) => {
    const matchIndex = get().savedScenarios.findIndex((s) => s.key === name);
    const item = { key: name, defaultInputs: inputs, scenarioCards: cards, irrProjection: projection };
    
    let nextSaved = [...get().savedScenarios];
    if (matchIndex >= 0) {
      nextSaved[matchIndex] = item;
    } else {
      nextSaved = [item, ...nextSaved];
    }
    set({ savedScenarios: nextSaved });

    const result = await saveScenarioBundleApi({
      key: name,
      defaultInputs: inputs,
      scenarioCards: cards,
      irrProjection: projection,
    });
    return result.success;
  },
  loadSavedScenariosAction: async () => {
    try {
      const res = await fetch("/api/scenarios?all=true");
      if (!res.ok) throw new Error("failed");
      const list = await res.json();
      if (Array.isArray(list)) {
        set({ savedScenarios: list });
      }
    } catch {
      console.warn("[useGlobalStore] Load saved scenarios failed; using client-side fallback store");
    }
  },
  openRecommendationDrawer: (r) => get().setSelectedRecommendation(r),
  closeRecommendationDrawer: () => set({ isRecommendationDrawerOpen: false }),

  updateRecommendationStatus: (id, status, comment) => {
    const prevRecs = get().recommendations;
    const prevLog = get().decisionLog;
    const nextRecs = prevRecs.map((r) => (r.id === id ? { ...r, status } : r));
    const nextLog = [
      {
        recommendationId: id,
        action: status,
        comment,
        at: new Date().toISOString(),
      },
      ...prevLog,
    ];
    set({ recommendations: nextRecs, decisionLog: nextLog });

    void (async () => {
      const result = await updateRecommendationStatusApi(id, { status, comment });
      if (!result.success || !result.data) {
        set({ recommendations: prevRecs, decisionLog: prevLog });
        console.warn("[useGlobalStore] PATCH recommendation failed; reverted optimistic update");
        return;
      }
      const { recommendation, workflowLogEntry } = result.data;
      set((state) => ({
        recommendations: state.recommendations.map((r) => (r.id === id ? recommendation : r)),
        workflowLogEntries: [...state.workflowLogEntries, workflowLogEntry],
      }));
    })();
  },

  mergeEsgSector: (next) =>
    set((state) => ({
      esgSectors: state.esgSectors.map((s) => (s.sector === next.sector ? next : s)),
    })),

  getPortfolioSnapshot: () => {
    const state = get();
    const approved = state.recommendations.filter((r) => r.status === "approved").length;
    const pending = state.recommendations.filter((r) => r.status === "pending_review").length;
    const underReview = state.recommendations.filter((r) => r.status === "under_review").length;
    const rejected = state.recommendations.filter((r) => r.status === "rejected").length;

    // Include detailed recommendation info so the AI can reference specifics
    const recommendationDetails = state.recommendations.map((r) => ({
      title: r.title,
      sector: r.sector,
      region: r.region,
      country: r.country,
      status: r.status,
      irrPct: r.irrPct,
      capitalUsd: r.capitalUsd,
      riskLevel: r.riskLevel,
      confidence: r.confidence,
      rationale: r.rationale.slice(0, 200), // trim to keep payload reasonable
    }));

    // Include last 15 signals for recent context
    const recentSignals = [...state.signals]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15)
      .map((s) => ({
        title: s.title,
        type: s.type,
        severity: s.severity,
        sector: s.sector,
        region: s.region,
        sentiment: s.sentiment,
        timestamp: s.timestamp,
      }));

    // Include risk factor scores
    const riskScores = (state.riskFactorScores ?? []).map((rf) => ({
      name: rf.name,
      score: rf.score,
      previousScore: rf.previousScore,
    }));

    return {
      recommendations: state.recommendations.length,
      approved,
      pending,
      underReview,
      rejected,
      unreadSignals: state.unreadSignalCount,
      recommendationDetails,
      recentSignals,
      riskScores,
    };
  },

  bootstrapData: async () => {
    set({
      lastBootstrapError: null,
      sourcesFromDb: { ...initialSources },
      bootstrapComplete: false,
    });

    const nextSources: Record<DataDomain, boolean> = { ...initialSources };
    const failures: DataDomain[] = [];

    const mark = (d: DataDomain, ok: boolean) => {
      nextSources[d] = ok;
      if (!ok) failures.push(d);
    };

    try {
      const recRes = await fetch("/api/recommendations");
      if (!recRes.ok) throw new Error("recommendations");
      const recJson = (await recRes.json()) as Recommendation[];
      if (!Array.isArray(recJson)) throw new Error("recommendations");
      set({ recommendations: recJson });
      mark("recommendations", true);
    } catch {
      mark("recommendations", false);
    }

    try {
      const sigRes = await fetch("/api/signals?limit=200");
      if (!sigRes.ok) throw new Error("signals");
      const sigJson = (await sigRes.json()) as Signal[];
      if (!Array.isArray(sigJson)) throw new Error("signals");
      set({
        signals: sigJson,
        unreadSignalCount: criticalUnreadCount(sigJson),
      });
      mark("signals", true);
    } catch {
      mark("signals", false);
    }

    try {
      const riskRes = await fetch("/api/risk");
      if (!riskRes.ok) throw new Error("risk");
      const riskJson = (await riskRes.json()) as RiskFactorScore[];
      if (!Array.isArray(riskJson)) throw new Error("risk");
      set({ riskFactorScores: riskJson });
      mark("risk", true);
    } catch {
      mark("risk", false);
    }

    try {
      const esgRes = await fetch("/api/esg");
      if (!esgRes.ok) throw new Error("esg");
      const esgJson = (await esgRes.json()) as EsgSectorInputs[];
      if (!Array.isArray(esgJson)) throw new Error("esg");
      set({ esgSectors: esgJson });
      mark("esg", true);
    } catch {
      mark("esg", false);
    }

    try {
      const scRes = await fetch("/api/scenarios");
      if (!scRes.ok) throw new Error("scenarios");
      mark("scenarios", true);
      await get().loadSavedScenariosAction();
    } catch {
      mark("scenarios", false);
    }

    try {
      const wfRes = await fetch("/api/workflow");
      if (!wfRes.ok) throw new Error("workflow");
      const wfJson = (await wfRes.json()) as { workflowLogs?: WorkflowLogEntry[] };
      if (!wfJson.workflowLogs || !Array.isArray(wfJson.workflowLogs)) throw new Error("workflow");
      set({ workflowLogEntries: wfJson.workflowLogs });
      mark("workflow", true);
    } catch {
      mark("workflow", false);
    }

    const totalDomains = DATA_DOMAINS.length;
    const allFailed = failures.length === totalDomains && totalDomains > 0;
    const partialFailed = failures.length > 0 && !allFailed;

    set({
      sourcesFromDb: nextSources,
      bootstrapComplete: true,
      // Full outage (no Postgres / no migrate) is normal in dev — avoid a red error + domain spam.
      lastBootstrapError: partialFailed
        ? `Could not load from database: ${failures.join(", ")}. Other datasets loaded successfully.`
        : null,
    });
  },
}));
