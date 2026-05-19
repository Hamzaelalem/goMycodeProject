"use client";

import { Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { GlobalSearch } from "@/components/ui/GlobalSearch";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { useGlobalStore } from "@/lib/store/useGlobalStore";

const TITLES: Record<string, string> = {
  "/dashboard": "Portfolio overview",
  "/recommendations": "Recommendation engine",
  "/scenarios": "Scenario modelling",
  "/risk": "Risk scoring",
  "/esg": "ESG scoring",
  "/workflow": "Decision workflow",
  "/live-feed": "Live signal feed",
};

function contextForPath(pathname: string): string {
  if (pathname.startsWith("/recommendations"))
    return "Explain the top recommendation and its key risks";
  if (pathname.startsWith("/risk")) return "What is driving the highest risk factors today?";
  if (pathname.startsWith("/esg")) return "How can we improve our portfolio ESG score?";
  if (pathname.startsWith("/scenarios"))
    return "Explain the difference between bear and stress scenarios";
  if (pathname.startsWith("/workflow"))
    return "What should I consider before approving this recommendation?";
  if (pathname.startsWith("/dashboard")) return "Give me a summary of the portfolio status today";
  return "Summarize the current portfolio context.";
}

export function Topbar() {
  const pathname = usePathname();
  const title = TITLES[pathname] ?? "Decision Layer Dashboard";
  const openAIDrawer = useGlobalStore((s) => s.openAIDrawer);

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
          onClick={() => openAIDrawer(contextForPath(pathname))}
        >
          <Sparkles className="h-4 w-4" aria-hidden />
          Ask AI
        </Button>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">EO</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

