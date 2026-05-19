"use client";

export function MockDataBanner({
  isFromMock,
  fullyOffline,
}: {
  isFromMock: boolean;
  /** Every API domain fell back to mocks (typical when DATABASE_URL / Postgres is not set up yet). */
  fullyOffline?: boolean;
}) {
  if (!isFromMock) return null;
  if (fullyOffline) {
    return (
      <div
        className="mb-3 rounded-md border border-border bg-muted/60 px-3 py-2 text-xs text-muted-foreground"
        role="status"
      >
        <p className="font-medium text-foreground">Using bundled mock data</p>
        <p className="mt-1 leading-relaxed">
          No database response from the API (PostgreSQL not running, <code className="rounded bg-muted px-1">DATABASE_URL</code>{" "}
          missing in <code className="rounded bg-muted px-1">.env.local</code>, or migrations not applied). Configure the DB,
          then refresh the page.
        </p>
      </div>
    );
  }
  return (
    <div
      className="mb-3 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
      role="status"
    >
      <span aria-hidden>⚠</span>
      <span>Some data is from mock files — not everything loaded from the database</span>
    </div>
  );
}
