import type { EsgSectorInputs } from "@/types";
import type { EsgSectorInput as EsgSectorInputRow } from "@prisma/client";

type EsgPayload = Pick<EsgSectorInputs, "kpis" | "scores">;

export function mapEsgSectorFromDb(row: EsgSectorInputRow): EsgSectorInputs {
  const payload = row.payload as unknown as EsgPayload;
  return {
    sector: row.sector,
    kpis: payload.kpis,
    scores: payload.scores,
  };
}
