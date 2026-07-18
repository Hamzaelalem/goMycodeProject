"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGlobalStore } from "@/lib/store/useGlobalStore";

export function useRecommendationDrawerViewModel() {
  const router = useRouter();
  const workflowLogEntries = useGlobalStore((s) => s.workflowLogEntries);
  const selected = useGlobalStore((s) => s.selectedRecommendation);
  const open = useGlobalStore((s) => s.isRecommendationDrawerOpen);
  const close = useGlobalStore((s) => s.closeRecommendationDrawer);
  const signals = useGlobalStore((s) => s.signals);
  const updateRecommendationStatus = useGlobalStore((s) => s.updateRecommendationStatus);
  const openAIDrawer = useGlobalStore((s) => s.openAIDrawer);

  const linkedSignals = useMemo(() => {
    if (!selected) return [];
    return signals
      .filter((s) => s.region === selected.region && s.sector === selected.sector)
      .slice(0, 4);
  }, [selected, signals]);

  const entries = useMemo(() => {
    if (!selected) return [];
    return workflowLogEntries.filter((w) => w.recommendationId === selected.id);
  }, [selected, workflowLogEntries]);

  function handleApprove() {
    if (selected) {
      updateRecommendationStatus(selected.id, "approved");
    }
  }

  function handleReject() {
    if (selected) {
      updateRecommendationStatus(selected.id, "rejected");
    }
  }

  function handleSendToBoard() {
    router.push("/workflow");
  }

  function handleAskAI() {
    if (selected) {
      openAIDrawer(`Analyze ${selected.title}`);
    }
  }

  return {
    open,
    close,
    selected,
    linkedSignals,
    entries,
    handleApprove,
    handleReject,
    handleSendToBoard,
    handleAskAI,
  };
}
