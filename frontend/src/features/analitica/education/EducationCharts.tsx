import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartCardActions, VisualizationDataTooltip } from '@/components/analytics/ChartCard'
import { Empty, EmptyTitle } from '@/components/ui/empty'
import type { CategoryDistribution } from '../api'
import { sentenceCaseLabel } from '../shared/analyticsFormatters'
import {
  CategoricalQuestionChart,
  ChartVariantSelector,
  useChartVariant,
} from '@/components/analytics/charts'
import { downloadDistributionCsv } from '../shared/analyticsExport'

export function SummaryCardShell({
  title,
  description,
  actions,
  help,
  onExportCsv,
  children,
}: {
  title: string
  description: string
  actions?: ReactNode
  help?: string
  onExportCsv?: () => void
  children: ReactNode
}) {
  return (
    <Card className="print-card h-full rounded-xl border border-border-line shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="title-card">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {actions}
            <ChartCardActions title={title} help={help} onExportCsv={onExportCsv} />
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function variantAction<T extends string>(
  value: T,
  options: readonly T[],
  labels: Record<T, string>,
  onChange: (value: T) => void,
) {
  return (
    <ChartVariantSelector value={value} options={options} labels={labels} onChange={onChange} />
  )
}

function SimpleDistributionTable({
  entries,
  total,
  showPercent = true,
}: {
  entries: [string, number][]
  total: number
  showPercent?: boolean
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-line text-xs text-ink-600">
            <th className="p-2 text-left">Categoría</th>
            <th className="p-2 text-right">Conteo</th>
            {showPercent && <th className="p-2 text-right">Porcentaje</th>}
          </tr>
        </thead>
        <tbody>
          {entries.map(([label, count]) => (
            <tr key={label} className="border-b border-surface-container-high">
              <td className="p-2 text-ink-900">{sentenceCaseLabel(label)}</td>
              <td className="p-2 text-right tabular-nums">
                {count} de {total}
              </td>
              {showPercent && (
                <td className="p-2 text-right tabular-nums">
                  {formatPercentValue(total ? (count * 100) / total : 0)} %
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function FormationActiveCard({
  yes,
  total,
  title = 'Formación complementaria activa',
}: {
  yes: number
  total: number
  title?: string
}) {
  const no = Math.max(total - yes, 0)
  const variants = ['stacked', 'donut', 'table'] as const
  const [variant, setVariant] = useChartVariant(
    `simulacionem.chartVariant.titulados.education.${title}`,
    'stacked',
    variants,
  )
  const labels = { stacked: 'Apilada', donut: 'Donut', table: 'Tabla' } as const
  const entries: [string, number][] = [
    ['Sí', yes],
    ['No', no],
  ]
  return (
    <SummaryCardShell
      title={title}
      description={`${formatPercentage(yes, total)} de la muestra total · n = ${total}`}
      actions={variantAction(variant, variants, labels, setVariant)}
      help="La barra azul representa la proporción que respondió Sí y la gris, No; sus anchos suman el 100 % de n."
      onExportCsv={() =>
        downloadDistributionCsv(
          title,
          entries.map(([label, count]) => ({ label, count })),
          total,
        )
      }
    >
      <div className="space-y-3">
        {variant === 'donut' ? (
          <CategoricalQuestionChart
            items={entries.map(([label, count]) => ({
              label,
              count,
              total,
              percent: total ? (count * 100) / total : 0,
            }))}
            total={total}
            color="#1F6FB5"
            categoryColors={['#1F6FB5', '#CBD5E1']}
            variant="donut"
            showSelector={false}
          />
        ) : variant === 'table' ? (
          <SimpleDistributionTable entries={entries} total={total} />
        ) : (
          <>
            <p className="display-kpi tabular-nums text-ink-900">
              {yes} de {total}
            </p>
            <div
              className="flex h-2.5 overflow-hidden rounded-full bg-surface-container-high"
              aria-label={`${yes} respuestas Sí y ${no} respuestas No`}
            >
              {yes > 0 && (
                <VisualizationDataTooltip
                  datum={{ kind: 'stacked', label: 'Sí', count: yes, total }}
                >
                  <div
                    className="bg-titulados"
                    style={{ width: `${total ? (yes * 100) / total : 0}%` }}
                  />
                </VisualizationDataTooltip>
              )}
              {no > 0 && (
                <VisualizationDataTooltip
                  datum={{ kind: 'stacked', label: 'No', count: no, total }}
                >
                  <div
                    className="bg-slate-300"
                    style={{ width: `${total ? (no * 100) / total : 0}%` }}
                  />
                </VisualizationDataTooltip>
              )}
            </div>
            <div className="flex justify-between text-xs text-ink-600">
              <span>Sí: {yes}</span>
              <span>No: {no}</span>
            </div>
          </>
        )}
        <p className="border-t border-surface-container-high pt-2 text-xs text-ink-600">
          Base total evaluada: n = {total}
        </p>
      </div>
    </SummaryCardShell>
  )
}

function orderedDistributionEntries(
  distribution: CategoryDistribution | undefined,
  levels?: string[],
) {
  const counts = distribution?.counts ?? {}
  if (!levels) return Object.entries(counts).sort(([, left], [, right]) => right - left)
  const ordered: [string, number][] = levels.map((level) => {
    const key = Object.keys(counts).find(
      (candidate) => normalizeEducationLabel(candidate) === normalizeEducationLabel(level),
    )
    return [key ?? level, key ? counts[key] : 0] as [string, number]
  })
  const recognized = new Set(ordered.map(([label]) => normalizeEducationLabel(label)))
  const unclassified = Object.entries(counts)
    .filter(([label]) => !recognized.has(normalizeEducationLabel(label)))
    .reduce((sum, [, count]) => sum + count, 0)
  return unclassified ? [...ordered, ['Sin clasificar', unclassified] as [string, number]] : ordered
}

function normalizeEducationLabel(value: string) {
  return value
    .toLocaleLowerCase('es-BO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function OrdinalColumnsCard({
  title,
  description,
  distribution,
  levels,
}: {
  title: string
  description: string
  distribution?: CategoryDistribution
  levels: string[]
}) {
  const entries = orderedDistributionEntries(distribution, levels)
  const max = Math.max(1, ...entries.map(([, count]) => count))
  const variants = ['columns', 'ranked', 'table'] as const
  const [variant, setVariant] = useChartVariant(
    `simulacionem.chartVariant.titulados.education.${title}`,
    'columns',
    variants,
  )
  const labels = { columns: 'Columnas', ranked: 'Barras', table: 'Tabla' } as const
  const items = entries.map(([label, count]) => ({
    label,
    count,
    total: distribution?.validCount ?? 0,
    percent: distribution?.percentages[label] ?? 0,
  }))
  return (
    <SummaryCardShell
      title={title}
      description={description}
      actions={variantAction(variant, variants, labels, setVariant)}
      help="Cada columna representa un nivel en el orden mostrado; su altura es el conteo de respuestas en ese nivel."
      onExportCsv={() => downloadDistributionCsv(title, items, distribution?.validCount ?? 0)}
    >
      {variant === 'ranked' ? (
        <CategoricalQuestionChart
          items={items}
          total={distribution?.validCount ?? 0}
          color="#1F6FB5"
          variant="ranked"
          showSelector={false}
        />
      ) : variant === 'table' ? (
        <SimpleDistributionTable entries={entries} total={distribution?.validCount ?? 0} />
      ) : (
        <div className="flex min-h-36 items-end justify-between gap-2 border-b border-border-line px-1 pb-1">
          {entries.map(([label, count]) => (
            <VisualizationDataTooltip
              key={label}
              datum={{
                kind: 'column',
                label,
                count,
                total: distribution?.validCount ?? 0,
                percent: distribution?.percentages[label],
              }}
            >
              <div className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                <span className="text-xs font-semibold tabular-nums text-ink-800">{count}</span>
                <div
                  className="w-full max-w-12 rounded-t bg-titulados"
                  style={{ height: `${Math.max(count ? 10 : 2, (count * 78) / max)}px` }}
                />
                <span className="w-full text-center text-[10px] leading-tight text-ink-600">
                  {label}
                </span>
              </div>
            </VisualizationDataTooltip>
          ))}
        </div>
      )}
      {variant === 'columns' && (
        <p className="mt-2 text-xs text-ink-600">
          Se muestran todos los niveles, incluidos los que tienen 0 respuestas.
        </p>
      )}
    </SummaryCardShell>
  )
}

export function NominalListCard({
  title,
  description,
  distribution,
  forceBars = false,
}: {
  title: string
  description: string
  distribution?: CategoryDistribution
  forceBars?: boolean
}) {
  const entries = orderedDistributionEntries(distribution)
  const equal = entries.length > 1 && entries.every(([, count]) => count === entries[0][1])
  const showBars = forceBars || !equal
  const variants = ['list', 'bars', 'table'] as const
  const [variant, setVariant] = useChartVariant(
    `simulacionem.chartVariant.titulados.education.${title}`,
    showBars ? 'bars' : 'list',
    variants,
  )
  const labels = { list: 'Lista', bars: 'Barras', table: 'Tabla' } as const
  const items = entries.map(([label, count]) => ({
    label: sentenceCaseLabel(label),
    count,
    total: distribution?.validCount ?? 0,
    percent: distribution?.percentages[label] ?? 0,
  }))
  return (
    <SummaryCardShell
      title={title}
      description={`${description} · n = ${distribution?.validCount ?? 0}`}
      actions={variantAction(variant, variants, labels, setVariant)}
      help={
        showBars
          ? 'Cada barra corresponde a una categoría y su longitud representa el porcentaje sobre n; el conteo aparece junto a la etiqueta.'
          : 'Cada fila presenta una categoría con su conteo exacto sobre las respuestas válidas (n).'
      }
      onExportCsv={() => downloadDistributionCsv(title, items, distribution?.validCount ?? 0)}
    >
      {variant === 'bars' ? (
        <CategoricalQuestionChart
          items={items}
          total={distribution?.validCount ?? 0}
          color="#1F6FB5"
          variant="ranked"
          showSelector={false}
        />
      ) : variant === 'table' ? (
        <SimpleDistributionTable entries={entries} total={distribution?.validCount ?? 0} />
      ) : entries.length ? (
        <div className="space-y-2">
          {entries.map(([label, count]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3 border-b border-border-line py-1.5 text-xs last:border-0"
            >
              <span className="min-w-0 break-words">{sentenceCaseLabel(label)}</span>
              <span className="rounded-full bg-surface-container-low px-2 py-0.5 font-semibold tabular-nums">
                {count} de {distribution?.validCount ?? 0}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <Empty className="py-4">
          <EmptyTitle>Sin respuestas disponibles</EmptyTitle>
        </Empty>
      )}
    </SummaryCardShell>
  )
}

export function StackedFundingCard({
  title,
  description,
  distribution,
}: {
  title: string
  description: string
  distribution?: CategoryDistribution
}) {
  const entries = orderedDistributionEntries(distribution)
  const total = distribution?.validCount ?? 0
  const scholarship = entries
    .filter(([label]) => label.toLocaleLowerCase('es-BO').includes('beca'))
    .reduce((sum, [, count]) => sum + count, 0)
  const colors = ['#1f6fb5', '#7c5ac7', '#d8891e', '#0f766e']
  const variants = ['stacked', 'bars', 'table'] as const
  const [variant, setVariant] = useChartVariant(
    `simulacionem.chartVariant.titulados.education.${title}`,
    'stacked',
    variants,
  )
  const labels = { stacked: 'Apilada', bars: 'Barras', table: 'Tabla' } as const
  const items = entries.map(([label, count]) => ({
    label,
    count,
    total,
    percent: distribution?.percentages[label] ?? 0,
  }))
  return (
    <SummaryCardShell
      title={title}
      description={`${description} · n = ${total}`}
      actions={variantAction(variant, variants, labels, setVariant)}
      help="Cada segmento de color representa una fuente de financiamiento; su ancho es su porcentaje sobre n y todos los segmentos suman el 100 %."
      onExportCsv={() => downloadDistributionCsv(title, items, total)}
    >
      {variant === 'bars' ? (
        <CategoricalQuestionChart
          items={items}
          total={total}
          color="#1F6FB5"
          categoryColors={colors}
          variant="ranked"
          showSelector={false}
        />
      ) : variant === 'table' ? (
        <SimpleDistributionTable entries={entries} total={total} />
      ) : entries.length ? (
        <>
          <div className="flex h-8 overflow-hidden rounded-md bg-surface-container-high">
            {entries.map(([label, count], index) => (
              <VisualizationDataTooltip
                key={label}
                datum={{
                  kind: 'stacked',
                  label,
                  count,
                  total,
                  percent: distribution?.percentages[label],
                }}
              >
                <div
                  className="flex min-w-0 items-center justify-center text-[11px] font-semibold text-white"
                  style={{
                    width: `${total ? (count * 100) / total : 0}%`,
                    backgroundColor: colors[index % colors.length],
                  }}
                >
                  {(count * 100) / Math.max(total, 1) >= 12 ? count : ''}
                </div>
              </VisualizationDataTooltip>
            ))}
          </div>
          <div className="mt-3 space-y-1.5 text-xs text-ink-700">
            {entries.map(([label, count], index) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <i
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  {label}
                </span>
                <span className="shrink-0 tabular-nums">
                  {count} ({formatPercentValue(distribution?.percentages[label] ?? 0)} %)
                </span>
              </div>
            ))}
          </div>
          {scholarship > 0 && (
            <p className="mt-3 border-t border-surface-container-high pt-2 text-xs font-medium text-ink-700">
              Con beca: {scholarship} de {total}
            </p>
          )}
        </>
      ) : (
        <Empty className="py-4">
          <EmptyTitle>Sin respuestas disponibles</EmptyTitle>
        </Empty>
      )}
    </SummaryCardShell>
  )
}

export function DivergingAgreementCard({
  distribution,
  variant = 'diverging',
}: {
  distribution?: CategoryDistribution
  variant?: 'diverging' | 'table'
}) {
  const entries = orderedScaleEntries(distribution)
  const total = distribution?.validCount ?? 0
  const negative = entries.slice(0, 2)
  const positive = entries.slice(2)
  const negativeTotal = negative.reduce((sum, [, count]) => sum + count, 0)
  const positiveTotal = positive.reduce((sum, [, count]) => sum + count, 0)
  const colors = ['#c83b2b', '#ed8d78', '#72a9d3', '#1f6fb5']
  if (variant === 'table') return <SimpleDistributionTable entries={entries} total={total} />
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 text-xs text-ink-600">
        <span>
          Desacuerdo: {negativeTotal} ({formatPercentage(negativeTotal, total)})
        </span>
        <span className="text-right">
          De acuerdo: {positiveTotal} ({formatPercentage(positiveTotal, total)})
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1" aria-label="Escala divergente de acuerdo">
        <div className="flex h-9 overflow-hidden rounded-l-md bg-surface-container-high">
          {negative.map(([label, count]) => (
            <VisualizationDataTooltip key={label} datum={{ kind: 'stacked', label, count, total }}>
              <div
                className="flex items-center justify-center text-[11px] font-semibold text-white"
                style={{
                  width: `${negativeTotal ? (count * 100) / negativeTotal : 0}%`,
                  backgroundColor:
                    colors[entries.findIndex(([entryLabel]) => entryLabel === label)],
                }}
              >
                {count || ''}
              </div>
            </VisualizationDataTooltip>
          ))}
        </div>
        <div className="flex h-9 overflow-hidden rounded-r-md bg-surface-container-high">
          {positive.map(([label, count]) => (
            <VisualizationDataTooltip key={label} datum={{ kind: 'stacked', label, count, total }}>
              <div
                className="flex items-center justify-center text-[11px] font-semibold text-white"
                style={{
                  width: `${positiveTotal ? (count * 100) / positiveTotal : 0}%`,
                  backgroundColor:
                    colors[entries.findIndex(([entryLabel]) => entryLabel === label)],
                }}
              >
                {count || ''}
              </div>
            </VisualizationDataTooltip>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-xs text-ink-600">
        <div className="space-y-1">
          {negative.map(([label, count]) => (
            <div key={label} className="flex justify-between gap-2">
              <span>{label}</span>
              <span className="tabular-nums">{count}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1">
          {positive.map(([label, count]) => (
            <div key={label} className="flex justify-between gap-2">
              <span>{label}</span>
              <span className="tabular-nums">{count}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="border-t border-surface-container-high pt-2 text-xs text-ink-600">
        Escala de acuerdo de 4 niveles · n = {total}
      </p>
    </div>
  )
}

function orderedScaleEntries(distribution?: CategoryDistribution) {
  const counts = distribution?.counts ?? {}
  const labels = [
    'Totalmente en desacuerdo',
    'En desacuerdo',
    'De acuerdo',
    'Totalmente de acuerdo',
  ]
  return labels.map((label) => {
    const source = Object.keys(counts).find(
      (candidate) => normalizeEducationLabel(candidate) === normalizeEducationLabel(label),
    )
    return [label, source ? counts[source] : 0] as [string, number]
  })
}

function formatPercentage(value: number, total: number) {
  return `${total ? ((value / total) * 100).toFixed(1).replace('.', ',') : '0,0'} %`
}

function formatPercentValue(value: number) {
  return value.toFixed(1).replace('.', ',')
}
