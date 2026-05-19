"use client";

import { useSignalStream } from "@/lib/hooks/useSignalStream";

export function SignalStreamBoot() {
  useSignalStream(true, 30_000);
  return null;
}

