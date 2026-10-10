// Punto de entrada para piezas que pertenecen a ambos dominios.
// Las páginas específicas no deberían importar directamente el módulo legado.
export {
  CompetencePage,
  CrossExportPage,
  DatasetAnalyticsPage,
  UnavailableAnalyticPage,
} from "../RestAnalyticPages";
export type {
  CohortChartPoint,
  Competence,
  Cross,
  CrossMetric,
  Domain,
  EmploymentProfile,
  Simulation,
  Tone,
} from "./analyticsTypes";
