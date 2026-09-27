"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useGlobalStore } from "@/lib/store/useGlobalStore";
import type { WorkflowStatus } from "@/types";

export function mapStatus(s: string): WorkflowStatus {
  if (s === "pending_review") return "PENDING_REVIEW";
  if (s === "under_review") return "UNDER_REVIEW";
  if (s === "approved") return "APPROVED";
  if (s === "rejected") return "REJECTED";
  return "EXECUTED";
}

export function useWorkflowViewModel() {
  const workflowLogEntries = useGlobalStore((s) => s.workflowLogEntries);
  const recs = useGlobalStore((s) => s.recommendations);
  const focusId = useGlobalStore((s) => s.workflowFocusRecommendationId);
  const setWorkflowFocusRecommendationId = useGlobalStore((s) => s.setWorkflowFocusRecommendationId);
  const openAIDrawer = useGlobalStore((s) => s.openAIDrawer);
  const updateRecommendationStatus = useGlobalStore((s) => s.updateRecommendationStatus);

  const [selectedId, setSelectedId] = useState(recs[0]?.id ?? "");
  const [comment, setComment] = useState("");
  const rowRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!focusId) return;
    const exists = recs.some((r) => r.id === focusId);
    if (!exists) {
      setWorkflowFocusRecommendationId(null);
      return;
    }
    const id = focusId;
    requestAnimationFrame(() => {
      setSelectedId(id);
      rowRefs.current[id]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      setWorkflowFocusRecommendationId(null);
    });
  }, [focusId, recs, setWorkflowFocusRecommendationId]);

  const current = useMemo(() => recs.find((r) => r.id === selectedId), [recs, selectedId]);
  const entries = useMemo(
    () => workflowLogEntries.filter((w) => w.recommendationId === selectedId),
    [selectedId, workflowLogEntries],
  );

  const kpis = useMemo(() => {
    const total = recs.length;
    const pending = recs.filter((r) => r.status === "pending_review").length;
    const approved = recs.filter((r) => r.status === "approved").length;
    const rejected = recs.filter((r) => r.status === "rejected").length;
    return {
      total,
      pending,
      approved,
      rejected,
    };
  }, [recs]);

  function handleApprove() {
    if (!current) return;
    updateRecommendationStatus(current.id, "approved", comment);
    setComment("");
  }

  function handleReject() {
    if (!current) return;
    updateRecommendationStatus(current.id, "rejected", comment);
    setComment("");
  }

  function handleGetAIInput() {
    openAIDrawer("What should I consider before approving this recommendation?");
  }

  return {
    recs,
    selectedId,
    setSelectedId,
    comment,
    setComment,
    rowRefs,
    current,
    entries,
    kpis,
    handleApprove,
    handleReject,
    handleGetAIInput,
  };
}
