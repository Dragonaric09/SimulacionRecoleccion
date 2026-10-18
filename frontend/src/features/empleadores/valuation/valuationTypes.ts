/** Respuesta de /analytics/employers/valuation-insights y del resultado de las pruebas de asociación. */

export type AssociationResult = {
  codigo: 'NO_APLICABLE' | 'CHI_CUADRADO' | 'FISHER_EXACTA' | 'FISHER_FREEMAN_HALTON' | 'SPEARMAN' | 'MANN_WHITNEY' | 'KRUSKAL_WALLIS'
  nombrePrueba: string
  aplicable: boolean
  nivelFila: string
  nivelColumna: string
  motivo: string
  descartadas: string[]
  n: number
  estadisticoNombre: string | null
  estadistico: number | null
  gradosLibertad: number | null
  pValor: number | null
  metodoP: string | null
  alfa: number
  significativo: boolean
  efectoNombre: string | null
  efecto: number | null
  magnitud: string | null
  celdasEsperadasMenores5: number | null
  totalCeldas: number | null
  esperadaMinima: number | null
}

export type MeasurementLevel = 'NOMINAL' | 'BINARIA' | 'ORDINAL'

/** Variable del catálogo de empleadores (/analytics/employers/catalog). */
export type EmployerVariable = {
  key: string
  label: string
  group: string
  level: MeasurementLevel
  categories: string[]
  chart: string
  description: string
}

export const LEVEL_LABELS: Record<MeasurementLevel, string> = {
  NOMINAL: 'Nominal',
  BINARIA: 'Nominal (2 categorías)',
  ORDINAL: 'Ordinal',
}

/** Etiqueta corta para selectores. */
export const LEVEL_SHORT: Record<MeasurementLevel, string> = { NOMINAL: 'Nominal', BINARIA: 'Dicotómica', ORDINAL: 'Ordinal' }

/** Respuesta de /analytics/employers/cross. */
export type EmployerCross = {
  cross: {
    datasetId: string
    rowField: string
    columnField: string
    validCount: number
    rowCategories: string[]
    columnCategories: string[]
    counts: Record<string, Record<string, number>>
    percentages: Record<string, Record<string, number>>
    smallSample: boolean
  }
  row: EmployerVariable
  column: EmployerVariable
  excluded: number
  chart: string
  test: AssociationResult
}

export type ValuationSummary = {
  totalResponses: number
  respondents: number
  score: number | null
  fullAgreementShare: number | null
  disagreementShare: number | null
  unknownShare: number | null
  uniformResponses: number
  strongestDimension: string | null
  weakestDimension: string | null
}

export type ValuationDimension = {
  key: string
  label: string
  description: string
  itemKeys: string[]
  score: number | null
  fullAgreementShare: number | null
  partialShare: number | null
  disagreementShare: number | null
  unknownShare: number | null
  answered: number
  respondents: number
}

export type ValuationItemStat = {
  position: number
  key: string
  label: string
  dimension: string
  full: number
  partial: number
  disagreement: number
  unknown: number
  missing: number
  score: number | null
  netIndex: number | null
}

export type ValuationSegment = {
  variable: string
  label: string
  level: string
  groups: { category: string; n: number; score: number | null; dimensions: Record<string, number | null> }[]
  test: AssociationResult | null
}

export type EmployerValuation = {
  datasetId: string
  summary: ValuationSummary
  dimensions: ValuationDimension[]
  items: ValuationItemStat[]
  segments: ValuationSegment[]
  knowledge: { categories: string[]; counts: number[][]; excluded: number; test: AssociationResult }
  correlations: { keys: string[]; labels: string[]; rho: (number | null)[][]; pValues: (number | null)[][]; n: number[][] }
}
