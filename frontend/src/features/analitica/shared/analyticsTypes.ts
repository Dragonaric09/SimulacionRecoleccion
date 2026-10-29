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
  notObservedCount?: number;
};

export type Cross = {
  validCount: number;
  rowCategories: string[];
  columnCategories: string[];
  counts: Record<string, Record<string, number>>;
  percentages: Record<string, Record<string, number>>;
  smallSample: boolean;
  multipleResponse?: boolean;
  rowBases?: Record<string, number>;
  columnBases?: Record<string, number>;
};

/** Métrica de las celdas del cruce; «residual» es el residuo estandarizado ajustado (solo en la tabla). */
export type CrossMetric = "count" | "rowPercent" | "columnPercent" | "residual";

export type Simulation = {
  sampleSize: number;
  repetitions: number;
  seed: number;
  cumulativeProbabilities?: number[];
  firstDraws?: { random: number; category: string }[];
  categories: {
    category: string;
    observedCount: number;
    observedPercentage: number;
    simulatedMean: number;
    /** Percentil 2,5 de las réplicas. */
    lower95: number;
    /** Percentil 97,5 de las réplicas. */
    upper95: number;
    standardDeviation: number;
    replicaPercentages?: number[];
    firstQuartile?: number;
    median?: number;
    thirdQuartile?: number;
  }[];
};

/** Escenario ajustado contra el base simulados con la misma semilla (números aleatorios comunes). */
export type SimulationComparison = {
  base: Simulation;
  scenario: Simulation;
  differences: {
    category: string;
    /** Diferencia media escenario − base, en puntos porcentuales. */
    meanDifference: number;
    /** Percentiles 2,5 y 97,5 de la diferencia réplica a réplica. */
    lower95: number;
    upper95: number;
    /** Porcentaje de réplicas en que el escenario supera o queda debajo del base. */
    shareHigher: number;
    shareLower: number;
  }[];
};

/** Escenario con nombre guardado en el servidor y compartido por todos. */
export type SavedSimulationScenario = {
  id: string;
  name: string;
  description: string | null;
  variable: string;
  segment: string;
  categories: string[];
  probabilities: number[];
  sampleSize: number;
  repetitions: number;
  seed: number;
  datasetId: string | null;
  createdAt: string;
};

export type EmploymentProfile = {
  datasetId: string;
  validResponses: number;
  cohortPoints: { graduationYear: number; professionalYears: number }[];
};

export type EmploymentDashboard = {
  summary: import("../api").AnalyticsSummary;
  profile: EmploymentProfile;
  unemploymentSummary: import("../api").AnalyticsSummary;
  firstEmploymentSummary: import("../api").AnalyticsSummary;
  entrepreneurshipSummary: import("../api").AnalyticsSummary;
};

export type CohortChartPoint = {
  graduationYear: number;
  yearsSinceGraduation: number;
  professionalYears: number;
};
