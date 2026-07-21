"use client";

import { usePathname } from "next/navigation";

import { MockDataSourceBanner } from "@/components/layout/MockDataSourceBanner";
import { Sidebar } from "@/components/layout/Sidebar";
import { SignalStreamBoot } from "@/components/layout/SignalStreamBoot";
import { Topbar } from "@/components/layout/Topbar";
import { LiveFeedPanel } from "@/components/layout/LiveFeedPanel";
import { RecommendationDrawer } from "@/components/drawers/RecommendationDrawer";
import { AIAssistantDrawer } from "@/components/drawers/AIAssistantDrawer";

/** Routes that render without the dashboard chrome (sidebar/topbar/panels). */
const BARE_ROUTES = new Set<string>(["/login"]);

/**
 * Renders the dashboard chrome around page content, except on bare routes
 * (e.g. `/login`) which fill the viewport on their own. Keeping this branch on
 * the client lets the login screen reuse the single root layout without the
 * sidebar/topbar mounting behind it.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (BARE_ROUTES.has(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      <SignalStreamBoot />
      <div className="flex h-[100dvh] overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="min-h-0 flex-1 overflow-auto">
            <div className="mx-auto max-w-6xl space-y-2 p-4">
              <MockDataSourceBanner />
              {children}
            </div>
          </main>
        </div>
        <LiveFeedPanel />
      </div>
      <RecommendationDrawer />
      <AIAssistantDrawer />
    </>
  );
}
