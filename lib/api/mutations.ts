import type { EsgSectorInputs, Recommendation, RecommendationDetail, ScenarioInputs } from "@/types";
import type { GenerateRecommendationRequest } from "@/lib/recommendations/schema";
import type { IngestMode, IngestSummary } from "@/lib/ingest/types";
import type { ScenarioBundle } from "@/lib/scenarios/compute";

export type UpdateRecommendationStatusPayload = {
  status: Recommendation["status"];
  comment?: string;
};

export async function updateRecommendationStatusApi(
  id: string,
  payload: UpdateRecommendationStatusPayload,
): Promise<{ success: boolean; data?: Recommendation; error?: string }> {
  try {
    const res = await fetch(`/api/recommendations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      return { success: false, error: err.error ?? `HTTP ${res.status}` };
    }
    const data = (await res.json()) as Recommendation;
    return { success: true, data };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function fetchRecommendationDetailApi(
  id: string,
): Promise<{ success: boolean; data?: RecommendationDetail; error?: string }> {
  try {
    const res = await fetch(`/api/recommendations/${id}`);
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string };
      return { success: false, error: err.error ?? `HTTP ${res.status}` };
    }
    const data = (await res.json()) as RecommendationDetail;
    return { success: true, data };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function updateEsgSectorApi(
  sector: string,
  payload: { kpis: unknown; scores: unknown },
): Promise<{ success: boolean; data?: EsgSectorInputs; error?: string }> {
  try {
    const res = await fetch("/api/esg", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sector, payload }),
    });
    if (!res.ok) return { success: false, error: "Failed to update ESG" };
    const data = (await res.json()) as EsgSectorInputs;
    return { success: true, data };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function saveScenarioBundleApi(body: {
  key?: string;
  defaultInputs: unknown;
  scenarioCards: unknown;
  irrProjection: unknown;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/scenarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return { success: false, error: "Failed to save scenario" };
    return { success: true };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function explainScenarioApi(body: {
  inputs: unknown;
  cards: unknown;
  expectedIrr: number;
  sensitivity: unknown;
  recommendation?: unknown;
}): Promise<{ narrative: string; model: string } | null> {
  try {
    const res = await fetch("/api/scenarios/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    return (await res.json()) as { narrative: string; model: string };
  } catch {
    return null;
  }
}

export async function computeScenariosApi(
  inputs: ScenarioInputs,
  recommendationId?: string,
  signal?: AbortSignal,
): Promise<ScenarioBundle | null> {
  try {
    const res = await fetch("/api/scenarios/compute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs, recommendationId }),
      signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as ScenarioBundle;
  } catch {
    return null;
  }
}

export async function generateRecommendationApi(
  payload: GenerateRecommendationRequest,
): Promise<{ success: boolean; data?: Recommendation; error?: string }> {
  try {
    const res = await fetch("/api/recommendations/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = (await res.json().catch(() => ({}))) as {
      recommendation?: Recommendation;
      error?: string;
      detail?: string;
    };
    if (!res.ok || !json.recommendation) {
      return {
        success: false,
        error: json.detail ?? json.error ?? `HTTP ${res.status}`,
      };
    }
    return { success: true, data: json.recommendation };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export async function ingestNewsApi(): Promise<{
  success: boolean;
  data?: IngestSummary;
  error?: string;
}> {
  try {
    const res = await fetch("/api/signals/ingest", { method: "POST" });
    const json = (await res.json().catch(() => ({}))) as IngestSummary & { error?: string };
    if (!res.ok || !json.ok) {
      return { success: false, error: json.error ?? `HTTP ${res.status}` };
    }
    return { success: true, data: json };
  } catch {
    return { success: false, error: "Network error" };
  }
}

export interface IngestStatus {
  running: boolean;
  mode: IngestMode;
  lastRun: IngestSummary | null;
}

export async function getIngestStatusApi(): Promise<IngestStatus | null> {
  try {
    const res = await fetch("/api/signals/ingest");
    if (!res.ok) return null;
    return (await res.json()) as IngestStatus;
  } catch {
    return null;
  }
}

export async function setIngestModeApi(
  mode: IngestMode,
): Promise<{ success: boolean; mode?: IngestMode; error?: string }> {
  try {
    const res = await fetch("/api/signals/ingest", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    const json = (await res.json().catch(() => ({}))) as { mode?: IngestMode; error?: string };
    if (!res.ok || !json.mode) {
      return { success: false, error: json.error ?? `HTTP ${res.status}` };
    }
    return { success: true, mode: json.mode };
  } catch {
    return { success: false, error: "Network error" };
  }
}
