export type WorkflowStatus =
  | "PENDING_REVIEW"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "EXECUTED";

export interface WorkflowLogEntry {
  id: string;
  recommendationId: string;
  status: WorkflowStatus;
  actor: string;
  role: string;
  timestamp: string; // ISO
  comment: string;
}

export interface WorkflowItem {
  recommendationId: string;
  title: string;
  status: WorkflowStatus;
  confidence: number;
  actor: string;
}
