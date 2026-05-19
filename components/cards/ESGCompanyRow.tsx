import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EsgSectorKpi } from "@/types";

export function ESGCompanyRow({
  kpi,
  onChange,
}: {
  kpi: EsgSectorKpi;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1 rounded-lg border border-border p-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs">{kpi.label}</Label>
        <span className="text-[11px] text-muted-foreground">
          {kpi.pillar} · {kpi.unit}
        </span>
      </div>
      <Input type="number" value={kpi.value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

