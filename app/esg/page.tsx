"use client";

import dynamic from "next/dynamic";

const EsgPage = dynamic(() => import("@/components/pages/esg/EsgPage"), { ssr: false });

export default function Page() {
  return <EsgPage />;
}

