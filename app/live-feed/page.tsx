"use client";

import dynamic from "next/dynamic";

const LiveFeedPage = dynamic(() => import("@/components/pages/live-feed/LiveFeedPage"), {
  ssr: false,
});

export default function Page() {
  return <LiveFeedPage />;
}

