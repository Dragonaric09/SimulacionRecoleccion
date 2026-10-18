import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatPercentValue } from '@/features/analitica/shared/analyticsFormatters'
import type { DistributionChartItem } from './chartTypes'
import { responsiveLabelWidth, useChartContainerWidth } from './useChartContainerSize'

const AXIS_TICK = { fontSize: 12, fill: '#475569' }
const EMPLOYER = '#14A39A'
const GRID = '#E2E8F0'
const formatCount = (value: number) => new Intl.NumberFormat('es-BO').format(value)
const truncate = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text

export function RankedBars({
  items,
  color = EMPLOYER,
  maxItems = 15,
  labelWidth = 190,
  domainMax,
  renderMode = 'screen',
}: {
  items: DistributionChartItem[]
  color?: string
  maxItems?: number
  labelWidth?: number
  domainMax?: number
  renderMode?: 'screen' | 'print'
}) {
  const { ref, width } = useChartContainerWidth<HTMLDivElement>()
  const data = items.slice(0, maxItems)
  if (data.length === 0)
    return (
      <p className="flex h-40 items-center justify-center text-sm text-ink-600">
        Sin respuestas para esta pregunta.
      </p>
    )
  if (renderMode === 'print')
    return <RankedBarsPrint items={data} color={color} domainMax={domainMax} />
  const config = { percent: { label: '% de respuestas', color } } satisfies ChartConfig
  const effectiveLabelWidth = responsiveLabelWidth(width, labelWidth)
  const rowHeight = width > 0 && width < 360 ? 32 : 36
  return (
    <div ref={ref} className="w-full min-w-0">
      <ChartContainer
        config={config}
        className="w-full"
        style={{ height: Math.max(150, data.length * rowHeight + 16) }}
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: width > 0 && width < 360 ? 34 : 48, bottom: 4, left: 4 }}
        >
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" hide domain={[0, domainMax ?? 'dataMax']} />
          <YAxis
            type="category"
            dataKey="label"
            width={effectiveLabelWidth}
            tickLine={false}
            axisLine={false}
            interval={0}
            tick={AXIS_TICK}
            tickFormatter={(value: string) => truncate(value, Math.floor(effectiveLabelWidth / 7))}
          />
          <ChartTooltip
            cursor={{ fill: '#F1F5F9' }}
            content={
              <ChartTooltipContent
                hideIndicator
                labelFormatter={(value) => String(value)}
                formatter={(value, _name, item) =>
                  `${formatCount(item.payload.count)} (${formatPercentValue(Number(value))})`
                }
              />
            }
          />
          <Bar dataKey="percent" fill={color} radius={[0, 4, 4, 0]} barSize={18}>
            <LabelList
              dataKey="percent"
              position="right"
              formatter={(value) => formatPercentValue(Number(value), 0)}
              className="fill-ink-600 text-xs"
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}

function RankedBarsPrint({
  items,
  color,
  domainMax,
}: {
  items: DistributionChartItem[]
  color: string
  domainMax?: number
}) {
  const scale = domainMax ?? Math.max(...items.map((item) => item.percent), 1)
  return (
    <div className="space-y-2 text-xs">
      {items.map((item) => (
        <div
          key={item.label}
          className="grid grid-cols-[minmax(8rem,0.9fr)_minmax(10rem,2fr)_3.5rem] items-center gap-2"
        >
          <span className="min-w-0 break-words text-ink-800">{item.label}</span>
          <div className="h-3 overflow-hidden rounded-sm bg-slate-100">
            <div
              className="h-full rounded-sm"
              style={{
                width: `${Math.min(100, (item.percent * 100) / scale)}%`,
                backgroundColor: color,
              }}
            />
          </div>
          <span className="text-right tabular-nums text-ink-700">
            {item.percent.toFixed(1).replace('.', ',')} %
          </span>
        </div>
      ))}
    </div>
  )
}
