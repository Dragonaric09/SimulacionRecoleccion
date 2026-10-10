// Punto de entrada para piezas que pertenecen a ambos dominios.
// Las páginas específicas no deberían importar directamente el módulo legado.
export {
  CompetencePage,
  CrossExportPage,
  UnavailableAnalyticPage,
} from "../RestAnalyticPages";
export { DatasetAnalyticsPage, DatasetSelect, DistributionCard, PageHeading, formatMetric, labelFor, useDatasets } from "./AnalyticsPrimitives";
export { booleanLabel, crossMetricLabel, exportCrossCsv, exportCrossExcel, exportCrossPng } from "./crossExportUtils";
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
