"use client";

import { useEffect } from "react";

import { useGlobalStore } from "@/lib/store/useGlobalStore";

export function DataBootstrap() {
  useEffect(() => {
    void useGlobalStore.getState().bootstrapData();
  }, []);

  return null;
}
