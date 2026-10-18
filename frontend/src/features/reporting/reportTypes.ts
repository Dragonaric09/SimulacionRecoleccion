import type { DatasetDomain } from '@/app/DatasetContext'

export type ReportModuleKind = 'summary' | 'chart' | 'table' | 'competence'

export type ReportModuleDefinition = {
  id: string
  domain: DatasetDomain
  section: string
  title: string
  description: string
  kind: ReportModuleKind
  availableInPhaseOne: boolean
}

export type ReportSelection = {
  modules: string[]
  datasets: Partial<Record<DatasetDomain, string>>
  showCover: boolean
  showDataTables: boolean
  hideEmptyOptions: boolean
  orientation: 'landscape'
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

export type ReportModuleAvailability = 'DISPONIBLE' | 'MUESTRA_PEQUENA' | 'NO_DISPONIBLE' | 'SIN_RESPUESTAS' | 'SIN_DATOS_CON_FILTRO'
