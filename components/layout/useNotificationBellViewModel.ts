"use client";

import { useGlobalStore } from "@/lib/store/useGlobalStore";

export function useNotificationBellViewModel() {
  const unread = useGlobalStore((s) => s.unreadSignalCount);
  const markSignalsRead = useGlobalStore((s) => s.markSignalsRead);

  return {
    unread,
    markSignalsRead,
  };
}
