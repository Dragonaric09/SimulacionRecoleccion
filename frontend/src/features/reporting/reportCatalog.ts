import type { DatasetDomain } from '@/app/DatasetContext'
import type { ReportModuleDefinition } from './reportTypes'

const titulados = (id: string, section: string, title: string, description: string, kind: ReportModuleDefinition['kind'] = 'chart'): ReportModuleDefinition => ({
  id: `titulados.${id}`,
  domain: 'TITULADOS',
  section,
  title,
  description,
  kind,
  availableInPhaseOne: true,
})

const empleadores = (id: string, section: string, title: string, description: string, kind: ReportModuleDefinition['kind'] = 'chart'): ReportModuleDefinition => ({
  id: `empleadores.${id}`,
  domain: 'EMPLEADORES',
  section,
  title,
  description,
  kind,
  availableInPhaseOne: true,
})

/** Catálogo provisional de módulos existentes. Los IDs son el contrato estable del reporte. */
export const reportCatalog: ReportModuleDefinition[] = [
  titulados('resumen.general', 'Resumen general', 'Resumen general', 'Indicadores principales de titulados', 'summary'),
  titulados('empleabilidad.perfil', 'Perfil y empleabilidad', 'Perfil de empleabilidad', 'Situación laboral, sectores y trayectoria'),
  titulados('formacion.continua.perfil', 'Formación continua', 'Formación continua', 'Continuidad y necesidades formativas'),
  titulados('financiamiento.general', 'Financiamiento', 'Financiamiento', 'Preferencias y fuentes de financiamiento'),
  titulados('competencias.brechas', 'Brechas de competencias', 'Brechas de competencias', 'Medias y dispersión por competencia', 'competence'),
  empleadores('resumen.contratacion', 'Resumen y contratación', 'Resumen y contratación', 'Indicadores de empleadores', 'summary'),
  empleadores('valoracion.carrera', 'Valoración de la Carrera', 'Valoración de la Carrera', 'Distribución por afirmación y dimensiones'),
  empleadores('competencias.brechas', 'Brechas de competencias', 'Brechas de competencias', 'Valoración de competencias', 'competence'),
]

export function modulesByDomain(domain: DatasetDomain) {
  return reportCatalog.filter((module) => module.domain === domain && module.availableInPhaseOne)
}

export function groupedModules(domain: DatasetDomain) {
  return modulesByDomain(domain).reduce<Record<string, ReportModuleDefinition[]>>((groups, module) => {
    ;(groups[module.section] ??= []).push(module)
    return groups
  }, {})
}
