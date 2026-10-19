import { reportCatalog } from './reportCatalog'

export const REPORT_SELECTION_STORAGE_KEY = 'simulacionem.report.selection'
export const REPORT_SELECTION_EVENT = 'simulacionem:report-selection-changed'

function normalize(value: string) {
  return value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
}

export function reportModuleForTitle(title: string) {
  const wanted = normalize(title)
  const aliases: Record<string, string> = {
    'titulados': 'titulados.resumen.indicadores',
    'con empleo': 'titulados.resumen.indicadores',
    'mediana desde titulacion': 'titulados.resumen.indicadores',
    'siguen en su primer empleo': 'titulados.resumen.indicadores',
    'interesados en posgrado': 'titulados.resumen.indicadores',
    'mayor brecha': 'titulados.resumen.indicadores',
    'organizaciones encuestadas': 'empleadores.resumen.indicadores',
    'han contratado en los ultimos 5 anos': 'empleadores.resumen.indicadores',
    'con alta probabilidad de contratar': 'empleadores.resumen.indicadores',
    'competencia media percibida': 'empleadores.resumen.indicadores',
    'sector de insercion laboral': 'titulados.perfil.sector-actual',
    'rubro de la empresa': 'titulados.perfil.rubro',
    'remuneracion mensual liquida': 'titulados.perfil.remuneracion',
    'areas dentro de la organizacion': 'titulados.perfil.area-trabajo',
    'pertinencia trabajo formacion': 'titulados.perfil.pertinencia',
    'satisfaccion con la formacion': 'titulados.formacion.valoracion',
    'balance de acuerdo por afirmacion': 'empleadores.resumen.balance-valoracion',
    'contratacion segun probabilidad de contratar': 'empleadores.resumen.contratacion-probabilidad',
    'indice neto de acuerdo segun contratacion': 'empleadores.resumen.balance-contratacion',
    'niveles de suficiencia por competencia': 'empleadores.competencias.brechas',
    'media por competencia': 'empleadores.competencias.brechas',
  }
  const aliasId = aliases[wanted]
  return aliasId ? reportCatalog.find((module) => module.id === aliasId) : reportCatalog.find((module) => normalize(module.title) === wanted)
}

export function addReportModule(moduleId: string) {
  try {
    const saved = JSON.parse(localStorage.getItem(REPORT_SELECTION_STORAGE_KEY) ?? '{}') as { selected?: unknown; preset?: string }
    const selected = Array.isArray(saved.selected) ? saved.selected.filter((value): value is string => typeof value === 'string') : []
    if (!selected.includes(moduleId)) selected.push(moduleId)
    localStorage.setItem(REPORT_SELECTION_STORAGE_KEY, JSON.stringify({ selected, preset: 'Reporte personalizado' }))
    window.dispatchEvent(new CustomEvent(REPORT_SELECTION_EVENT, { detail: { moduleId } }))
    return true
  } catch {
    return false
  }
}

export function isReportModuleSelected(moduleId: string) {
  try {
    const saved = JSON.parse(localStorage.getItem(REPORT_SELECTION_STORAGE_KEY) ?? '{}') as { selected?: unknown }
    return Array.isArray(saved.selected) && saved.selected.includes(moduleId)
  } catch {
    return false
  }
}
