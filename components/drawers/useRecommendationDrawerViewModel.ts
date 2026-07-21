"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useGlobalStore } from "@/lib/store/useGlobalStore";
import { fetchRecommendationDetailApi } from "@/lib/api/mutations";
import { isFlaggedForReview, type RecommendationAuditEntry } from "@/types";

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

  const flagged = selected ? isFlaggedForReview(selected) : false;

  // Load the durable audit trail (generation reconciliation + status changes)
  // for the open recommendation. Keyed by id so a stale fetch never shows under
  // a newly selected rec, and no synchronous reset in the effect body.
  const [detail, setDetail] = useState<{ id: string; logs: RecommendationAuditEntry[] } | null>(null);
  useEffect(() => {
    if (!open || !selected) return;
    let active = true;
    void fetchRecommendationDetailApi(selected.id).then((res) => {
      if (active && res.success && res.data) {
        setDetail({ id: selected.id, logs: res.data.auditLogs });
      }
    });
    return () => {
      active = false;
    };
  }, [open, selected]);
  const auditLogs = detail && selected && detail.id === selected.id ? detail.logs : [];

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
    flagged,
    auditLogs,
    linkedSignals,
    entries,
    handleApprove,
    handleReject,
    handleSendToBoard,
    handleAskAI,
  };
}
