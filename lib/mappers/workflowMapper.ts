import type { WorkflowLogEntry } from "@/types";
import type { WorkflowLogEntry as WorkflowLogPrisma } from "@prisma/client";

export function mapWorkflowLogFromDb(row: WorkflowLogPrisma): WorkflowLogEntry {
  return {
    id: row.id,
    recommendationId: row.recommendationId,
    status: row.status as WorkflowLogEntry["status"],
    actor: row.actor,
    role: row.role,
    timestamp: row.timestamp.toISOString(),
    comment: row.comment,
  };
}
