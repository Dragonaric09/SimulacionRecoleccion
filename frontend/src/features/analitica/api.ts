import { apiRequest } from '@/api/client'
import type { Cross } from './shared/analyticsTypes'

export interface ResultadoChiCuadrado {
  estadistico: number
  gradosLibertad: number
  pValor: number
  alfa: number
  rechazaIndependencia: boolean
}

export type CategoryDistribution = { validCount: number; counts: Record<string, number>; percentages: Record<string, number> }
export type AnalyticsSummaryData = {
  totalResponses: number
  validResponses: number
  distributions: Record<string, CategoryDistribution>
  numericAverages: Record<string, number>
  numericMedians: Record<string, number>
  numericStandardDeviations: Record<string, number | null>
  smallSample: boolean
  yearMin?: number
  yearMax?: number
}
export type ReportSummary = AnalyticsSummaryData & { availableFields: string[] }
export type ReportCompetence = {
  code: string
  name: string
  group: string
  validCount: number
  average: number | null
  standardDeviation: number | null
  median: number | null
  levelCounts: Record<string, number>
  notObservedCount: number
}
export type ReportComparisonGroup = {
  n: number
  media: number | null
  mediana: number | null
  desviacion: number | null
  niveles: Record<string, number>
  noObservado: number
}
export type ReportComparison = {
  code: string
  name: string
  group: string
  titulados: ReportComparisonGroup
  empleadores: ReportComparisonGroup
  diferenciaMedias: number | null
  diferenciaMedianas: number | null
  prueba: {
    codigo: string
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
}
export type AnalyticsSummary = AnalyticsSummaryData & { datasetId: string; surveyType: string }

export function ejecutarChiCuadrado(frecuencias: number[][], alfa: number) {
  return apiRequest<ResultadoChiCuadrado>('/analitica/chi-cuadrado', {
    method: 'POST',
    body: JSON.stringify({ frecuencias, alfa }),
  })
}

/** Prueba de asociación elegida por el backend según el tamaño de muestra y las frecuencias esperadas. */
export interface ResultadoPruebaAsociacion {
  codigo: 'CHI_CUADRADO' | 'FISHER_EXACTA' | 'FISHER_FREEMAN_HALTON' | 'NO_APLICABLE'
  nombrePrueba: string
  aplicable: boolean
  estadistico: number | null
  gradosLibertad: number | null
  pValor: number | null
  alfa: number
  rechazaHipotesis: boolean
  motivo: string
  n: number
  celdasEsperadasMenores5: number
  totalCeldas: number
  esperadaMinima: number | null
  vCramer: number | null
  simulaciones: number | null
}

/** Variables de casillas: una persona puede caer en varias categorías, así que no admiten χ² ni Fisher. */
export const MULTI_RESPONSE_FIELDS = ['area_trabajo', 'cargos_titulados']

/** Frecuencias observadas en el orden de filas y columnas del cruce, para enviarlas a la prueba. */
export function crossFrequencies(cross: Cross) {
  return cross.rowCategories.map((row) =>
    cross.columnCategories.map((column) => cross.counts[row]?.[column] ?? 0),
  )
}

export function ejecutarPruebaAsociacion(frecuencias: number[][], alfa: number, respuestaMultiple = false) {
  return apiRequest<ResultadoPruebaAsociacion>('/analitica/prueba-seleccion', {
    method: 'POST',
    body: JSON.stringify({ frecuencias, alfa, respuestaMultiple }),
  })
}
