"use client";

import { Check, Download, FileUp, History, Pencil, Plus, Trash2, X } from "lucide-react";

import { KPICard } from "@/components/cards/KPICard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { PortfolioHolding } from "@/types";
import { toAumUsdM, usePortfolioViewModel, type HoldingDraft } from "./usePortfolioViewModel";

const selectClass =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const fmtUsdM = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;

function EditRow({
  draft,
  sectors,
  regions,
  errors,
  saving,
  onChange,
  onSave,
  onCancel,
}: {
  draft: HoldingDraft;
  sectors: readonly string[];
  regions: readonly string[];
  errors: string[];
  saving: boolean;
  onChange: (field: keyof HoldingDraft, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <>
      <tr className="bg-muted/40 align-top">
        <td className="p-2">
          <Input aria-label="Name" value={draft.name} onChange={(e) => onChange("name", e.target.value)} placeholder="Holding name" />
        </td>
        <td className="p-2">
          <select aria-label="Sector" className={selectClass} value={draft.sector} onChange={(e) => onChange("sector", e.target.value)}>
            {sectors.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </td>
        <td className="p-2">
          <select aria-label="Region" className={selectClass} value={draft.region} onChange={(e) => onChange("region", e.target.value)}>
            {regions.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </td>
        <td className="p-2">
          <Input aria-label="AUM in $M" inputMode="decimal" value={draft.aumUsdM} onChange={(e) => onChange("aumUsdM", e.target.value)} placeholder="900" />
        </td>
        <td className="p-2">
          <Input aria-label="IRR %" inputMode="decimal" value={draft.irrPct} onChange={(e) => onChange("irrPct", e.target.value)} placeholder="14.5" />
        </td>
        <td className="p-2">
          <Input aria-label="Risk score" inputMode="numeric" value={draft.riskScore} onChange={(e) => onChange("riskScore", e.target.value)} placeholder="0–100" />
        </td>
        <td className="p-2 text-muted-foreground">—</td>
        <td className="p-2">
          <div className="flex justify-end gap-1">
            <Button size="sm" onClick={onSave} disabled={saving} aria-label="Save holding">
              <Check aria-hidden /> Save
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancel} aria-label="Cancel editing">
              <X aria-hidden />
            </Button>
          </div>
        </td>
      </tr>
      {errors.length ? (
        <tr className="bg-muted/40">
          <td colSpan={8} className="px-2 pb-2">
            <ul role="alert" className="list-inside list-disc text-xs text-rose-700 dark:text-rose-300">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export default function PortfolioPage() {
  const vm = usePortfolioViewModel();
  const { portfolio, holdings } = vm;

  const renderEditRow = (key: string) => (
    <EditRow
      key={key}
      draft={vm.draft}
      sectors={vm.sectors}
      regions={vm.regions}
      errors={vm.formErrors}
      saving={vm.saving}
      onChange={vm.updateDraft}
      onSave={() => void vm.saveDraft()}
      onCancel={vm.cancelEdit}
    />
  );

  function viewRow(h: PortfolioHolding) {
    const confirming = vm.confirmDeleteId === h.id;
    return (
      <tr key={h.id} className="border-t border-border">
        <td className="p-2 font-medium">{h.name}</td>
        <td className="p-2">{h.sector}</td>
        <td className="p-2">{h.region}</td>
        <td className="p-2 tabular-nums">{fmtUsdM(toAumUsdM(h))}</td>
        <td className="p-2 tabular-nums">{h.irrPct}%</td>
        <td className="p-2 tabular-nums">{h.riskScore}</td>
        <td className="p-2 tabular-nums">{vm.weights[h.id]}%</td>
        <td className="p-2">
          {confirming ? (
            <div className="flex items-center justify-end gap-1">
              <span className="text-xs text-rose-700 dark:text-rose-300">Delete?</span>
              <Button size="sm" variant="destructive" onClick={() => void vm.confirmDelete(h)}>
                Yes
              </Button>
              <Button size="sm" variant="ghost" onClick={() => vm.setConfirmDeleteId(null)}>
                No
              </Button>
            </div>
          ) : (
            <div className="flex justify-end gap-1">
              <Button size="sm" variant="ghost" onClick={() => vm.startEdit(h)} aria-label={`Edit ${h.name}`} disabled={vm.editingId !== null}>
                <Pencil aria-hidden />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => vm.setConfirmDeleteId(h.id)} aria-label={`Delete ${h.name}`} disabled={vm.editingId !== null}>
                <Trash2 aria-hidden />
              </Button>
            </div>
          )}
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard label="Holdings" value={`${holdings.length} / ${vm.maxHoldings}`} hint="Cap keeps Sentinel scans within the AI budget" />
        <KPICard label="Total AUM" value={`$${portfolio.totalAumB}B`} />
        <KPICard label="Weighted IRR" value={`${portfolio.weightedIrrPct}%`} hint="AUM-weighted" />
        <KPICard label="Weighted risk" value={`${portfolio.weightedRiskScore}`} hint="AUM-weighted, 0–100" />
      </div>

      {vm.error ? (
        <div role="alert" className="flex items-start justify-between gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 p-2 text-sm text-rose-700 dark:text-rose-300">
          <span>{vm.error}</span>
          <button className="text-xs underline" onClick={() => vm.setError(null)}>Dismiss</button>
        </div>
      ) : null}
      {vm.notice ? (
        <div role="status" className="flex items-start justify-between gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2 text-sm text-emerald-800 dark:text-emerald-200">
          <span>{vm.notice}</span>
          <button className="text-xs underline" onClick={() => vm.setNotice(null)}>Dismiss</button>
        </div>
      ) : null}

      <section className="space-y-3 rounded-xl border border-border p-4" aria-labelledby="holdings-title">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="holdings-title" className="text-base font-semibold">My Portfolio</h2>
            <p className="text-xs text-muted-foreground">
              These holdings drive the Adaptive Portfolio Sentinel, Scenarios and Market Intelligence.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={vm.startAdd} disabled={vm.atCapacity || vm.editingId !== null}>
              <Plus aria-hidden /> Add holding
            </Button>
            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted focus-within:ring-3 focus-within:ring-ring/50">
              <FileUp className="h-4 w-4" aria-hidden /> Upload CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  void vm.onCsvFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <Button variant="outline" onClick={vm.downloadTemplate}>
              <Download aria-hidden /> Template
            </Button>
            <Button variant="outline" onClick={vm.exportCsv} disabled={holdings.length === 0}>
              <Download aria-hidden /> Export
            </Button>
          </div>
        </div>

        {vm.atCapacity ? (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Portfolio is at the {vm.maxHoldings}-holding limit — delete a holding to add another.
          </p>
        ) : null}

        {vm.csv ? (
          <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                Preview: {vm.csv.fileName} — {vm.csvValidRows.length} valid row(s)
                {vm.csvInvalidCount ? `, ${vm.csvInvalidCount} with errors` : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="destructive" onClick={() => void vm.importCsv("replace")} disabled={!vm.canReplace || vm.importing}>
                  Replace all {holdings.length} holdings
                </Button>
                <Button size="sm" onClick={() => void vm.importCsv("append")} disabled={!vm.canAppend || vm.importing}>
                  Append to portfolio
                </Button>
                <Button size="sm" variant="ghost" onClick={vm.clearCsv}>
                  Cancel
                </Button>
              </div>
            </div>
            {vm.csv.parsed.headerErrors.map((e) => (
              <p key={e} role="alert" className="text-xs text-rose-700 dark:text-rose-300">{e}</p>
            ))}
            {vm.csvInvalidCount ? (
              <p className="text-xs text-rose-700 dark:text-rose-300">Fix the rows below and upload again — nothing is imported until every row is valid.</p>
            ) : null}
            {!vm.canAppend && vm.csvInvalidCount === 0 && vm.csvValidRows.length > 0 ? (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Appending would exceed {vm.maxHoldings} holdings{vm.canReplace ? " — use Replace instead." : "."}
              </p>
            ) : null}
            {vm.csv.parsed.rows.length ? (
              <div className="max-h-64 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="p-1">Line</th>
                      <th className="p-1">Holding</th>
                      <th className="p-1">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vm.csv.parsed.rows.map((row) => (
                      <tr key={row.line} className="border-t border-border align-top">
                        <td className="p-1 tabular-nums">{row.line}</td>
                        <td className="p-1">
                          {row.result.ok
                            ? `${row.result.value.name} · ${row.result.value.sector} · ${row.result.value.region} · ${fmtUsdM(row.result.value.aumUsdM)} · IRR ${row.result.value.irrPct}% · risk ${row.result.value.riskScore}`
                            : "—"}
                        </td>
                        <td className={cn("p-1", row.result.ok ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300")}>
                          {row.result.ok ? "OK" : row.result.errors.join("; ")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-2">Name</th>
                <th className="p-2">Sector</th>
                <th className="p-2">Region</th>
                <th className="p-2">AUM</th>
                <th className="p-2">IRR</th>
                <th className="p-2">Risk</th>
                <th className="p-2">Weight</th>
                <th className="p-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (vm.editingId === h.id ? renderEditRow(h.id) : viewRow(h)))}
              {vm.editingId === "new" ? renderEditRow("new") : null}
              {!vm.loading && holdings.length === 0 && vm.editingId !== "new" ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">
                    No holdings yet — add one or upload a CSV.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-border p-4" aria-labelledby="audit-title">
        <h2 id="audit-title" className="flex items-center gap-2 text-sm font-semibold">
          <History className="h-4 w-4" aria-hidden /> Recent changes
        </h2>
        {vm.audit.length ? (
          <ul className="mt-2 space-y-1 text-xs">
            {vm.audit.map((entry) => (
              <li key={entry.id} className="flex justify-between gap-3">
                <span>{entry.summary}</span>
                <span className="shrink-0 text-muted-foreground">{new Date(entry.at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">No changes recorded yet.</p>
        )}
      </section>
    </div>
  );
}
