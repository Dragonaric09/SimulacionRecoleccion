import { apiRequest } from '@/api/client'
import type { ReportSummary } from '@/features/analitica/api'
import type { DatasetDomain } from '@/app/DatasetContext'
import type { ReportModuleDefinition } from './reportTypes'
import type { ReportFilters } from './reportTypes'

const fieldsByModule: Record<string, string[]> = {
  'titulados.resumen.general': ['situacion_laboral_actual', 'sector_trabajo', 'interes_posgrado'],
  'titulados.empleabilidad.perfil': ['situacion_laboral_actual', 'sector_trabajo', 'anio_titulacion', 'es_primer_empleo'],
  'titulados.formacion.continua.perfil': ['tiene_formacion_complementaria', 'formacion_complementaria_nivel', 'interes_posgrado', 'nivel_posgrado_interes', 'area_posgrado_interes'],
  'titulados.financiamiento.general': ['financiamiento_posgrado_estimado', 'nivel_posgrado_interes'],
  'titulados.competencias.brechas': ['valoracion_formacion_1', 'valoracion_formacion_2', 'valoracion_formacion_3'],
  'empleadores.resumen.contratacion': ['tipo_organizacion', 'tamano_organizacion', 'contrato_titulados_ultimos_5_anios'],
  'empleadores.valoracion.carrera': ['valoracion_formacion_1', 'valoracion_formacion_2', 'valoracion_relacion_1'],
  'empleadores.competencias.brechas': ['valoracion_formacion_1', 'valoracion_formacion_5', 'valoracion_relacion_3'],
}

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
  await Promise.all((['TITULADOS', 'EMPLEADORES'] as DatasetDomain[]).map(async (domain) => {
    const datasetId = datasetIds[domain]
    const fields = [...new Set(modules.filter((module) => module.domain === domain).flatMap((module) => fieldsByModule[module.id] ?? []))]
    if (!datasetId || fields.length === 0) return
    const endpoint = domain === 'TITULADOS' ? 'titulados' : 'employers'
    const summary = await apiRequest<ReportSummary>(`/analytics/report/${endpoint}/summary?datasetId=${encodeURIComponent(datasetId)}&fields=${encodeURIComponent(fields.join(','))}${filterQuery(domain, filters[domain])}`)
    result.set(domain, summary)
  }))
  return result
}

export function fieldsForModule(module: ReportModuleDefinition) {
  return fieldsByModule[module.id] ?? []
}
