"use client";

import { MockDataBanner } from "@/components/ui/MockDataBanner";
import { APIErrorCard } from "@/components/ui/APIErrorCard";
import { DATA_DOMAINS } from "@/lib/dataSource";
import { useGlobalStore } from "@/lib/store/useGlobalStore";

export function MockDataSourceBanner() {
  const bootstrapComplete = useGlobalStore((s) => s.bootstrapComplete);
  const sourcesFromDb = useGlobalStore((s) => s.sourcesFromDb);
  const lastBootstrapError = useGlobalStore((s) => s.lastBootstrapError);
  const bootstrapData = useGlobalStore((s) => s.bootstrapData);

  const anyMock =
    bootstrapComplete && DATA_DOMAINS.some((d) => sourcesFromDb[d] !== true);
  const fullyOffline =
    bootstrapComplete && DATA_DOMAINS.every((d) => sourcesFromDb[d] !== true);

  return (
    <div className="shrink-0 space-y-2">
      {lastBootstrapError ? (
        <APIErrorCard error={lastBootstrapError} onRetry={() => void bootstrapData()} />
      ) : null}
      <MockDataBanner isFromMock={Boolean(anyMock)} fullyOffline={Boolean(fullyOffline)} />
    </div>
  );
}
