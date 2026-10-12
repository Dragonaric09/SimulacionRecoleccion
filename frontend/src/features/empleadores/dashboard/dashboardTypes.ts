/** Forma de la respuesta de GET /api/analytics/employers/dashboard. Espejo de EmployerDashboardDto. */

export type KpiUnit = 'count' | 'percent' | 'score'

export type DashboardKpi = {
  key: string
  label: string
  value: number | null
  unit: KpiUnit
  previous: number | null
  change: number | null
  changeFormat: 'percent' | 'points'
  base: number
}

export type TimePoint = { bucket: string; count: number; cumulative: number }
export type CountItem = { label: string; count: number; percent: number }
export type Distribution = { key: string; answered: number; missing: number; items: CountItem[] }
export type HiringCell = { hired: string; probability: string; count: number }
export type ValuationStat = {
  key: string
  group: 'formacion' | 'relacion'
  answered: number
  agree: number
  partly: number
  disagree: number
  noKnow: number
  netIndex: number | null
}
export type GroupBalance = { group: 'formacion' | 'relacion'; hired: string; answered: number; netIndex: number | null }
export type DashboardCompetence = {
  code: string
  name: string
  group: string
  answered: number
  notObserved: number
  average: number | null
  standardDeviation: number | null
  median: number | null
  levels: Record<string, number>
  lowShare: number
}
export type SizeCompetenceCell = { size: string; code: string; name: string; answered: number; average: number | null }

export type EmployerDashboard = {
  datasetId: string
  totalResponses: number
  filteredResponses: number
  smallSample: boolean
  firstResponse: string | null
  lastResponse: string | null
  timelineGranularity: 'day' | 'week'
  kpis: DashboardKpi[]
  timeline: TimePoint[]
  organizationType: Distribution
  organizationSize: Distribution
  department: Distribution
  branch: Distribution
  sector: Distribution
  demandedLevel: Distribution
  channel: Distribution
  hiring: Distribution
  hiringProbability: Distribution
  positions: Distribution
  hiringByProbability: HiringCell[]
  valuations: ValuationStat[]
  balanceByHiring: GroupBalance[]
  competences: DashboardCompetence[]
  sizeCompetence: SizeCompetenceCell[]
}

export type ResponseRow = {
  id: string
  submittedAt: string | null
  organizationType: string | null
  organizationSize: string | null
  department: string | null
  sector: string | null
  hired: string
  hiringProbability: string | null
  demandedLevel: string | null
  channel: string | null
  competenceAverage: number | null
  fullAgreement: number
}

export type ResponsePage = { total: number; page: number; size: number; rows: ResponseRow[] }
