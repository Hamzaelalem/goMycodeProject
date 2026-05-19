"use client";

import { cn } from "@/lib/utils";
import { severityColors } from "@/lib/utils/colorHelpers";
import type { SignalSeverity } from "@/types";

export function SeverityBar({
  severity,
  children,
}: {
  severity: SignalSeverity;
  children: React.ReactNode;
}) {
  const c = severityColors(severity);
  return (
    <div
      className={cn("rounded-xl pl-3")}
      style={{ borderLeft: `4px solid ${c.fg}` }}
    >
      {children}
    </div>
  );
}
