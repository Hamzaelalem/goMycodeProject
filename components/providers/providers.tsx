"use client";

import { DataBootstrap } from "@/components/layout/DataBootstrap";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delay={200}>
      <DataBootstrap />
      {children}
    </TooltipProvider>
  );
}
