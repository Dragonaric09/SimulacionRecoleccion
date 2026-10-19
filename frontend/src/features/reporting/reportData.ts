import { apiRequest } from '@/api/client'
import type { ReportCompetence, ReportComparison, ReportSummary } from '@/features/analitica/api'
import type { Simulation } from '@/features/analitica/shared/analyticsTypes'
import type { DatasetDomain } from '@/app/DatasetContext'
import type { ReportModuleDefinition } from './reportTypes'
import type { ReportCohortPoint, ReportEmployerDashboard, ReportFilters, ReportSimulationConfig } from './reportTypes'
import { simulationCategories } from '@/features/analitica/simulation/simulationUtils'

function filterQuery(domain: DatasetDomain, filters: ReportFilters | undefined) {
  if (!filters) return ''
  const params = new URLSearchParams()
  if (domain === 'TITULADOS') {
    if (filters.yearFrom !== undefined) params.set('yearFrom', String(filters.yearFrom))
    if (filters.yearTo !== undefined) params.set('yearTo', String(filters.yearTo))
    filters.laborStatus.forEach((value) => params.append('laborStatus', value))
    filters.sector.forEach((value) => params.append('sector', value))
    filters.gender.forEach((value) => params.append('gender', value))
  } else {
    filters.organizationType.forEach((value) => params.append('organizationType', value))
    filters.organizationSize.forEach((value) => params.append('organizationSize', value))
  }
  const query = params.toString()
  return query ? `&${query}` : ''
}

export async function loadReportSummaries(modules: ReportModuleDefinition[], datasetIds: Partial<Record<DatasetDomain, string>>, filters: Partial<Record<DatasetDomain, ReportFilters>> = {}) {
  const result = new Map<DatasetDomain, ReportSummary>()
  const loaded = await Promise.all((['TITULADOS', 'EMPLEADORES'] as DatasetDomain[]).map(async (domain) => {
    const datasetId = datasetIds[domain]
    const fields = [...new Set(modules.filter((module) => module.domain === domain).flatMap((module) => module.fields ?? []))]
    if (!datasetId || fields.length === 0) return null
    const endpoint = domain === 'TITULADOS' ? 'titulados' : 'employers'
    const summary = await apiRequest<ReportSummary>(`/analytics/report/${endpoint}/summary?datasetId=${encodeURIComponent(datasetId)}&fields=${encodeURIComponent(fields.join(','))}${filterQuery(domain, filters[domain])}`)
    return { domain, summary }
  }))
  loaded.forEach((item) => { if (item) result.set(item.domain, item.summary) })
  return result
}

export function fieldsForModule(module: ReportModuleDefinition) {
  return module.fields ?? []
}

export async function loadReportCohorts(datasetIds: Partial<Record<DatasetDomain, string>>, filters: Partial<Record<DatasetDomain, ReportFilters>> = {}) {
  if (!datasetIds.TITULADOS) return undefined
  const response = await apiRequest<{ cohortPoints: ReportCohortPoint[] }>(`/analytics/titulados/employment/profile?datasetId=${encodeURIComponent(datasetIds.TITULADOS)}${filterQuery('TITULADOS', filters.TITULADOS)}`)
  return response.cohortPoints
}

export async function loadReportEmployerDashboard(datasetIds: Partial<Record<DatasetDomain, string>>, filters: Partial<Record<DatasetDomain, ReportFilters>> = {}) {
  if (!datasetIds.EMPLEADORES) return undefined
  return apiRequest<ReportEmployerDashboard>(`/analytics/employers/dashboard?datasetId=${encodeURIComponent(datasetIds.EMPLEADORES)}${filterQuery('EMPLEADORES', filters.EMPLEADORES)}`)
}

export async function loadReportComparisons(datasetIds: Partial<Record<DatasetDomain, string>>) {
  if (!datasetIds.TITULADOS || !datasetIds.EMPLEADORES) return undefined
  return apiRequest<{ competencias: ReportComparison[] }>(`/analytics/comparison/competencies?tituladosDatasetId=${encodeURIComponent(datasetIds.TITULADOS)}&empleadoresDatasetId=${encodeURIComponent(datasetIds.EMPLEADORES)}&alfa=0.05`)
}

export async function loadReportSimulation(datasetIds: Partial<Record<DatasetDomain, string>>, config: ReportSimulationConfig) {
  if (!datasetIds.TITULADOS) return undefined
  const segment = config.segment === 'all' ? '' : `&gender=${encodeURIComponent(config.segment)}`
  const summary = await apiRequest<{ distributions: Record<string, { validCount: number; counts: Record<string, number> }> }>(`/analytics/titulados/summary?datasetId=${encodeURIComponent(datasetIds.TITULADOS)}&fields=${encodeURIComponent(config.variable)}${segment}`)
  const distribution = summary.distributions[config.variable]
  if (!distribution || distribution.validCount === 0) return undefined
  const categories = simulationCategories(config.variable, distribution.counts)
  const total = categories.reduce((sum, category) => sum + (distribution.counts[category] ?? 0), 0)
  return apiRequest<Simulation>('/analytics/simulation/multinomial', {
    method: 'POST',
    body: JSON.stringify({
      categories,
      probabilities: categories.map((category) => (distribution.counts[category] ?? 0) / total),
      observedCounts: categories.map((category) => distribution.counts[category] ?? 0),
      sampleSize: config.sampleSize,
      repetitions: config.repetitions,
      seed: config.seed,
    }),
  })
}

export async function loadReportCompetences(datasetIds: Partial<Record<DatasetDomain, string>>, filters: Partial<Record<DatasetDomain, ReportFilters>> = {}) {
  const result = new Map<DatasetDomain, ReportCompetence[]>()
  const loaded = await Promise.all((['TITULADOS', 'EMPLEADORES'] as DatasetDomain[]).map(async (domain) => {
    const datasetId = datasetIds[domain]
    if (!datasetId) return null
    const endpoint = domain === 'TITULADOS' ? 'titulados' : 'employers'
    const competences = await apiRequest<ReportCompetence[]>(`/analytics/report/${endpoint}/competences?datasetId=${encodeURIComponent(datasetId)}${filterQuery(domain, filters[domain])}`)
    return { domain, competences }
  }))
  loaded.forEach((item) => { if (item) result.set(item.domain, item.competences) })
  return result
}
