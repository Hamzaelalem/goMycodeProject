"use client";

import { cn } from "@/lib/utils";
import { COLORS, scoreTone } from "@/lib/utils/colorHelpers";

const SIZE = 44;
const STROKE = 6;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

export function ConfidenceGauge({
  value,
  className,
}: {
  value: number; // 0..100
  className?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  const tone = scoreTone(v);
  const color = COLORS.confidence[tone].fg;
  const dash = (C * v) / 100;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke="var(--border)"
          strokeWidth={STROKE}
          fill="none"
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${C - dash}`}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      <div className="leading-tight">
        <p className="text-sm font-medium tabular-nums" style={{ color }}>
          {Math.round(v)}
        </p>
        <p className="text-[11px] text-muted-foreground">confidence</p>
      </div>
    </div>
  );
}

