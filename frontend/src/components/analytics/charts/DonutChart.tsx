import { Cell, Pie, PieChart } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { DistributionChartItem } from './chartTypes'
import { useChartContainerWidth } from './useChartContainerSize'

const COLORS = [
  '#1F6FB5',
  '#14A39A',
  '#F2A33A',
  '#8E5BD0',
  '#E4572E',
  '#5C6B7A',
  '#7CB342',
  '#D9418C',
]
const formatCount = (value: number) => new Intl.NumberFormat('es-BO').format(value)
const formatPercent = (value: number) =>
  `${value.toLocaleString('es-BO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`

export function DonutChart({
  items,
  total,
  colors = COLORS,
  renderMode = 'screen',
}: {
  items: DistributionChartItem[]
  total: number
  colors?: readonly string[]
  renderMode?: 'screen' | 'print'
}) {
  const { ref, width } = useChartContainerWidth<HTMLDivElement>()
  if (items.length === 0)
    return (
      <p className="flex h-40 items-center justify-center text-sm text-ink-600">
        Sin respuestas para esta pregunta.
      </p>
    )
  if (renderMode === 'print') return <DonutChartPrint items={items} total={total} colors={colors} />
  const config = Object.fromEntries(
    items.map((item, index) => [
      `c${index}`,
      { label: item.label, color: colors[index % colors.length] },
    ]),
  ) as ChartConfig
  const compact = width > 0 && width < 220
  const outerRadius = compact ? 62 : 84
  const innerRadius = compact ? 40 : 56
  const chartHeight = compact ? 150 : 190
  const horizontal = width >= 600
  return (
    <div
      ref={ref}
      className={`flex w-full min-w-0 items-center justify-center gap-4 ${horizontal ? 'flex-row' : 'flex-col'}`}
    >
      <ChartContainer
        config={config}
        className="w-full max-w-[260px] shrink-0"
        style={{ height: chartHeight }}
      >
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                nameKey="label"
                formatter={(value) => formatCount(Number(value))}
                hideLabel
              />
            }
          />
          <Pie
            data={items}
            dataKey="count"
            nameKey="label"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            stroke="none"
          >
            {items.map((item, index) => (
              <Cell key={item.label} fill={colors[index % colors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul
        className={`w-full space-y-2 text-sm ${horizontal ? 'min-w-0 max-w-[520px] flex-1' : 'max-w-[520px]'}`}
      >
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: colors[index % colors.length] }}
                aria-hidden="true"
              />
              <span className="truncate text-ink-900">{item.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-ink-600">
              {formatCount(item.count)} · {formatPercent(item.percent)}
            </span>
          </li>
        ))}
        <li className="pt-1 text-xs text-ink-500">Base: {formatCount(total)} respuestas</li>
      </ul>
    </div>
  )
}

function DonutChartPrint({
  items,
  total,
  colors,
}: {
  items: DistributionChartItem[]
  total: number
  colors: readonly string[]
}) {
  return (
    <div className="space-y-2 text-xs">
      <div className="space-y-1">
        {items.map((item, index) => (
          <div
            key={item.label}
            className="grid grid-cols-[minmax(8rem,1fr)_minmax(10rem,2fr)_4rem] items-center gap-2"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <i
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: colors[index % colors.length] }}
              />
              <span className="break-words">{item.label}</span>
            </span>
            <div className="h-3 overflow-hidden rounded-sm bg-slate-100">
              <div
                className="h-full rounded-sm"
                style={{
                  width: `${item.percent}%`,
                  backgroundColor: colors[index % colors.length],
                }}
              />
            </div>
            <span className="text-right tabular-nums">{formatPercent(item.percent)}</span>
          </div>
        ))}
      </div>
      <div className="pt-1 text-xs text-ink-500">Base: {formatCount(total)} respuestas</div>
    </div>
  )
}
