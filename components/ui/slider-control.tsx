"use client";

import { Slider } from "@/components/ui/slider";

/** Labeled slider with a numeric entry box and min/max hints. Shared by scenario tooling. */
export function SliderControl({
  label,
  unit,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, step < 1 ? Number(n.toFixed(1)) : Math.round(n)));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs">{label}</p>
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isFinite(n)) onChange(clamp(n));
          }}
          className="h-6 w-16 rounded-md border border-input bg-transparent px-1.5 text-right text-xs tabular-nums focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(clamp((Array.isArray(v) ? v[0] : v) as number))}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}
