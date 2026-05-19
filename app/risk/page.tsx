"use client";

import dynamic from "next/dynamic";

const RiskPage = dynamic(() => import("@/components/pages/risk/RiskPage"), { ssr: false });

export default function Page() {
  return <RiskPage />;
}

