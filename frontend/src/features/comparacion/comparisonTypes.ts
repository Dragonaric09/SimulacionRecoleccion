/** Respuesta de /analytics/comparison/competencies (titulados frente a empleadores). */

export type ComparisonGroup = {
  n: number
  media: number | null
  mediana: number | null
  desviacion: number | null
  niveles: Record<string, number>
  noObservado: number
}

export type ComparisonTest = {
  codigo: 'MANN_WHITNEY' | 'MANN_WHITNEY_PERMUTACION' | 'NO_APLICABLE'
  nombre: string
  aplicable: boolean
  u: number | null
  z: number | null
  pValor: number | null
  pAjustado: number | null
  significativa: boolean
  rBiserial: number | null
  motivo: string
}

export type ComparisonCompetence = {
  code: string
  name: string
  group: 'HARD_SKILL' | 'SOFT_SKILL'
  titulados: ComparisonGroup
  empleadores: ComparisonGroup
  diferenciaMedias: number | null
  diferenciaMedianas: number | null
  prueba: ComparisonTest
}

export type Comparison = {
  tituladosDatasetId: string
  tituladosDataset: string
  empleadoresDatasetId: string
  empleadoresDataset: string
  alfa: number
  ajusteMultiple: string
  competencias: ComparisonCompetence[]
}

export const TITULADOS_COLOR = '#1F6FB5'
export const EMPLEADORES_COLOR = '#14A39A'
/** Diferencia significativa tras el ajuste de Holm. */
export const SIGNIFICANT_COLOR = '#D97706'
export const NEUTRAL_COLOR = '#94A3B8'

export const decimal = (value: number | null | undefined, digits = 2) =>
  value == null ? '—' : value.toFixed(digits).replace('.', ',')

export const signed = (value: number | null | undefined) =>
  value == null ? '—' : `${value > 0 ? '+' : ''}${decimal(value)}`

export const pValue = (value: number | null | undefined) =>
  value == null ? '—' : value < 0.001 ? '< 0,001' : decimal(value, 3)

export function effectSize(r: number | null) {
  if (r == null) return '—'
  const magnitude = Math.abs(r)
  return magnitude < 0.1 ? 'despreciable' : magnitude < 0.3 ? 'pequeño' : magnitude < 0.5 ? 'mediano' : 'grande'
}

export const groupLabel = (group: ComparisonCompetence['group']) =>
  group === 'HARD_SKILL' ? 'Técnica' : 'Transversal'
