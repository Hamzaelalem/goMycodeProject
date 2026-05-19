"use client";

import { useEffect, useRef, useState, type ReactElement, type ReactNode } from "react";
import { ResponsiveContainer } from "recharts";

export function ChartGate({
  height,
  children,
}: {
  height: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const width = Math.floor(rect.width);
      const measuredHeight = Math.floor(rect.height);
      if (width > 0 && measuredHeight > 0) {
        setSize({ width, height: measuredHeight });
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [height]);

  return (
    <div
      ref={ref}
      className="relative w-full min-h-0 min-w-0"
      style={{ height, minHeight: height }}
    >
      {size ? (
        <div className="absolute inset-0 min-h-0 min-w-0">{children}</div>
      ) : (
        <div
          className="absolute inset-0 animate-pulse rounded-lg bg-muted/60"
          aria-hidden
        />
      )}
    </div>
  );
}

export function ChartResponsive({
  height,
  children,
}: {
  height: number;
  children: ReactElement;
}) {
  return (
    <ChartGate height={height}>
      <ResponsiveContainer width="100%" height={height} debounce={50}>
        {children}
      </ResponsiveContainer>
    </ChartGate>
  );
}

