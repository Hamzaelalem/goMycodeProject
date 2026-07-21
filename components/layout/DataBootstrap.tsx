"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { useGlobalStore } from "@/lib/store/useGlobalStore";

export function DataBootstrap() {
  const pathname = usePathname();
  const bootstrapped = useRef(false);

  useEffect(() => {
    // Skip the authenticated data load on the public login screen — its fetches
    // would only 401 behind the access gate. Bootstrap once thereafter.
    if (pathname === "/login" || bootstrapped.current) return;
    bootstrapped.current = true;
    void useGlobalStore.getState().bootstrapData();
  }, [pathname]);

  return null;
}
