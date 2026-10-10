export type Domain = "TITULADOS" | "EMPLEADORES";
export type Tone = "titulados" | "empleadores";

export type Competence = {
  code: string;
  name: string;
  group: string;
  validCount: number;
  average: number;
  standardDeviation: number | null;
  median: number;
  modalLevel: number;
  levelCounts: Record<string, number>;
};

export type Cross = {
  validCount: number;
  rowCategories: string[];
  columnCategories: string[];
  counts: Record<string, Record<string, number>>;
  percentages: Record<string, Record<string, number>>;
  smallSample: boolean;
};

export type CrossMetric = "count" | "rowPercent" | "columnPercent";

export type Simulation = {
  sampleSize: number;
  repetitions: number;
  seed: number;
  categories: {
    category: string;
    observedCount: number;
    observedPercentage: number;
    simulatedMean: number;
    lower95: number;
    upper95: number;
    standardDeviation: number;
  }[];
};

export type EmploymentProfile = {
  datasetId: string;
  validResponses: number;
  cohortPoints: { graduationYear: number; professionalYears: number }[];
};

export type CohortChartPoint = {
  graduationYear: number;
  professionalYears: number;
  isOutlier: boolean;
};
