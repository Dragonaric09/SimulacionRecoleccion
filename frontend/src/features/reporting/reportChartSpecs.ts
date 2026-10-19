import type { CategoryDistribution, AnalyticsSummaryData, ReportCompetence } from '@/features/analitica/api'
import type { ReportCohortPoint, ReportEmployerDashboard, ReportChartVariant } from './reportTypes'

export type ReportChartSpec =
  | { type: 'categorical'; distribution: CategoryDistribution; variant: ReportChartVariant; labelFormatter: (value: string) => string; hideEmptyOptions: boolean; accent: string }
  | { type: 'numeric-kpi'; summary: AnalyticsSummaryData; field: string }
  | { type: 'competence-mean'; items: ReportCompetence[] }
  | { type: 'competence-heatmap'; items: ReportCompetence[]; employer: boolean }
  | { type: 'competence-radar'; items: ReportCompetence[]; color: string }
  | { type: 'cohort-scatter'; points: ReportCohortPoint[] }
  | { type: 'employer-timeline'; dashboard: ReportEmployerDashboard }
  | { type: 'employer-balance'; rows: { label: string; agree: number; partly: number; disagree: number; netIndex: number | null; base: number }[] }
  | { type: 'employer-hiring-matrix'; rows: { label: string; yes: number; no: number; unknown: number }[] }
  | { type: 'employer-group-balance'; rows: { group: string; yes: number | null; no: number | null }[] }

export function categoricalSpec(distribution: CategoryDistribution, variant: ReportChartVariant, labelFormatter: (value: string) => string, hideEmptyOptions: boolean, accent: string): ReportChartSpec {
  return { type: 'categorical', distribution, variant, labelFormatter, hideEmptyOptions, accent }
}

export function numericKpiSpec(summary: AnalyticsSummaryData, field: string): ReportChartSpec {
  return { type: 'numeric-kpi', summary, field }
}
