import type { ReactNode } from 'react'
import { Empty, EmptyTitle } from '@/components/ui/empty'
import {
  CategoricalQuestionChart,
  ChartVariantSelector,
  useChartVariant,
} from '@/components/analytics/charts'
import type { CategoryDistribution } from '../api'
import { sentenceCaseLabel } from '../shared/analyticsFormatters'
import { downloadDistributionCsv } from '../shared/analyticsExport'
import { ChartCardActions } from '@/components/analytics/ChartCard'

type EmploymentDistributionVariant = 'bars' | 'donut' | 'table'

function distributionItems(distribution?: CategoryDistribution, order?: string[]) {
  const counts = distribution?.counts ?? {}
  const entries = order
    ? order.map((label) => {
        const source = Object.keys(counts).find(
          (candidate) => normalizeLabel(candidate) === normalizeLabel(label),
        )
        return [source ?? label, source ? counts[source] : 0] as [string, number]
      })
    : Object.entries(counts).sort(([, a], [, b]) => b - a)
  return entries.map(([label, count]) => ({
    label: sentenceCaseLabel(label),
    count,
    total: distribution?.validCount,
    percent: distribution?.percentages[label] ?? 0,
  }))
}

export function EmploymentDistributionVariant({
  distribution,
  title,
  order,
  accent = '#1f6fb5',
  defaultVariant = 'bars',
  variants = ['bars', 'donut', 'table'],
  storageKey,
  help,
  exportTitle,
}: {
  distribution?: CategoryDistribution
  title?: ReactNode
  order?: string[]
  accent?: string
  defaultVariant?: EmploymentDistributionVariant
  variants?: EmploymentDistributionVariant[]
  storageKey?: string
  help?: string
  exportTitle?: string
}) {
  const [variant, setVariant] = useChartVariant(storageKey, defaultVariant, variants)
  const items = distributionItems(distribution, order)
  return (
    <div className="min-w-0 space-y-3">
      {(title || variants.length > 1) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title && <h3 className="text-sm font-semibold text-ink-900">{title}</h3>}
          <div className="flex shrink-0 items-center gap-1">
            <ChartVariantSelector
              value={variant}
              options={variants}
              labels={{ bars: 'Barras', donut: 'Donut', table: 'Tabla' }}
              onChange={setVariant}
            />
            <ChartCardActions
              title={exportTitle ?? (typeof title === 'string' ? title : 'Distribución')}
              help={help ?? 'Las barras horizontales facilitan comparar categorías; la tabla conserva los valores exactos.'}
              onExportCsv={() =>
                downloadDistributionCsv(
                  exportTitle ?? (typeof title === 'string' ? title : 'distribucion'),
                  items,
                  distribution?.validCount ?? 0,
                )
              }
            />
          </div>
        </div>
      )}
      {variant === 'bars' ? (
        <DistributionBarsVariantItems items={items} accent={accent} />
      ) : (
        <CategoricalQuestionChart
          items={items}
          total={distribution?.validCount ?? 0}
          color={accent}
          variants={[variant]}
          variant={variant}
          showSelector={false}
        />
      )}
    </div>
  )
}

function DistributionBarsVariantItems({
  items,
  accent,
}: {
  items: ReturnType<typeof distributionItems>
  accent: string
}) {
  if (!items.length)
    return (
      <Empty className="py-6">
        <EmptyTitle>Sin respuestas disponibles</EmptyTitle>
      </Empty>
    )
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex justify-between gap-3 text-sm">
            <span className="min-w-0 break-words">{item.label}</span>
            <span className="whitespace-nowrap tabular-nums font-semibold">
              {item.count} de {item.total ?? 0} ({formatPercent(item.percent)})
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full"
              style={{ width: `${item.percent}%`, backgroundColor: accent }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MiniDistribution({
  title,
  distribution,
  accent = 'blue',
  note,
  order,
  storageKey,
  variants = ['bars', 'table'],
  help,
}: {
  title: string
  distribution?: CategoryDistribution
  accent?: 'blue' | 'teal' | 'purple' | 'amber'
  note?: string
  order?: string[]
  storageKey?: string
  variants?: EmploymentDistributionVariant[]
  help?: string
}) {
  const accentColor = { blue: '#1f6fb5', teal: '#14a39a', purple: '#8e5bd0', amber: '#f2a33a' }[
    accent
  ]
  return (
    <div className="min-w-0">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        {note && <span className="text-xs text-ink-600">{note}</span>}
      </div>
      <EmploymentDistributionVariant
        distribution={distribution}
        order={order}
        accent={accentColor}
        variants={variants}
        storageKey={storageKey}
        help={help}
        exportTitle={title}
      />
    </div>
  )
}

function normalizeLabel(value: string) {
  return value
    .toLocaleLowerCase('es-BO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function StackedRelevanceCard({
  distribution,
  storageKey,
}: {
  distribution?: CategoryDistribution
  storageKey?: string
}) {
  const scale = ['Totalmente en desacuerdo', 'En desacuerdo', 'De acuerdo', 'Totalmente de acuerdo']
  const counts = distribution?.counts ?? {}
  const entries = scale.map((label) => {
    const source = Object.keys(counts).find(
      (candidate) => normalizeLabel(candidate) === normalizeLabel(label),
    )
    return [source ?? label, source ? counts[source] : 0] as [string, number]
  })
  const total = distribution?.validCount ?? 0
  const colors = ['#ed552f', '#f3a487', '#7db1dd', '#1f6fb5']
  const [variant, setVariant] = useChartVariant(storageKey, 'stacked', [
    'stacked',
    'table',
  ] as const)
  const items = entries.map(([label, count]) => ({
    label: sentenceCaseLabel(label),
    count,
    total,
    percent: distribution?.percentages[label] ?? 0,
  }))
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink-900">
          Pertinencia de formación para el cargo
        </h3>
        <div className="flex items-center gap-2">
          <ChartVariantSelector
            value={variant}
            options={['stacked', 'table'] as const}
            labels={{ stacked: 'Apiladas', table: 'Tabla' }}
            onChange={setVariant}
          />
          <ChartCardActions
            title="Pertinencia de formación para el cargo"
            help="Escala ordinal de acuerdo. La barra apilada resume la composición y la tabla muestra las frecuencias exactas por nivel."
            onExportCsv={() => downloadDistributionCsv('pertinencia-formacion-cargo', items, total)}
          />
        </div>
      </div>
      {variant === 'table' ? (
        <CategoricalQuestionChart
          items={items}
          total={total}
          variants={['table']}
          variant="table"
          showSelector={false}
        />
      ) : entries.length ? (
        <>
          <div className="flex h-5 overflow-hidden rounded-md bg-surface-container-high">
            {entries.map(([label, count], index) => {
              const percentage = total ? (count / total) * 100 : 0
              return (
                <div
                  key={label}
                  className="h-full"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: colors[index % colors.length],
                  }}
                  title={`${label}: ${count} (${formatPercent(percentage)})`}
                />
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-600">
            {entries.map(([label], index) => (
              <span key={label} className="flex items-center gap-1">
                <i
                  className="size-2 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                {sentenceCaseLabel(label)} ({formatPercent(distribution?.percentages[label] ?? 0)})
              </span>
            ))}
          </div>
        </>
      ) : (
        <Empty className="py-6">
          <EmptyTitle>Sin respuestas disponibles</EmptyTitle>
        </Empty>
      )}
    </div>
  )
}

function formatPercent(value: number) {
  return `${value.toFixed(1).replace('.', ',')} %`
}
