"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Briefcase, LayoutDashboard, Radio, Sparkles, TrendingUp } from "lucide-react";
// Hidden for the Portfolio Sentinel pivot — restore with the NAV entries below:
// import { GitBranch, Leaf, LineChart } from "lucide-react";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/portfolio", label: "My Portfolio", icon: Briefcase },
  { href: "/recommendations", label: "Portfolio Sentinel", icon: Sparkles },
  { href: "/market-intelligence", label: "Market Intelligence", icon: TrendingUp },
  // { href: "/scenarios", label: "Scenarios", icon: LineChart },
  // { href: "/esg", label: "ESG", icon: Leaf },
  // { href: "/workflow", label: "Workflow", icon: GitBranch },
  { href: "/live-feed", label: "Live Feed", icon: Radio, pulse: true },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-border bg-gray-50 px-3 py-4 text-foreground dark:bg-gray-900">
      <div className="flex items-center gap-2 px-2 pb-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background">
          <Activity className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">CLIENT ECC</p>
          <p className="truncate text-xs text-muted-foreground">Decision Layer</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
              )}
            >
              <div className="relative">
                <Icon className="h-4 w-4" aria-hidden />
                {"pulse" in item && item.pulse ? (
                  <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-emerald-500" />
                ) : null}
              </div>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
