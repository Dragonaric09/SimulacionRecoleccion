import { apiRequest } from '@/api/client'

export interface ResultadoChiCuadrado {
  estadistico: number
  gradosLibertad: number
  pValor: number
  alfa: number
  rechazaIndependencia: boolean
}

export type CategoryDistribution = { validCount: number; counts: Record<string, number>; percentages: Record<string, number> }
export type AnalyticsSummary = {
  datasetId: string
  surveyType: string
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

export function ejecutarChiCuadrado(frecuencias: number[][], alfa: number) {
  return apiRequest<ResultadoChiCuadrado>('/analitica/chi-cuadrado', {
    method: 'POST',
    body: JSON.stringify({ frecuencias, alfa }),
  })
}
