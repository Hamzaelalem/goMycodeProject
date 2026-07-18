"use client";

import dynamic from "next/dynamic";

const MarketIntelligencePage = dynamic(
  () => import("@/components/pages/market-intelligence/MarketIntelligencePage"),
  { ssr: false },
);

export default function Page() {
  return <MarketIntelligencePage />;
}
