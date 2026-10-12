import { formatPercentValue } from '@/features/analitica/shared/analyticsFormatters'

export type BarItem = { label: string; count: number; percent: number }

/**
 * Barras horizontales de una variable de opción única o de casillas.
 * El largo de cada barra es el % de las personas que respondieron (en casillas la suma supera el 100 %).
 */
export function HorizontalBars({ items, total, color = 'bg-empleadores', emptyText = 'Sin respuestas en esta variable.' }: {
  items: BarItem[]
  total: number
  color?: string
  emptyText?: string
}) {
  if (items.length === 0) return <p className="text-sm text-ink-600">{emptyText}</p>
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0 break-words text-ink-900">{item.label}</span>
            <span className="shrink-0 tabular-nums text-ink-600">
              {item.count} de {total} ({formatPercentValue(item.percent)})
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="presentation">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(item.percent, 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
