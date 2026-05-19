"use client";

import dynamic from "next/dynamic";

const WorkflowPage = dynamic(() => import("@/components/pages/workflow/WorkflowPage"), {
  ssr: false,
});

export default function Page() {
  return <WorkflowPage />;
}

