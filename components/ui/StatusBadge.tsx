"use client";

import { cn } from "@/lib/utils";
import { COLORS } from "@/lib/utils/colorHelpers";
import type { SignalSeverity, SignalType, WorkflowStatus } from "@/types";

type Kind = "severity" | "workflow" | "signalType";

function signalTypeColors(t: SignalType) {
  // map to the palette described (opportunity green, risk red, policy blue, deal purple, market amber)
  switch (t) {
    case "risk":
      return { fg: "#E24B4A", bg: "#FCEBEB", text: "#791F1F" };
    case "opportunity":
      return { fg: "#1D9E75", bg: "#EAF3DE", text: "#27500A" };
    case "policy":
      return { fg: "#378ADD", bg: "#E6F1FB", text: "#0C447C" };
    case "deal":
      return { fg: "#7C3AED", bg: "#F3E8FF", text: "#3B0764" };
    case "market":
    default:
      return { fg: "#BA7517", bg: "#FAEEDA", text: "#633806" };
  }
}

export function StatusBadge({
  kind,
  value,
  className,
}: {
  kind: Kind;
  value: SignalSeverity | WorkflowStatus | SignalType;
  className?: string;
}) {
  const c =
    kind === "severity"
      ? COLORS.severity[value as SignalSeverity]
      : kind === "workflow"
        ? COLORS.workflow[value as WorkflowStatus]
        : signalTypeColors(value as SignalType);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        className,
      )}
      style={{ background: c.bg, color: c.text }}
    >
      {String(value).toLowerCase().replaceAll("_", " ")}
    </span>
  );
}
