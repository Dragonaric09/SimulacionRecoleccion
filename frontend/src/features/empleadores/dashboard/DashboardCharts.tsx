import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  LabelList,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { CountItem, TimePoint } from './dashboardTypes'
import { formatBucket, formatCount, formatDecimal, formatPercent } from './dashboardFormat'
import { AGREEMENT, AXIS_TEXT, CATEGORY_COLORS, EMPLOYER, GRID, NEUTRAL, truncate } from './chartTheme'

const AXIS_TICK = { fontSize: 12, fill: AXIS_TEXT }

export function EmptyChart({ text = 'Sin respuestas para esta pregunta.' }: { text?: string }) {
  return <p className="flex h-40 items-center justify-center text-sm text-ink-600">{text}</p>
}

/** Respuestas por día o semana (barras) y acumuladas (línea). */
export function TimelineChart({ points, granularity }: { points: TimePoint[]; granularity: 'day' | 'week' }) {
  if (points.length === 0) return <EmptyChart text="Sin fechas de respuesta." />
  const config = {
    count: { label: granularity === 'week' ? 'Respuestas por semana' : 'Respuestas por día', color: EMPLOYER },
    cumulative: { label: 'Acumulado', color: AGREEMENT.agree },
  } satisfies ChartConfig
  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      <ComposedChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="bucket" tickFormatter={formatBucket} tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={28} />
        <YAxis yAxisId="count" tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} tickFormatter={(v) => formatCount(Number(v))} />
        <YAxis yAxisId="cumulative" orientation="right" tick={AXIS_TICK} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => formatCount(Number(v))} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => formatBucket(String(value))} formatter={(value) => formatCount(Number(value))} />} />
        <Bar yAxisId="count" dataKey="count" fill={EMPLOYER} radius={[4, 4, 0, 0]} maxBarSize={22} />
        <Line yAxisId="cumulative" dataKey="cumulative" stroke={AGREEMENT.agree} strokeWidth={2} dot={false} type="monotone" />
      </ComposedChart>
    </ChartContainer>
  )
}

/** Dona de una distribución de opción única, con la leyenda en filas. */
export function DonutChart({ items, total }: { items: CountItem[]; total: number }) {
  if (items.length === 0) return <EmptyChart />
  const config = Object.fromEntries(items.map((item, index) => [`c${index}`, { label: item.label, color: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }])) as ChartConfig
  return (
    <div className="flex flex-col items-center gap-4">
      <ChartContainer config={config} className="h-[190px] w-full max-w-[260px]">
        <PieChart>
          <ChartTooltip content={<ChartTooltipContent nameKey="label" formatter={(value) => `${formatCount(Number(value))}`} hideLabel />} />
          <Pie data={items} dataKey="count" nameKey="label" innerRadius={56} outerRadius={84} paddingAngle={2} stroke="none">
            {items.map((item, index) => <Cell key={item.label} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />)}
          </Pie>
        </PieChart>
      </ChartContainer>
      <ul className="w-full space-y-2 text-sm">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }} aria-hidden="true" />
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

/** Barras horizontales ordenadas (o en el orden dado), con el porcentaje sobre quienes respondieron. */
export function RankedBars({ items, color = EMPLOYER, maxItems = 15, labelWidth = 190, domainMax }: {
  items: { label: string; percent: number; count: number }[]
  color?: string
  maxItems?: number
  labelWidth?: number
  domainMax?: number
}) {
  const data = items.slice(0, maxItems)
  if (data.length === 0) return <EmptyChart />
  const config = { percent: { label: '% de respuestas', color } } satisfies ChartConfig
  return (
    <ChartContainer config={config} className="w-full" style={{ height: Math.max(150, data.length * 36 + 16) }}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" hide domain={[0, domainMax ?? 'dataMax']} />
        <YAxis type="category" dataKey="label" width={labelWidth} tickLine={false} axisLine={false} interval={0} tick={AXIS_TICK} tickFormatter={(value: string) => truncate(value, Math.floor(labelWidth / 7))} />
        <ChartTooltip cursor={{ fill: '#F1F5F9' }} content={<ChartTooltipContent hideIndicator labelFormatter={(value) => String(value)} formatter={(value, _name, item) => `${formatCount(item.payload.count)} (${formatPercent(Number(value))})`} />} />
        <Bar dataKey="percent" fill={color} radius={[0, 4, 4, 0]} barSize={18}>
          <LabelList dataKey="percent" position="right" formatter={(value) => formatPercent(Number(value), 0)} className="fill-ink-600 text-xs" />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

/** Balance de acuerdo por afirmación: a la derecha el acuerdo, a la izquierda el desacuerdo. «No sabe» no entra. */
export function BalanceBars({ rows }: {
  rows: { label: string; agree: number; partly: number; disagree: number; netIndex: number | null; base: number }[]
}) {
  if (rows.length === 0) return <EmptyChart />
  const config = {
    partly: { label: 'Parcialmente de acuerdo', color: AGREEMENT.partly },
    agree: { label: 'Totalmente de acuerdo', color: AGREEMENT.agree },
    disagree: { label: 'Totalmente desacuerdo', color: AGREEMENT.disagree },
  } satisfies ChartConfig
  return (
    <ChartContainer config={config} className="w-full" style={{ height: rows.length * 34 + 56 }}>
      <BarChart data={rows} layout="vertical" stackOffset="sign" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" domain={[-100, 100]} tickFormatter={(value) => `${Math.abs(Number(value))}%`} tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" width={250} tickLine={false} axisLine={false} interval={0} tick={AXIS_TICK} />
        <ReferenceLine x={0} stroke={AXIS_TEXT} strokeWidth={1} />
        <ChartTooltip cursor={{ fill: '#F1F5F9' }} content={<ChartTooltipContent labelFormatter={(value) => String(value)} formatter={(value, _name, item) => `${formatPercent(Math.abs(Number(value)))} · n = ${formatCount(item.payload.base)}`} />} />
        <Legend verticalAlign="top" height={32} iconType="square" formatter={(value) => <span className="text-xs text-ink-600">{String(value)}</span>} />
        <Bar dataKey="partly" stackId="balance" fill={AGREEMENT.partly} barSize={16} />
        <Bar dataKey="agree" stackId="balance" fill={AGREEMENT.agree} barSize={16} radius={[0, 4, 4, 0]} />
        <Bar dataKey="disagree" stackId="balance" fill={AGREEMENT.disagree} barSize={16} radius={[4, 0, 0, 4]} />
      </BarChart>
    </ChartContainer>
  )
}

/** Matriz contratación × probabilidad de contratar: barras apiladas por categoría de probabilidad. */
export function HiringMatrixBars({ rows }: { rows: { label: string; yes: number; no: number; unknown: number }[] }) {
  if (rows.length === 0) return <EmptyChart />
  const config = {
    yes: { label: 'Contrató en 5 años', color: EMPLOYER },
    no: { label: 'No contrató', color: AGREEMENT.partly },
    unknown: { label: 'Sin respuesta', color: NEUTRAL },
  } satisfies ChartConfig
  return (
    <ChartContainer config={config} className="w-full" style={{ height: rows.length * 46 + 56 }}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={150} tickLine={false} axisLine={false} tick={AXIS_TICK} />
        <ChartTooltip cursor={{ fill: '#F1F5F9' }} content={<ChartTooltipContent formatter={(value) => formatCount(Number(value))} />} />
        <Legend verticalAlign="top" height={32} iconType="square" formatter={(value) => <span className="text-xs text-ink-600">{String(value)}</span>} />
        <Bar dataKey="yes" stackId="hiring" fill={EMPLOYER} barSize={20} />
        <Bar dataKey="no" stackId="hiring" fill={AGREEMENT.partly} barSize={20} />
        <Bar dataKey="unknown" stackId="hiring" fill={NEUTRAL} barSize={20} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

/** Índice neto por grupo de afirmaciones, según si la organización contrató en los últimos 5 años. */
export function GroupBalanceBars({ rows }: { rows: { group: string; yes: number | null; no: number | null }[] }) {
  if (rows.length === 0) return <EmptyChart />
  const config = {
    yes: { label: 'Contrató', color: EMPLOYER },
    no: { label: 'No contrató', color: NEUTRAL },
  } satisfies ChartConfig
  return (
    <ChartContainer config={config} className="h-[240px] w-full">
      <BarChart data={rows} margin={{ top: 16, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="group" tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <YAxis domain={[-100, 100]} tick={AXIS_TICK} tickLine={false} axisLine={false} width={44} tickFormatter={(value) => `${value}`} />
        <ReferenceLine y={0} stroke={AXIS_TEXT} />
        <ChartTooltip content={<ChartTooltipContent formatter={(value) => `${formatDecimal(Number(value), 1)} pts`} />} />
        <Legend verticalAlign="top" height={28} iconType="square" formatter={(value) => <span className="text-xs text-ink-600">{String(value)}</span>} />
        <Bar dataKey="yes" fill={EMPLOYER} radius={[4, 4, 0, 0]} maxBarSize={48} />
        <Bar dataKey="no" fill={NEUTRAL} radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ChartContainer>
  )
}
