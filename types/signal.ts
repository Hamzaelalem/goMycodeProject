export type SignalSeverity = "critical" | "high" | "medium" | "low";
export type SignalType = "risk" | "opportunity" | "policy" | "deal" | "market";
export type SignalSource = "bloomberg" | "talkwalker" | "internal";

export interface Signal {
  id: string;
  title: string;
  body: string;
  type: SignalType;
  severity: SignalSeverity;
  sentiment: number; // -1..1
  reach: number;
  timestamp: string; // ISO
  source: SignalSource;
  country: string;
  region: string;
  sector: string;
  riskFactor?: string;
  workflowItemId?: string;
  /** Source article URL (set by news ingestion). */
  url?: string;
  /** Publisher / outlet name (set by news ingestion). */
  publisher?: string;
}
