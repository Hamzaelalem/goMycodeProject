"use client";

import { usePathname } from "next/navigation";
import { useGlobalStore } from "@/lib/store/useGlobalStore";

const TITLES: Record<string, string> = {
  "/dashboard": "Portfolio overview",
  "/portfolio": "My portfolio",
  "/recommendations": "Adaptive Portfolio Sentinel",
  "/market-intelligence": "Market intelligence",
  "/scenarios": "Scenario modelling",
  "/esg": "ESG scoring",
  "/workflow": "Decision workflow",
  "/live-feed": "Live signal feed",
};

function contextForPath(pathname: string): string {
  if (pathname.startsWith("/recommendations"))
    return "Explain the top recommendation and its key risks";
  if (pathname.startsWith("/esg")) return "How can we improve our portfolio ESG score?";
  if (pathname.startsWith("/scenarios"))
    return "Explain the difference between bear and stress scenarios";
  if (pathname.startsWith("/market-intelligence"))
    return "How do current macro assumptions affect the portfolio?";
  if (pathname.startsWith("/workflow"))
    return "What should I consider before approving this recommendation?";
  if (pathname.startsWith("/dashboard")) return "Give me a summary of the portfolio status today";
  return "Summarize the current portfolio context.";
}

export function useTopbarViewModel() {
  const pathname = usePathname();
  const openAIDrawer = useGlobalStore((s) => s.openAIDrawer);

  const title = TITLES[pathname] ?? "Decision Layer Dashboard";

  function handleAskAI() {
    openAIDrawer(contextForPath(pathname));
  }

  return {
    title,
    handleAskAI,
  };
}
