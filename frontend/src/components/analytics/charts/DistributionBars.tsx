import { Inbox } from 'lucide-react'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { formatPercentValue } from '@/features/analitica/shared/analyticsFormatters'
import type { DistributionChartItem } from './chartTypes'

export function DistributionBars({
  items,
  color = '#1F6FB5',
}: {
  items: DistributionChartItem[]
  color?: string
}) {
  if (items.length === 0) {
    return (
      <Empty className="py-8">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Inbox />
          </EmptyMedia>
          <EmptyTitle>Sin respuestas disponibles</EmptyTitle>
          <EmptyDescription>
            No hay datos suficientes para mostrar esta distribución.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex justify-between gap-3 text-sm">
            <span className="min-w-0 break-words">{item.label}</span>
            <span className="tabular-nums whitespace-nowrap">
              {item.total === undefined ? item.count : `${item.count} de ${item.total}`} (
              {formatPercentValue(item.percent)})
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full"
              style={{ width: `${item.percent}%`, backgroundColor: color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
