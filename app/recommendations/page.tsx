"use client";

import dynamic from "next/dynamic";

const RecommendationsPage = dynamic(
  () => import("@/components/pages/recommendations/RecommendationsPage"),
  { ssr: false },
);

export default function Page() {
  return <RecommendationsPage />;
}

