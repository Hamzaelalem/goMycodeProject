import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Providers } from "@/components/providers/providers";
import { MockDataSourceBanner } from "@/components/layout/MockDataSourceBanner";
import { Sidebar } from "@/components/layout/Sidebar";
import { SignalStreamBoot } from "@/components/layout/SignalStreamBoot";
import { Topbar } from "@/components/layout/Topbar";
import { LiveFeedPanel } from "@/components/layout/LiveFeedPanel";
import { RecommendationDrawer } from "@/components/drawers/RecommendationDrawer";
import { AIAssistantDrawer } from "@/components/drawers/AIAssistantDrawer";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Decision Layer Dashboard",
  description: "AI-powered investment decision workspace for executives",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers>
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
        </Providers>
      </body>
    </html>
  );
}
