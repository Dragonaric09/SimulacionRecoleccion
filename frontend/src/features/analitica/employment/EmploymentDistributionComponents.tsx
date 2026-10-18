import type { CategoryDistribution } from '../api'
import { formatDecimal } from '../shared/analyticsFormatters'
import { normalizeAnalyticsLabel } from '../shared/analyticsLabels'
import { DistributionBars as SharedDistributionBars } from '@/components/analytics/charts'

export function MetricPanel({
  title,
  average,
  median,
  deviation,
}: {
  title: string
  average?: number
  median?: number
  deviation: number | null | undefined
}) {
  return (
    <div className="rounded-lg border border-border-line bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-titulados">{title}</span>
        <span className="text-xs text-ink-600">
          DE: ± {deviation == null ? '—' : `${formatDecimal(deviation, 1)} años`}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-600">
        Media:{' '}
        <strong className="text-base tabular-nums text-ink-900">
          {average == null ? '—' : formatDecimal(average, 1)}
        </strong>{' '}
        años{' '}
        <span>
          Mediana:{' '}
          <strong className="text-base tabular-nums text-ink-900">
            {median == null ? '—' : formatDecimal(median, 1)}
          </strong>{' '}
          años
        </span>
      </div>
    </div>
  )
}

export function DistributionBars({
  distribution,
  order,
}: {
  distribution?: CategoryDistribution
  order?: string[]
}) {
  const counts = distribution?.counts ?? {}
  const orderedEntries = order
    ? order.map((label) => {
        const source = Object.keys(counts).find(
          (candidate) => normalizeAnalyticsLabel(candidate) === normalizeAnalyticsLabel(label),
        )
        return [source ?? label, source ? counts[source] : 0] as [string, number]
      })
    : Object.entries(counts)
  const assigned = orderedEntries.reduce((sum, [, count]) => sum + count, 0)
  const unclassified = Math.max(0, (distribution?.validCount ?? assigned) - assigned)
  const entries = unclassified
    ? [...orderedEntries, ['Sin clasificar', unclassified] as [string, number]]
    : orderedEntries
  return (
    <SharedDistributionBars
      items={entries.map(([label, count]) => ({
        label,
        count,
        total: distribution?.validCount,
        percent: distribution?.percentages[label] ?? 0,
      }))}
    />
  )
}
