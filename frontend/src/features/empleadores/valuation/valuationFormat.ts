import { likertColor } from '../dashboard/chartTheme'
import { formatDecimal } from '../dashboard/dashboardFormat'

export function valuationUrl(datasetId: string, query: string) {
  return `/analytics/employers/valuation-insights?datasetId=${encodeURIComponent(datasetId)}${query}`
}

/** p-valor legible: «< 0,001» por debajo de la precisión útil. */
export function formatP(p: number | null) {
  if (p === null) return '—'
  if (p < 0.001) return '< 0,001'
  return formatDecimal(p, 3)
}

/** Color de un puntaje 0–100 sobre la escala divergente del proyecto (0 naranja, 50 gris claro, 100 azul). */
export function scoreColor(score: number | null) {
  return score === null ? '#F8FAFC' : likertColor(1 + score / 25)
}

export const AGREEMENT_SHORT = { disagree: 'Totalmente en desacuerdo', partial: 'Parcialmente de acuerdo', full: 'Totalmente de acuerdo' }
