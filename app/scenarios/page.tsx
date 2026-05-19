"use client";

import dynamic from "next/dynamic";

const ScenariosPage = dynamic(() => import("@/components/pages/scenarios/ScenariosPage"), {
  ssr: false,
});

export default function Page() {
  return <ScenariosPage />;
}

