import type { DatasetDomain } from '@/app/DatasetContext'

export type ReportModuleKind = 'summary' | 'chart' | 'table' | 'competence' | 'simulation'
export type ReportChartVariant = 'ranked' | 'donut' | 'table' | 'stacked' | 'columns' | 'diverging'
export type ReportVisualType = ReportChartVariant | 'heatmap' | 'radar' | 'scatter' | 'grouped' | 'matrix' | 'timeline'
export type ReportDomain = DatasetDomain | 'COMPARACION' | 'SIMULACION'

export type ReportModuleDefinition = {
  id: string
  domain: ReportDomain
  section: string
  title: string
  description: string
  kind: ReportModuleKind
  availableInPhaseOne: boolean
  /** Campos agregados que alimentan este módulo reportable. */
  fields?: string[]
  /** Variante por defecto del componente equivalente en la web. */
  chartVariant?: ReportChartVariant
  visualType?: ReportVisualType
}

export type ReportSelection = {
  modules: string[]
  datasets: Partial<Record<DatasetDomain, string>>
  showCover: boolean
  showDataTables: boolean
  hideEmptyOptions: boolean
  orientation: 'landscape' | 'portrait' | 'auto'
  paper: 'A4' | 'LETTER'
}

export type ReportFilters = {
  yearFrom?: number
  yearTo?: number
  laborStatus: string[]
  sector: string[]
  gender: string[]
  organizationType: string[]
  organizationSize: string[]
}

export type ReportSimulationConfig = {
  variable: string
  segment: string
  sampleSize: number
  repetitions: number
  seed: number
}

export type ReportCohortPoint = { graduationYear: number; professionalYears: number }

export type ReportEmployerDashboard = {
  filteredResponses: number
  timelineGranularity: 'day' | 'week'
  timeline: { bucket: string; count: number; cumulative: number }[]
  valuations: { key: string; answered: number; agree: number; partly: number; disagree: number; netIndex: number | null }[]
  hiringByProbability: { hired: string; probability: string; count: number }[]
  balanceByHiring: { group: 'formacion' | 'relacion'; hired: string; answered: number; netIndex: number | null }[]
}

export type ReportModuleAvailability = 'DISPONIBLE' | 'MUESTRA_PEQUENA' | 'NO_DISPONIBLE' | 'SIN_RESPUESTAS' | 'SIN_DATOS_CON_FILTRO'
