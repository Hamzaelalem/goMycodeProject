"use client";

import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useGlobalStore } from "@/lib/store/useGlobalStore";

export function NotificationBell() {
  const unread = useGlobalStore((s) => s.unreadSignalCount);
  const markSignalsRead = useGlobalStore((s) => s.markSignalsRead);

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={markSignalsRead}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" aria-hidden />
      </Button>
      {unread > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </div>
  );
}
