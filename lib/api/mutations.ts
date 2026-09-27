import type {
  EsgSectorInputs,
  Recommendation,
  RecommendationDetail,
  PortfolioHolding,
  PortfolioSummary,
  ScenarioInputs,
  WorkflowLogEntry,
} from "@/types";
import type { PortfolioAuditEntry } from "@/lib/portfolio/repository";
import type { HoldingInput } from "@/lib/portfolio/validation";
import type { GenerateRecommendationRequest } from "@/lib/recommendations/schema";
import type { IngestMode, IngestSummary } from "@/lib/ingest/types";
import type { ScenarioBundle } from "@/lib/scenarios/compute";
import type { RebalanceResponse } from "@/lib/sentinel/rebalance";

export type UpdateRecommendationStatusPayload = {
  status: Recommendation["status"];
  comment?: string;
};

export type UpdateRecommendationStatusResult = {
  recommendation: Recommendation;
  workflowLogEntry: WorkflowLogEntry;
};

export async function updateRecommendationStatusApi(
  id: string,
  payload: UpdateRecommendationStatusPayload,
): Promise<{ success: boolean; data?: UpdateRecommendationStatusResult; error?: string }> {
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
    const data = (await res.json()) as UpdateRecommendationStatusResult;
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

export async function scanAndRebalanceApi(): Promise<{
  success: boolean;
  data?: RebalanceResponse;
  error?: string;
}> {
  try {
    const res = await fetch("/api/portfolio/rebalance", { method: "POST" });
    const json = (await res.json().catch(() => ({}))) as Partial<RebalanceResponse> & { error?: string };
    if (!res.ok || !Array.isArray(json.assets)) {
      return { success: false, error: json.error ?? `HTTP ${res.status}` };
    }
    return { success: true, data: json as RebalanceResponse };
  } catch {
    return { success: false, error: "Network error" };
  }
}

// ── My Portfolio ─────────────────────────────────────────────────────────────

export type PortfolioResponse = PortfolioSummary & { maxHoldings: number; audit: PortfolioAuditEntry[] };

type ApiResult<T> = { success: boolean; data?: T; error?: string; details?: string[] };

async function portfolioRequest<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, init);
    const json = (await res.json().catch(() => ({}))) as T & {
      error?: string;
      details?: string[];
      rowErrors?: Array<{ row: number; errors: string[] }>;
    };
    if (!res.ok) {
      const details = json.details ?? json.rowErrors?.map((r) => `Row ${r.row}: ${r.errors.join("; ")}`);
      return { success: false, error: json.error ?? `HTTP ${res.status}`, details };
    }
    return { success: true, data: json };
  } catch {
    return { success: false, error: "Network error" };
  }
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export function fetchPortfolioApi() {
  return portfolioRequest<PortfolioResponse>("/api/portfolio/holdings");
}

export function createHoldingApi(input: HoldingInput) {
  return portfolioRequest<{ holding: PortfolioHolding }>("/api/portfolio/holdings", jsonInit("POST", input));
}

export function updateHoldingApi(id: string, input: HoldingInput) {
  return portfolioRequest<{ holding: PortfolioHolding }>(
    `/api/portfolio/holdings/${encodeURIComponent(id)}`,
    jsonInit("PATCH", input),
  );
}

export function deleteHoldingApi(id: string) {
  return portfolioRequest<{ ok: true }>(`/api/portfolio/holdings/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function importHoldingsApi(mode: "replace" | "append", rows: HoldingInput[]) {
  return portfolioRequest<{ imported: number; total: number }>("/api/portfolio/import", jsonInit("POST", { mode, rows }));
}
