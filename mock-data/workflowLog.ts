import type { WorkflowLogEntry } from "@/types";

const now = Date.now();
const iso = (minAgo: number) => new Date(now - minAgo * 60_000).toISOString();

export const workflowLog: WorkflowLogEntry[] = [
  {
    id: "wl-001",
    recommendationId: "r-001",
    status: "APPROVED",
    actor: "System",
    role: "Decision Layer",
    timestamp: iso(320),
    comment: "AI generated the initial investment memo and score breakdown.",
  },
  {
    id: "wl-002",
    recommendationId: "r-001",
    status: "UNDER_REVIEW",
    actor: "M. Chen",
    role: "Risk",
    timestamp: iso(250),
    comment: "Validated downside risk; requested sensitivity on PPA escalation clauses.",
  },
  {
    id: "wl-003",
    recommendationId: "r-001",
    status: "APPROVED",
    actor: "IC Chair",
    role: "Investment Committee",
    timestamp: iso(120),
    comment: "Approved subject to standard CPs and reporting cadence.",
  },
  {
    id: "wl-004",
    recommendationId: "r-010",
    status: "UNDER_REVIEW",
    actor: "A. Okonkwo",
    role: "Sector Lead",
    timestamp: iso(180),
    comment: "Integration plan requested; staffing assumptions under review.",
  },
  {
    id: "wl-005",
    recommendationId: "r-004",
    status: "REJECTED",
    actor: "IC Chair",
    role: "Investment Committee",
    timestamp: iso(90),
    comment: "Rejected—stress macro breaches portfolio risk tolerance.",
  },
  {
    id: "wl-006",
    recommendationId: "r-011",
    status: "APPROVED",
    actor: "PM",
    role: "Portfolio Manager",
    timestamp: iso(60),
    comment: "Approved—monitor FX pass-through and tariff review cadence.",
  },
];
