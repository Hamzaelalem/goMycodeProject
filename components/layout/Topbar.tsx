"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Sparkles } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/ui/GlobalSearch";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useTopbarViewModel } from "./useTopbarViewModel";

export function Topbar() {
  const { title, handleAskAI } = useTopbarViewModel();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Best-effort; the redirect below still forces re-auth via the gate.
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between gap-3 border-b border-border bg-background px-4">
      <div className="min-w-0">
        <p className="truncate text-base font-medium">{title}</p>
      </div>

      <div className="flex items-center gap-2">
        <GlobalSearch />
        <NotificationBell />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleAskAI}
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          Ask AI
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">EO</AvatarFallback>
        </Avatar>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={handleLogout}
          disabled={loggingOut}
          aria-label="Sign out"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </header>
  );
}


