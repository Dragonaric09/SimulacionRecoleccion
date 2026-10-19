import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatDecimal } from '@/features/analitica/shared/analyticsFormatters'
import { formatMeanTooltip } from '@/components/analytics/visualizationTooltip'
import type { MeanChartItem } from './chartTypes'
import { responsiveLabelWidth, useChartContainerWidth } from './useChartContainerSize'

const AXIS_TICK = { fontSize: 12, fill: '#475569' }

/** Barras horizontales de medias en una escala de 0 a 5. */
export function MeanBars({
  items,
  color = '#14A39A',
  maxItems,
  renderMode = 'screen',
}: {
  items: MeanChartItem[]
  color?: string
  maxItems?: number
  renderMode?: 'screen' | 'print'
}) {
  const { ref, width } = useChartContainerWidth<HTMLDivElement>()
  const data = items
    .filter((item) => Number.isFinite(item.value))
    .sort((a, b) => b.value - a.value)
    .slice(0, maxItems)
  if (data.length === 0)
    return (
      <p className="flex h-40 items-center justify-center text-sm text-ink-600">
        Sin valoraciones disponibles.
      </p>
    )
  if (renderMode === 'print') return <MeanBarsPrint items={data} color={color} />
  const config = { value: { label: 'Media (1 a 5)', color } } satisfies ChartConfig
  const effectiveLabelWidth = responsiveLabelWidth(width, 170)
  const rowHeight = width > 0 && width < 360 ? 30 : 32
  return (
    <div ref={ref} className="w-full min-w-0">
      <ChartContainer
        config={config}
        className="w-full"
        style={{ height: data.length * rowHeight + 24 }}
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: width > 0 && width < 360 ? 30 : 40, bottom: 4, left: 4 }}
        >
          <CartesianGrid horizontal={false} stroke="#E2E8F0" />
          <XAxis
            type="number"
            domain={[0, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={effectiveLabelWidth}
            tickLine={false}
            axisLine={false}
            interval={0}
            tick={AXIS_TICK}
          />
          <ChartTooltip
            cursor={{ fill: '#F1F5F9' }}
            content={
              <ChartTooltipContent
                hideIndicator
                formatter={(value, _name, item) =>
                  formatMeanTooltip({
                    label: item.payload.label,
                    value: Number(value),
                    sampleSize: item.payload.sampleSize,
                  })
                }
              />
            }
          />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} barSize={16}>
            <LabelList
              dataKey="value"
              position="right"
              formatter={(value) => formatDecimal(Number(value), 2)}
              className="fill-ink-600 text-xs"
            />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}

function MeanBarsPrint({ items, color }: { items: MeanChartItem[]; color: string }) {
  return (
    <div className="space-y-2 text-xs">
      {items.map((item) => (
        <div
          key={item.label}
          className="grid grid-cols-[minmax(8rem,0.9fr)_minmax(10rem,2fr)_3rem] items-center gap-2"
        >
          <span className="min-w-0 break-words text-ink-800">{item.label}</span>
          <div className="h-3 overflow-hidden rounded-sm bg-slate-100">
            <div
              className="h-full rounded-sm"
              style={{ width: `${Math.min(100, item.value * 20)}%`, backgroundColor: color }}
            />
          </div>
          <span className="text-right tabular-nums text-ink-700">
            {item.value.toFixed(2).replace('.', ',')}
          </span>
        </div>
      ))}
    </div>
  )
}
