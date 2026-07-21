import type { EsgSectorInputs } from "@/types";

/**
 * Mock ESG inputs — one row per sector, covering the nine sectors from the
 * project brief §5.2. KPIs mirror the brief's sector-specific inputs (E/S/G
 * pillars). Illustrative demo figures, not audited disclosures.
 */
export const esgInputs: EsgSectorInputs[] = [
  {
    sector: "Solar & Energy",
    kpis: [
      { id: "sol-e1", label: "Carbon credits earned", value: 142_000, unit: "tCO2e", pillar: "E" },
      { id: "sol-e2", label: "LCOE", value: 41, unit: "$/MWh", pillar: "E" },
      { id: "sol-e3", label: "Renewable generation", value: 94, unit: "%", pillar: "E" },
      { id: "sol-s1", label: "Community energy access rate", value: 78, unit: "%", pillar: "S" },
      { id: "sol-g1", label: "Regulatory compliance score", value: 82, unit: "score", pillar: "G" },
    ],
    scores: { E: 86, S: 74, G: 80, overall: 80, grade: "A-" },
  },
  {
    sector: "Oil & Gas",
    kpis: [
      { id: "og-e1", label: "Flaring intensity", value: 1.6, unit: "%", pillar: "E" },
      { id: "og-e2", label: "Spill incidents", value: 2, unit: "cases", pillar: "E" },
      { id: "og-e3", label: "Methane leakage", value: 0.22, unit: "%", pillar: "E" },
      { id: "og-s1", label: "Local employment", value: 63, unit: "%", pillar: "S" },
      { id: "og-g1", label: "Reserve reporting accuracy", value: 91, unit: "score", pillar: "G" },
    ],
    scores: { E: 48, S: 62, G: 66, overall: 57, grade: "B-" },
  },
  {
    sector: "Properties",
    kpis: [
      { id: "prp-e1", label: "Green building certifications", value: 64, unit: "%", pillar: "E" },
      { id: "prp-e2", label: "Energy intensity", value: 118, unit: "kWh/m2", pillar: "E" },
      { id: "prp-s1", label: "Affordable housing share", value: 22, unit: "%", pillar: "S" },
      { id: "prp-g1", label: "Tenant satisfaction score", value: 79, unit: "score", pillar: "G" },
    ],
    scores: { E: 68, S: 66, G: 74, overall: 69, grade: "B" },
  },
  {
    sector: "Banking",
    kpis: [
      { id: "bnk-e1", label: "Green loan portfolio", value: 31, unit: "%", pillar: "E" },
      { id: "bnk-s1", label: "Financial inclusion index", value: 71, unit: "score", pillar: "S" },
      { id: "bnk-s2", label: "Employee diversity", value: 44, unit: "%", pillar: "S" },
      { id: "bnk-g1", label: "NPL ratio", value: 3.8, unit: "%", pillar: "G" },
      { id: "bnk-g2", label: "Capital adequacy", value: 17.5, unit: "%", pillar: "G" },
    ],
    scores: { E: 66, S: 72, G: 80, overall: 73, grade: "B+" },
  },
  {
    sector: "Hospitals",
    kpis: [
      { id: "hos-e1", label: "Medical waste management score", value: 74, unit: "score", pillar: "E" },
      { id: "hos-s1", label: "Patient satisfaction", value: 82, unit: "score", pillar: "S" },
      { id: "hos-s2", label: "Staff-to-patient ratio", value: 1.8, unit: "per bed", pillar: "S" },
      { id: "hos-g1", label: "Clinical governance score", value: 76, unit: "score", pillar: "G" },
    ],
    scores: { E: 62, S: 82, G: 76, overall: 73, grade: "B+" },
  },
  {
    sector: "Hotels",
    kpis: [
      { id: "htl-e1", label: "Energy per occupied room", value: 31, unit: "kWh/room", pillar: "E" },
      { id: "htl-e2", label: "Water intensity", value: 0.42, unit: "m3/room", pillar: "E" },
      { id: "htl-s1", label: "Local supplier share", value: 58, unit: "%", pillar: "S" },
      { id: "htl-s2", label: "Staff training hours", value: 36, unit: "hrs/yr", pillar: "S" },
      { id: "htl-g1", label: "Anti-corruption policy score", value: 70, unit: "score", pillar: "G" },
    ],
    scores: { E: 60, S: 68, G: 66, overall: 64, grade: "B" },
  },
  {
    sector: "Water Treatment",
    kpis: [
      { id: "wat-e1", label: "Treatment efficiency", value: 96, unit: "%", pillar: "E" },
      { id: "wat-e2", label: "Chemical usage", value: 0.8, unit: "kg/ML", pillar: "E" },
      { id: "wat-s1", label: "Coverage population", value: 2_400_000, unit: "people", pillar: "S" },
      { id: "wat-s2", label: "Water quality index", value: 91, unit: "score", pillar: "S" },
      { id: "wat-g1", label: "Regulatory compliance score", value: 78, unit: "score", pillar: "G" },
    ],
    scores: { E: 76, S: 80, G: 74, overall: 77, grade: "A-" },
  },
  {
    sector: "Agriculture",
    kpis: [
      { id: "agr-e1", label: "Irrigation efficiency", value: 82, unit: "%", pillar: "E" },
      { id: "agr-e2", label: "Pesticide intensity", value: 1.4, unit: "kg/ha", pillar: "E" },
      { id: "agr-s1", label: "Smallholder inclusion", value: 64, unit: "%", pillar: "S" },
      { id: "agr-s2", label: "Fair wage index", value: 73, unit: "score", pillar: "S" },
      { id: "agr-g1", label: "Land rights compliance", value: 68, unit: "%", pillar: "G" },
    ],
    scores: { E: 80, S: 72, G: 66, overall: 73, grade: "B+" },
  },
  {
    sector: "Logistics",
    kpis: [
      { id: "log-e1", label: "CO2 per ton-km", value: 62, unit: "gCO2/t-km", pillar: "E" },
      { id: "log-e2", label: "Fleet electrification", value: 24, unit: "%", pillar: "E" },
      { id: "log-s1", label: "Driver safety score", value: 77, unit: "score", pillar: "S" },
      { id: "log-s2", label: "On-time delivery", value: 93, unit: "%", pillar: "S" },
      { id: "log-g1", label: "Anti-bribery compliance", value: 71, unit: "score", pillar: "G" },
    ],
    scores: { E: 58, S: 78, G: 70, overall: 68, grade: "B" },
  },
];
