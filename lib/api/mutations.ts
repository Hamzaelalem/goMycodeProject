import type { EsgSectorInputs, Recommendation } from "@/types";
import type { GenerateRecommendationRequest } from "@/lib/recommendations/schema";

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
