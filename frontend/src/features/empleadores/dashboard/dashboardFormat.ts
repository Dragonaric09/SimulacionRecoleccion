const integer = new Intl.NumberFormat('es-BO')

/** Número entero con separador de miles de es-BO. */
export function formatCount(value: number) {
  return integer.format(value)
}

/** Decimales con coma (3,5). */
export function formatDecimal(value: number, digits = 1) {
  return value.toLocaleString('es-BO', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** Porcentaje ya expresado en 0–100 (42,5 %). */
export function formatPercent(value: number | null, digits = 1) {
  return value === null ? '—' : `${formatDecimal(value, digits)} %`
}

/** Variación con signo: porcentaje relativo para conteos, puntos (pp) para porcentajes y pts para promedios. */
export function formatChange(change: number, format: 'percent' | 'points', unit: 'count' | 'percent' | 'score') {
  const sign = change > 0 ? '+' : change < 0 ? '−' : ''
  const magnitude = formatDecimal(Math.abs(change), unit === 'score' ? 2 : 1)
  if (format === 'percent') return `${sign}${magnitude} %`
  return unit === 'score' ? `${sign}${magnitude} pts` : `${sign}${magnitude} pp`
}

export function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Inicio de un intervalo de la serie (día o semana), en dd/mm. */
export function formatBucket(bucket: string) {
  const [year, month, day] = bucket.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit' })
}
