import { apiRequest } from '@/api/client'

export interface ResultadoChiCuadrado {
  estadistico: number
  gradosLibertad: number
  pValor: number
  alfa: number
  rechazaIndependencia: boolean
}

export function ejecutarChiCuadrado(frecuencias: number[][], alfa: number) {
  return apiRequest<ResultadoChiCuadrado>('/analitica/chi-cuadrado', {
    method: 'POST',
    body: JSON.stringify({ frecuencias, alfa }),
  })
}
