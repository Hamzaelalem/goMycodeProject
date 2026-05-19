export type EsgPillar = "E" | "S" | "G";

export interface EsgSectorKpi {
  id: string;
  label: string;
  value: number;
  unit: string;
  pillar: EsgPillar;
}

export interface EsgSectorInputs {
  sector: string;
  kpis: EsgSectorKpi[];
  scores: {
    E: number;
    S: number;
    G: number;
    overall: number;
    grade: string;
  };
}
