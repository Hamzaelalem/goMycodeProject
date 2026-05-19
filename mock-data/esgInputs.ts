import type { EsgSectorInputs } from "@/types";

export const esgInputs: EsgSectorInputs[] = [
  {
    sector: "Solar",
    kpis: [
      { id: "sol-e1", label: "Lifecycle emissions", value: 28, unit: "tCO2e/GWh", pillar: "E" },
      { id: "sol-e2", label: "Water use intensity", value: 0.6, unit: "m3/MWh", pillar: "E" },
      { id: "sol-s1", label: "Safety incident rate", value: 0.18, unit: "per 200k hrs", pillar: "S" },
      { id: "sol-g1", label: "Board independence", value: 76, unit: "%", pillar: "G" },
    ],
    scores: { E: 86, S: 74, G: 78, overall: 79, grade: "A-" },
  },
  {
    sector: "Oil&Gas",
    kpis: [
      { id: "og-e1", label: "Methane intensity", value: 0.22, unit: "%", pillar: "E" },
      { id: "og-e2", label: "Flaring rate", value: 1.6, unit: "%", pillar: "E" },
      { id: "og-s1", label: "Safety incident rate", value: 0.34, unit: "per 200k hrs", pillar: "S" },
      { id: "og-g1", label: "Compliance incidents", value: 3, unit: "cases", pillar: "G" },
    ],
    scores: { E: 48, S: 62, G: 58, overall: 56, grade: "B-" },
  },
  {
    sector: "Banking",
    kpis: [
      { id: "bnk-e1", label: "Financed emissions coverage", value: 54, unit: "%", pillar: "E" },
      { id: "bnk-s1", label: "SME inclusion index", value: 71, unit: "score", pillar: "S" },
      { id: "bnk-g1", label: "Risk governance maturity", value: 78, unit: "score", pillar: "G" },
      { id: "bnk-g2", label: "Independent audit frequency", value: 2, unit: "per yr", pillar: "G" },
    ],
    scores: { E: 66, S: 72, G: 80, overall: 73, grade: "B+" },
  },
  {
    sector: "Hospitals",
    kpis: [
      { id: "hos-e1", label: "Energy intensity", value: 290, unit: "kWh/m2", pillar: "E" },
      { id: "hos-s1", label: "Patient outcome index", value: 82, unit: "score", pillar: "S" },
      { id: "hos-s2", label: "Staff turnover", value: 14, unit: "%", pillar: "S" },
      { id: "hos-g1", label: "Clinical governance", value: 76, unit: "score", pillar: "G" },
    ],
    scores: { E: 60, S: 82, G: 75, overall: 72, grade: "B+" },
  },
  {
    sector: "Water",
    kpis: [
      { id: "wat-e1", label: "Non-revenue water", value: 21, unit: "%", pillar: "E" },
      { id: "wat-e2", label: "Leakage reduction", value: 3.4, unit: "% YoY", pillar: "E" },
      { id: "wat-s1", label: "Service continuity", value: 98.2, unit: "%", pillar: "S" },
      { id: "wat-g1", label: "Tariff transparency", value: 74, unit: "score", pillar: "G" },
    ],
    scores: { E: 74, S: 78, G: 72, overall: 75, grade: "A-" },
  },
  {
    sector: "Agriculture",
    kpis: [
      { id: "agr-e1", label: "Soil carbon improvement", value: 1.8, unit: "%", pillar: "E" },
      { id: "agr-e2", label: "Water efficiency", value: 0.9, unit: "index", pillar: "E" },
      { id: "agr-s1", label: "Smallholder reach", value: 120_000, unit: "farmers", pillar: "S" },
      { id: "agr-g1", label: "Supply chain audits", value: 68, unit: "%", pillar: "G" },
    ],
    scores: { E: 82, S: 70, G: 64, overall: 72, grade: "B+" },
  },
  {
    sector: "Materials",
    kpis: [
      { id: "mat-e1", label: "Water stress exposure", value: 63, unit: "score", pillar: "E" },
      { id: "mat-s1", label: "Community grievance closure", value: 58, unit: "%", pillar: "S" },
      { id: "mat-g1", label: "Transparency index", value: 62, unit: "score", pillar: "G" },
    ],
    scores: { E: 54, S: 60, G: 62, overall: 59, grade: "B-" },
  },
  {
    sector: "Industrials",
    kpis: [
      { id: "ind-e1", label: "Energy intensity", value: 0.72, unit: "index", pillar: "E" },
      { id: "ind-s1", label: "Safety incident rate", value: 0.28, unit: "per 200k hrs", pillar: "S" },
      { id: "ind-g1", label: "Compliance maturity", value: 70, unit: "score", pillar: "G" },
    ],
    scores: { E: 64, S: 66, G: 70, overall: 67, grade: "B" },
  },
];
