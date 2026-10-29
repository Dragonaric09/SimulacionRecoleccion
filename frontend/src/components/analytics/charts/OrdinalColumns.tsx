import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatDistributionTooltip } from '@/components/analytics/visualizationTooltip'
import type { DistributionChartItem } from './chartTypes'
import { useChartContainerWidth } from './useChartContainerSize'

const AXIS_TICK = { fontSize: 11, fill: '#475569' }

/** Columnas verticales para categorías con un orden inherente: rangos, niveles o intervalos. */
export function OrdinalColumns({
  items,
  color = '#1F6FB5',
}: {
  items: DistributionChartItem[]
  color?: string
}) {
  const { ref, width } = useChartContainerWidth<HTMLDivElement>()
  if (!items.length)
    return (
      <p className="flex h-40 items-center justify-center text-sm text-ink-600">
        Sin respuestas para esta pregunta.
      </p>
    )

  const compact = width > 0 && width < 420
  const config = { count: { label: 'Respuestas', color } } satisfies ChartConfig
  return (
    <div ref={ref} className="w-full min-w-0">
      <ChartContainer config={config} className="h-[220px] w-full">
        <BarChart data={items} margin={{ top: 24, right: 8, bottom: compact ? 44 : 30, left: compact ? 32 : 0 }}>
          <CartesianGrid vertical={false} stroke="#E2E8F0" />
          <XAxis
            dataKey="label"
            interval={0}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            angle={compact ? -24 : 0}
            textAnchor={compact ? 'end' : 'middle'}
            height={compact ? 58 : 40}
          />
          <YAxis
            allowDecimals={false}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={28}
          />
          <ChartTooltip
            cursor={{ fill: '#F1F5F9' }}
            content={
              <ChartTooltipContent
                hideIndicator
                labelFormatter={(value) => String(value)}
                formatter={(value, _name, item) =>
                  formatDistributionTooltip(
                    { count: Number(value), total: item.payload.total ?? 0 },
                    Number(item.payload.percent),
                    'column',
                  )
                }
              />
            }
          />
          <Bar dataKey="count" fill={color} radius={[4, 4, 0, 0]} maxBarSize={52}>
            <LabelList dataKey="count" position="top" className="fill-ink-600 text-xs" />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}
