"use client";

import { useCallback, useEffect, useState } from "react";

import { recommendations as mockRecommendations } from "@/mock-data/recommendations";
import { seededSignals as mockSignals } from "@/mock-data/signals";
import { riskScores as mockRiskScores } from "@/mock-data/riskScores";
import { esgInputs as mockEsgInputs } from "@/mock-data/esgInputs";
import type { EsgSectorInputs, Recommendation, RiskFactorScore, Signal } from "@/types";

type FetchState<T> = {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  isFromMock: boolean;
};

function useFetchWithFallback<T>(
  apiPath: string,
  mockData: T[],
  params?: Record<string, string>,
): FetchState<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFromMock, setIsFromMock] = useState(false);

  const paramsKey = params ? JSON.stringify(params) : "";

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = params ? `?${new URLSearchParams(params).toString()}` : "";
      const res = await fetch(`/api/${apiPath}${query}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as T[];
      if (!Array.isArray(json)) throw new Error("Invalid response shape");
      setData(json);
      setIsFromMock(false);
    } catch (err) {
      console.warn(`[useFetchWithFallback] API failed for ${apiPath}, using mock data`, err);
      setData(mockData);
      setIsFromMock(true);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [apiPath, mockData, params, paramsKey]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, isFromMock };
}

export function useRecommendations(params?: Record<string, string>) {
  return useFetchWithFallback<Recommendation>("recommendations", mockRecommendations, params);
}

export function useSignals(params?: Record<string, string>) {
  return useFetchWithFallback<Signal>("signals", mockSignals, params);
}

export function useRiskScores() {
  return useFetchWithFallback<RiskFactorScore>("risk", mockRiskScores);
}

export function useEsgInputs(params?: Record<string, string>) {
  return useFetchWithFallback<EsgSectorInputs>("esg", mockEsgInputs, params);
}
