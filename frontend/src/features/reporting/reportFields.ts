import type { CategoryDistribution } from '@/features/analitica/api'

export const reportFieldLabels: Record<string, string> = {
  situacion_laboral_actual: 'Situación laboral actual',
  sector_trabajo: 'Sector de trabajo',
  interes_posgrado: 'Interés en posgrado',
  anio_titulacion: 'Año de titulación',
  es_primer_empleo: 'Es el primer empleo',
  tiene_formacion_complementaria: 'Formación complementaria',
  formacion_complementaria_nivel: 'Nivel de formación complementaria',
  nivel_posgrado_interes: 'Nivel de posgrado de interés',
  area_posgrado_interes: 'Área de posgrado de interés',
  financiamiento_posgrado_estimado: 'Financiamiento estimado del posgrado',
  valoracion_formacion_1: 'Valoración de formación 1',
  valoracion_formacion_2: 'Valoración de formación 2',
  valoracion_formacion_3: 'Valoración de formación 3',
  valoracion_formacion_5: 'Valoración de formación 5',
  valoracion_relacion_1: 'Valoración de relación 1',
  valoracion_relacion_3: 'Valoración de relación 3',
  tipo_organizacion: 'Tipo de organización',
  tamano_organizacion: 'Tamaño de organización',
  contrato_titulados_ultimos_5_anios: 'Contratación de titulados en los últimos 5 años',
}

const booleanFields = new Set([
  'interes_posgrado',
  'tiene_formacion_complementaria',
  'es_primer_empleo',
  'contrato_titulados_ultimos_5_anios',
  'presencia_sedes',
  'posibilidad_incorporacion',
])

const closedOptions: Record<string, string[]> = {
  interes_posgrado: ['Sí', 'No'],
  tiene_formacion_complementaria: ['Sí', 'No'],
  es_primer_empleo: ['Sí', 'No'],
  contrato_titulados_ultimos_5_anios: ['Sí', 'No'],
  area_posgrado_interes: ['Inteligencia artificial', 'Ciberseguridad', 'Ciencia de datos', 'Cloud computing y DevOps', 'Ingeniería de software', 'Robótica', 'Base de datos'],
  nivel_posgrado_interes: ['Diplomado', 'Especialidad', 'Maestría', 'Doctorado'],
}

export function reportFieldLabel(field: string) {
  return reportFieldLabels[field] ?? field.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function reportValueLabel(field: string, value: string) {
  if (!booleanFields.has(field)) return value
  if (value.toLowerCase() === 'true' || value.toLowerCase() === 'si' || value.toLowerCase() === 'sí') return 'Sí'
  if (value.toLowerCase() === 'false' || value.toLowerCase() === 'no') return 'No'
  return value
}

export function reportDistribution(field: string, distribution: CategoryDistribution): CategoryDistribution {
  const options = closedOptions[field] ?? []
  if (options.length === 0) return distribution
  const counts: Record<string, number> = {}
  const percentages: Record<string, number> = {}
  options.forEach((option) => { counts[option] = 0; percentages[option] = 0 })
  Object.entries(distribution.counts).forEach(([label, count]) => {
    const displayLabel = reportValueLabel(field, label)
    counts[displayLabel] = count
    percentages[displayLabel] = distribution.percentages[label] ?? 0
  })
  return { ...distribution, counts, percentages }
}
