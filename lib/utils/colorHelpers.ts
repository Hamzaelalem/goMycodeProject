import type { SignalSeverity } from "@/types";

export const COLORS = {
  confidence: {
    good: { fg: "#1D9E75", bg: "#EAF3DE", text: "#27500A" },
    ok: { fg: "#378ADD", bg: "#E6F1FB", text: "#0C447C" },
    low: { fg: "#BA7517", bg: "#FAEEDA", text: "#633806" },
  },
  severity: {
    critical: { fg: "#E24B4A", bg: "#FCEBEB", text: "#791F1F" },
    high: { fg: "#EF9F27", bg: "#FAEEDA", text: "#633806" },
    medium: { fg: "#378ADD", bg: "#E6F1FB", text: "#0C447C" },
    low: { fg: "#1D9E75", bg: "#EAF3DE", text: "#27500A" },
  },
  workflow: {
    PENDING_REVIEW: { fg: "#BA7517", bg: "#FAEEDA", text: "#633806" },
    UNDER_REVIEW: { fg: "#378ADD", bg: "#E6F1FB", text: "#0C447C" },
    APPROVED: { fg: "#1D9E75", bg: "#EAF3DE", text: "#27500A" },
    REJECTED: { fg: "#E24B4A", bg: "#FCEBEB", text: "#791F1F" },
    EXECUTED: { fg: "#7C3AED", bg: "#F3E8FF", text: "#3B0764" },
  },
} as const;

export function scoreTone(score: number): "good" | "ok" | "low" {
  if (score >= 80) return "good";
  if (score >= 60) return "ok";
  return "low";
}

export function severityColors(sev: SignalSeverity) {
  return COLORS.severity[sev];
}
