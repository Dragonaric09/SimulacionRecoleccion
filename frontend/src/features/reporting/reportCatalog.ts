import type { DatasetDomain } from '@/app/DatasetContext'
import type { ReportChartVariant, ReportModuleDefinition, ReportVisualType } from './reportTypes'

const fieldModule = (domain: DatasetDomain, id: string, section: string, title: string, field: string, description = `Distribución de ${title.toLocaleLowerCase()}`, chartVariant: ReportChartVariant = 'ranked', visualType: ReportVisualType = chartVariant): ReportModuleDefinition => ({
  id: `${domain.toLocaleLowerCase()}.${id}`,
  domain, section, title, description, kind: 'chart', availableInPhaseOne: true, fields: [field], chartVariant, visualType,
})

const competenceModule = (domain: DatasetDomain, id: string, section: string, title: string, description: string): ReportModuleDefinition => ({
  id: `${domain.toLocaleLowerCase()}.${id}`,
  domain, section, title, description, kind: 'competence', availableInPhaseOne: true, visualType: 'heatmap',
})
const summaryModule = (domain: DatasetDomain, id: string, section: string, title: string, description: string): ReportModuleDefinition => ({
  id: `${domain.toLocaleLowerCase()}.${id}`,
  domain, section, title, description, kind: 'summary', availableInPhaseOne: true,
})

const visualModule = (domain: DatasetDomain, id: string, section: string, title: string, description: string, visualType: 'scatter' | 'timeline' | 'grouped' | 'matrix'): ReportModuleDefinition => ({
  id: `${domain.toLocaleLowerCase()}.${id}`,
  domain, section, title, description, kind: 'chart', availableInPhaseOne: true, visualType,
})

const specialModule = (id: string, section: string, title: string, description: string, kind: 'table' | 'simulation', domain: 'COMPARACION' | 'SIMULACION'): ReportModuleDefinition => ({
  id: `${domain.toLocaleLowerCase()}.${id}`,
  domain, section, title, description, kind, availableInPhaseOne: false,
})

/** Catálogo provisional: cada entrada es un módulo seleccionable, no una pantalla completa. */
export const reportCatalog: ReportModuleDefinition[] = [
  summaryModule('TITULADOS', 'resumen.indicadores', 'Resumen general', 'Indicadores principales de Titulados', 'Tarjetas ejecutivas de inserción laboral, titulación, posgrado y primer empleo'),
  fieldModule('TITULADOS', 'resumen.situacion-laboral', 'Resumen general', 'Situación laboral actual', 'situacion_laboral_actual', undefined, 'donut'),
  fieldModule('TITULADOS', 'resumen.interes-posgrado', 'Resumen general', 'Interés en posgrado', 'interes_posgrado'),
  fieldModule('TITULADOS', 'resumen.area-posgrado', 'Resumen general', 'Área de posgrado de interés', 'area_posgrado_interes'),
  fieldModule('TITULADOS', 'resumen.sector-trabajo', 'Resumen general', 'Sector de trabajo', 'sector_trabajo'),
  fieldModule('TITULADOS', 'resumen.anio-titulacion', 'Resumen general', 'Año de titulación', 'anio_titulacion'),
  fieldModule('TITULADOS', 'resumen.primer-empleo', 'Resumen general', 'Es el primer empleo', 'es_primer_empleo'),
  fieldModule('TITULADOS', 'perfil.sector-actual', 'Perfil y empleabilidad', 'Sector de trabajo actual', 'sector_trabajo_actual'),
  fieldModule('TITULADOS', 'perfil.edad', 'Perfil y empleabilidad', 'Rango de edad', 'edad_rango'),
  fieldModule('TITULADOS', 'perfil.genero', 'Perfil y empleabilidad', 'Género', 'genero'),
  fieldModule('TITULADOS', 'perfil.rubro', 'Perfil y empleabilidad', 'Rubro de trabajo actual', 'rubro_trabajo_actual'),
  fieldModule('TITULADOS', 'perfil.remuneracion', 'Perfil y empleabilidad', 'Remuneración', 'remuneracion_rango'),
  fieldModule('TITULADOS', 'perfil.area-trabajo', 'Perfil y empleabilidad', 'Área de trabajo', 'area_trabajo'),
  fieldModule('TITULADOS', 'perfil.pertinencia', 'Perfil y empleabilidad', 'Pertinencia trabajo-formación', 'pertinencia_trabajo_formacion'),
  visualModule('TITULADOS', 'perfil.cohortes', 'Perfil y empleabilidad', 'Titulados por antigüedad', 'Años de vida profesional por cohorte de titulación', 'scatter'),
  fieldModule('TITULADOS', 'formacion.complementaria', 'Formación continua', 'Formación complementaria', 'tiene_formacion_complementaria', undefined, 'stacked'),
  fieldModule('TITULADOS', 'formacion.nivel-complementaria', 'Formación continua', 'Nivel de formación complementaria', 'formacion_complementaria_nivel'),
  fieldModule('TITULADOS', 'formacion.institucion', 'Formación continua', 'Institución de formación complementaria', 'institucion_formacion_complementaria'),
  fieldModule('TITULADOS', 'formacion.financiamiento-cursado', 'Formación continua', 'Financiamiento de formación cursada', 'financiamiento_posgrado_cursado'),
  fieldModule('TITULADOS', 'posgrado.nivel', 'Posgrado', 'Nivel de posgrado de interés', 'nivel_posgrado_interes', undefined, 'columns'),
  fieldModule('TITULADOS', 'posgrado.area', 'Posgrado', 'Área de posgrado de interés', 'area_posgrado_interes'),
  fieldModule('TITULADOS', 'posgrado.financiamiento', 'Financiamiento', 'Financiamiento estimado del posgrado', 'financiamiento_posgrado_estimado', undefined, 'stacked'),
  fieldModule('TITULADOS', 'posgrado.modalidad', 'Posgrado', 'Modalidad de posgrado', 'modalidad_posgrado'),
  fieldModule('TITULADOS', 'posgrado.institucion', 'Posgrado', 'Institución de posgrado de interés', 'institucion_posgrado_interes'),
  fieldModule('TITULADOS', 'formacion.valoracion', 'Formación continua', 'Valoración de la formación', 'valoracion_formacion_1', undefined, 'diverging'),
  competenceModule('TITULADOS', 'competencias.brechas', 'Brechas de competencias', 'Brechas de competencias', 'Medias y dispersión por competencia'),

  summaryModule('EMPLEADORES', 'resumen.indicadores', 'Resumen y contratación', 'Indicadores principales de Empleadores', 'Tarjetas ejecutivas de respuestas, contratación, probabilidad y competencias'),
  fieldModule('EMPLEADORES', 'resumen.tipo-organizacion', 'Resumen y contratación', 'Tipo de organización', 'tipo_organizacion', undefined, 'donut'),
  fieldModule('EMPLEADORES', 'resumen.tamano-organizacion', 'Resumen y contratación', 'Tamaño de organización', 'tamano_organizacion'),
  fieldModule('EMPLEADORES', 'resumen.contratacion', 'Resumen y contratación', 'Contratación de titulados', 'contrato_titulados_ultimos_5_anios'),
  fieldModule('EMPLEADORES', 'resumen.incorporacion', 'Resumen y contratación', 'Posibilidad de incorporación', 'posibilidad_incorporacion'),
  fieldModule('EMPLEADORES', 'resumen.nivel-demandado', 'Resumen y contratación', 'Nivel de formación demandado', 'nivel_formacion_demandado'),
  fieldModule('EMPLEADORES', 'resumen.medio-convocatoria', 'Resumen y contratación', 'Medio de convocatoria', 'medio_convocatoria'),
  fieldModule('EMPLEADORES', 'resumen.rubro', 'Resumen y contratación', 'Rubro de organización', 'rubro_organizacion'),
  fieldModule('EMPLEADORES', 'resumen.departamento', 'Resumen y contratación', 'Departamento de organización', 'departamento_organizacion'),
  fieldModule('EMPLEADORES', 'resumen.cargos', 'Resumen y contratación', 'Cargos para titulados', 'cargos_titulados'),
  visualModule('EMPLEADORES', 'resumen.respuestas-temporales', 'Resumen y contratación', 'Respuestas en el tiempo', 'Respuestas por día o semana y acumulado', 'timeline'),
  visualModule('EMPLEADORES', 'resumen.balance-valoracion', 'Valoración de la Carrera', 'Balance de valoración', 'Acuerdo, desacuerdo e índice neto por afirmación', 'grouped'),
  visualModule('EMPLEADORES', 'resumen.contratacion-probabilidad', 'Resumen y contratación', 'Contratación y probabilidad', 'Contratación observada según la posibilidad de contratar', 'matrix'),
  visualModule('EMPLEADORES', 'resumen.balance-contratacion', 'Valoración de la Carrera', 'Valoración según contratación', 'Índice neto por grupo de afirmaciones y contratación', 'grouped'),
  fieldModule('EMPLEADORES', 'valoracion.formacion-1', 'Valoración de la Carrera', 'Valoración de formación 1', 'valoracion_formacion_1'),
  fieldModule('EMPLEADORES', 'valoracion.formacion-2', 'Valoración de la Carrera', 'Valoración de formación 2', 'valoracion_formacion_2'),
  fieldModule('EMPLEADORES', 'valoracion.formacion-3', 'Valoración de la Carrera', 'Valoración de formación 3', 'valoracion_formacion_3'),
  fieldModule('EMPLEADORES', 'valoracion.formacion-4', 'Valoración de la Carrera', 'Valoración de formación 4', 'valoracion_formacion_4'),
  fieldModule('EMPLEADORES', 'valoracion.formacion-5', 'Valoración de la Carrera', 'Valoración de formación 5', 'valoracion_formacion_5'),
  fieldModule('EMPLEADORES', 'valoracion.formacion-6', 'Valoración de la Carrera', 'Valoración de formación 6', 'valoracion_formacion_6'),
  fieldModule('EMPLEADORES', 'valoracion.formacion-7', 'Valoración de la Carrera', 'Valoración de formación 7', 'valoracion_formacion_7'),
  fieldModule('EMPLEADORES', 'valoracion.formacion-8', 'Valoración de la Carrera', 'Valoración de formación 8', 'valoracion_formacion_8'),
  fieldModule('EMPLEADORES', 'valoracion.formacion-9', 'Valoración de la Carrera', 'Valoración de formación 9', 'valoracion_formacion_9'),
  fieldModule('EMPLEADORES', 'valoracion.formacion-10', 'Valoración de la Carrera', 'Valoración de formación 10', 'valoracion_formacion_10'),
  fieldModule('EMPLEADORES', 'valoracion.relacion-1', 'Valoración de la Carrera', 'Valoración de relación 1', 'valoracion_relacion_1'),
  fieldModule('EMPLEADORES', 'valoracion.relacion-3', 'Valoración de la Carrera', 'Valoración de relación 3', 'valoracion_relacion_3'),
  competenceModule('EMPLEADORES', 'competencias.brechas', 'Brechas de competencias', 'Brechas de competencias', 'Valoración de competencias'),

  specialModule('competencias', 'Titulados vs Empleadores', 'Titulados vs Empleadores', 'Comparación de medias, medianas y brechas por competencia', 'table', 'COMPARACION'),
  specialModule('escenario', 'Simulación', 'Simulación de escenario', 'Distribución observada frente a un escenario Monte Carlo', 'simulation', 'SIMULACION'),
]

export function modulesByDomain(domain: DatasetDomain | 'COMPARACION' | 'SIMULACION', includePhaseTwo = false) {
  return reportCatalog.filter((module) => module.domain === domain && (includePhaseTwo || module.availableInPhaseOne))
}

export function groupedModules(domain: DatasetDomain | 'COMPARACION' | 'SIMULACION', includePhaseTwo = false) {
  return modulesByDomain(domain, includePhaseTwo).reduce<Record<string, ReportModuleDefinition[]>>((groups, module) => {
    ;(groups[module.section] ??= []).push(module)
    return groups
  }, {})
}
