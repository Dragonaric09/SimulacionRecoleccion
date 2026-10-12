import type { LucideIcon } from 'lucide-react'
import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from 'cn'

export type MetricChange = {
  value: number
  format: 'percent' | 'points'
  /** Unidad del indicador: conteo, porcentaje o promedio (para mostrar pts en vez de pp). */
  unit: 'count' | 'percent' | 'score'
}

/**
 * Tarjeta de métrica: icono, valor, variación frente al periodo anterior y la base de la comparación.
 * Verde = la variación es positiva, rojo = negativa. Sin base suficiente se indica en vez de inventar un %.
 */
export function MetricCard({ label, value, icon: Icon, change, comparison, note, detail }: {
  label: string
  value: string
  icon: LucideIcon
  change: MetricChange | null
  comparison: string
  note: string
  detail?: string
}) {
  const direction = change === null || change.value === 0 ? 'flat' : change.value > 0 ? 'up' : 'down'
  const Trend = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus
  const trendStyle = direction === 'up'
    ? { color: '#2E9E5B', background: '#E8F6EE' }
    : direction === 'down'
      ? { color: '#D64545', background: '#FDECEC' }
      : { color: '#475569', background: '#F1F5F9' }

  return (
    <Card className="metric-card h-full gap-0 border border-border-line py-0 shadow-sm">
      <CardContent className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="caption-bold min-w-0 text-ink-600">{label}</p>
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg" style={{ background: '#E1F4F2' }}>
            <Icon className="size-[18px] text-empleadores" aria-hidden="true" />
          </span>
        </div>
        <p className="display-kpi tabular-nums text-ink-900">{value}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1">
          {change === null ? (
            <span className="caption-meta text-ink-600">Sin base de comparación</span>
          ) : (
            <span
              className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums')}
              style={trendStyle}
            >
              <Trend className="size-3.5" aria-hidden="true" />
              {formatTrend(change)}
            </span>
          )}
          <span className="caption-meta text-ink-600">{comparison}</span>
        </div>
        <p className="caption-meta text-ink-500">
          {note}
          {detail ? ` · ${detail}` : ''}
        </p>
      </CardContent>
    </Card>
  )
}

function formatTrend(change: MetricChange) {
  const sign = change.value > 0 ? '+' : change.value < 0 ? '−' : ''
  const magnitude = Math.abs(change.value).toLocaleString('es-BO', {
    minimumFractionDigits: change.unit === 'score' ? 2 : 1,
    maximumFractionDigits: change.unit === 'score' ? 2 : 1,
  })
  if (change.format === 'percent') return `${sign}${magnitude} %`
  return change.unit === 'score' ? `${sign}${magnitude} pts` : `${sign}${magnitude} pp`
}
