import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPct } from "@/lib/utils/formatters";
import type { ScenarioCard as ScenarioCardType } from "@/types";

export function ScenarioCard({
  item,
  active,
  onClick,
}: {
  item: ScenarioCardType;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      <Card className={cn("rounded-xl border", active && "border-[#378ADD]")}>
        <CardContent className="space-y-1 p-4">
          <p className="text-sm font-medium">{item.label}</p>
          <p className="text-xs text-muted-foreground">{item.probabilityPct}% probability</p>
          <p className="text-xs">IRR {formatPct(item.portfolioIrrPct, 1)}</p>
          <p className="text-xs">AUM ${item.projectedAumB.toFixed(1)}B</p>
          <p className="text-xs">Risk {item.riskScore}</p>
        </CardContent>
      </Card>
    </button>
  );
}

