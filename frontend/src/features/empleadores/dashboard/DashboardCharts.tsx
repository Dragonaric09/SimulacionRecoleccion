import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import type { CountItem, TimePoint } from './dashboardTypes'
import { formatBucket, formatCount, formatDecimal, formatPercent } from './dashboardFormat'
import { AGREEMENT, AXIS_TEXT, CATEGORY_COLORS, EMPLOYER, GRID, NEUTRAL } from './chartTheme'
import { RankedBars as SharedRankedBars } from '@/components/analytics/charts'
import { DonutChart as SharedDonutChart } from '@/components/analytics/charts'
import { ChartVariantSelector, useChartVariant } from '@/components/analytics/charts'

const AXIS_TICK = { fontSize: 12, fill: AXIS_TEXT }

export function EmptyChart({ text = 'Sin respuestas para esta pregunta.' }: { text?: string }) {
  return <p className="flex h-40 items-center justify-center text-sm text-ink-600">{text}</p>
}

/** Respuestas por día o semana (barras) y acumuladas (línea). */
export function TimelineChart({
  points,
  granularity,
  showCumulative = true,
}: {
  points: TimePoint[]
  granularity: 'day' | 'week'
  showCumulative?: boolean
}) {
  if (points.length === 0) return <EmptyChart text="Sin fechas de respuesta." />
  const config = {
    count: {
      label: granularity === 'week' ? 'Respuestas por semana' : 'Respuestas por día',
      color: EMPLOYER,
    },
    cumulative: { label: 'Acumulado', color: AGREEMENT.agree },
  } satisfies ChartConfig
  return (
    <ChartContainer config={config} className="h-[260px] w-full">
      <ComposedChart data={points} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis
          dataKey="bucket"
          tickFormatter={formatBucket}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          minTickGap={28}
        />
        <YAxis
          yAxisId="count"
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v) => formatCount(Number(v))}
        />
        {showCumulative && (
          <YAxis
            yAxisId="cumulative"
            orientation="right"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v) => formatCount(Number(v))}
          />
        )}
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(value) => formatBucket(String(value))}
              formatter={(value) => formatCount(Number(value))}
            />
          }
        />
        <Bar
          yAxisId="count"
          dataKey="count"
          fill={EMPLOYER}
          radius={[4, 4, 0, 0]}
          maxBarSize={22}
        />
        {showCumulative && (
          <Line
            yAxisId="cumulative"
            dataKey="cumulative"
            stroke={AGREEMENT.agree}
            strokeWidth={2}
            dot={false}
            type="monotone"
          />
        )}
      </ComposedChart>
    </ChartContainer>
  )
}

export type TimelineVariant = 'combined' | 'bars' | 'table'

export function TimelineQuestionChart({
  points,
  granularity,
  storageKey,
}: {
  points: TimePoint[]
  granularity: 'day' | 'week'
  storageKey?: string
}) {
  const variants: readonly TimelineVariant[] = ['combined', 'bars', 'table']
  const [variant, setVariant] = useChartVariant(storageKey, 'combined', variants)
  const labels: Record<TimelineVariant, string> = {
    combined: 'Barras + acumulado',
    bars: 'Barras',
    table: 'Tabla',
  }
  return (
    <div className="space-y-3">
      <ChartVariantSelector
        value={variant}
        options={variants}
        labels={labels}
        onChange={setVariant}
      />
      {variant === 'table' ? (
        <TimelineTable points={points} granularity={granularity} />
      ) : (
        <TimelineChart
          points={points}
          granularity={granularity}
          showCumulative={variant === 'combined'}
        />
      )}
    </div>
  )
}

function TimelineTable({
  points,
  granularity,
}: {
  points: TimePoint[]
  granularity: 'day' | 'week'
}) {
  if (points.length === 0) return <EmptyChart text="Sin fechas de respuesta." />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-line text-xs text-ink-600">
            <th className="p-2 text-left">{granularity === 'week' ? 'Semana' : 'Día'}</th>
            <th className="p-2 text-right">Respuestas</th>
            <th className="p-2 text-right">Acumulado</th>
          </tr>
        </thead>
        <tbody>
          {points.map((point) => (
            <tr key={point.bucket} className="border-b border-surface-container-high">
              <td className="p-2 text-ink-900">{formatBucket(point.bucket)}</td>
              <td className="p-2 text-right tabular-nums">{formatCount(point.count)}</td>
              <td className="p-2 text-right tabular-nums">{formatCount(point.cumulative)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Dona de una distribución de opción única, con la leyenda en filas. */
export function DonutChart({
  items,
  total,
  renderMode = 'screen',
}: {
  items: CountItem[]
  total: number
  renderMode?: 'screen' | 'print'
}) {
  return (
    <SharedDonutChart
      items={items}
      total={total}
      colors={CATEGORY_COLORS}
      renderMode={renderMode}
    />
  )
}

/** Barras horizontales ordenadas (o en el orden dado), con el porcentaje sobre quienes respondieron. */
export function RankedBars({
  items,
  color = EMPLOYER,
  maxItems = 15,
  labelWidth = 190,
  domainMax,
  renderMode = 'screen',
}: {
  items: { label: string; percent: number; count: number }[]
  color?: string
  maxItems?: number
  labelWidth?: number
  domainMax?: number
  renderMode?: 'screen' | 'print'
}) {
  return (
    <SharedRankedBars
      items={items}
      color={color}
      maxItems={maxItems}
      labelWidth={labelWidth}
      domainMax={domainMax}
      renderMode={renderMode}
    />
  )
}

/** Balance de acuerdo por afirmación: a la derecha el acuerdo, a la izquierda el desacuerdo. «No sabe» no entra. */
export function BalanceBars({
  rows,
}: {
  rows: {
    label: string
    agree: number
    partly: number
    disagree: number
    netIndex: number | null
    base: number
  }[]
}) {
  if (rows.length === 0) return <EmptyChart />
  const config = {
    partly: { label: 'Parcialmente de acuerdo', color: AGREEMENT.partly },
    agree: { label: 'Totalmente de acuerdo', color: AGREEMENT.agree },
    disagree: { label: 'Totalmente desacuerdo', color: AGREEMENT.disagree },
  } satisfies ChartConfig
  return (
    <ChartContainer config={config} className="w-full" style={{ height: rows.length * 34 + 56 }}>
      <BarChart
        data={rows}
        layout="vertical"
        stackOffset="sign"
        margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
      >
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis
          type="number"
          domain={[-100, 100]}
          tickFormatter={(value) => `${Math.abs(Number(value))}%`}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={250}
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={AXIS_TICK}
        />
        <ReferenceLine x={0} stroke={AXIS_TEXT} strokeWidth={1} />
        <ChartTooltip
          cursor={{ fill: '#F1F5F9' }}
          content={
            <ChartTooltipContent
              labelFormatter={(value) => String(value)}
              formatter={(value, _name, item) =>
                `${formatPercent(Math.abs(Number(value)))} · n = ${formatCount(item.payload.base)}`
              }
            />
          }
        />
        <Legend
          verticalAlign="top"
          height={32}
          iconType="square"
          formatter={(value) => <span className="text-xs text-ink-600">{String(value)}</span>}
        />
        <Bar dataKey="partly" stackId="balance" fill={AGREEMENT.partly} barSize={16} />
        <Bar
          dataKey="agree"
          stackId="balance"
          fill={AGREEMENT.agree}
          barSize={16}
          radius={[0, 4, 4, 0]}
        />
        <Bar
          dataKey="disagree"
          stackId="balance"
          fill={AGREEMENT.disagree}
          barSize={16}
          radius={[4, 0, 0, 4]}
        />
      </BarChart>
    </ChartContainer>
  )
}

export function BalanceQuestionChart({
  rows,
  storageKey,
}: {
  rows: {
    label: string
    agree: number
    partly: number
    disagree: number
    netIndex: number | null
    base: number
  }[]
  storageKey?: string
}) {
  const variants = ['balance', 'table'] as const
  const [variant, setVariant] = useChartVariant(storageKey, 'balance', variants)
  const labels = { balance: 'Balance', table: 'Tabla' } as const
  return (
    <div className="space-y-3">
      <ChartVariantSelector
        value={variant}
        options={variants}
        labels={labels}
        onChange={setVariant}
      />
      {variant === 'table' ? <BalanceTable rows={rows} /> : <BalanceBars rows={rows} />}
    </div>
  )
}

function BalanceTable({
  rows,
}: {
  rows: {
    label: string
    agree: number
    partly: number
    disagree: number
    netIndex: number | null
    base: number
  }[]
}) {
  if (!rows.length) return <EmptyChart />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-line text-xs text-ink-600">
            <th className="p-2 text-left">Afirmación</th>
            <th className="p-2 text-right">Desacuerdo</th>
            <th className="p-2 text-right">Parcial</th>
            <th className="p-2 text-right">Acuerdo</th>
            <th className="p-2 text-right">Índice neto</th>
            <th className="p-2 text-right">n</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-surface-container-high">
              <td className="p-2 text-ink-900">{row.label}</td>
              <td className="p-2 text-right tabular-nums">
                {formatPercent(Math.abs(row.disagree))}
              </td>
              <td className="p-2 text-right tabular-nums">{formatPercent(row.partly)}</td>
              <td className="p-2 text-right tabular-nums">{formatPercent(row.agree)}</td>
              <td className="p-2 text-right font-semibold tabular-nums">
                {row.netIndex === null ? '—' : formatDecimal(row.netIndex, 1)}
              </td>
              <td className="p-2 text-right tabular-nums">{formatCount(row.base)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Matriz contratación × probabilidad de contratar: barras apiladas por categoría de probabilidad. */
export function HiringMatrixBars({
  rows,
}: {
  rows: { label: string; yes: number; no: number; unknown: number }[]
}) {
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
        <YAxis
          type="category"
          dataKey="label"
          width={150}
          tickLine={false}
          axisLine={false}
          tick={AXIS_TICK}
        />
        <ChartTooltip
          cursor={{ fill: '#F1F5F9' }}
          content={<ChartTooltipContent formatter={(value) => formatCount(Number(value))} />}
        />
        <Legend
          verticalAlign="top"
          height={32}
          iconType="square"
          formatter={(value) => <span className="text-xs text-ink-600">{String(value)}</span>}
        />
        <Bar dataKey="yes" stackId="hiring" fill={EMPLOYER} barSize={20} />
        <Bar dataKey="no" stackId="hiring" fill={AGREEMENT.partly} barSize={20} />
        <Bar dataKey="unknown" stackId="hiring" fill={NEUTRAL} barSize={20} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

export function HiringQuestionChart({
  rows,
  storageKey,
}: {
  rows: { label: string; yes: number; no: number; unknown: number }[]
  storageKey?: string
}) {
  const variants = ['stacked', 'table'] as const
  const [variant, setVariant] = useChartVariant(storageKey, 'stacked', variants)
  const labels = { stacked: 'Barras apiladas', table: 'Tabla' } as const
  return (
    <div className="space-y-3">
      <ChartVariantSelector
        value={variant}
        options={variants}
        labels={labels}
        onChange={setVariant}
      />
      {variant === 'table' ? <HiringTable rows={rows} /> : <HiringMatrixBars rows={rows} />}
    </div>
  )
}

function HiringTable({
  rows,
}: {
  rows: { label: string; yes: number; no: number; unknown: number }[]
}) {
  if (!rows.length) return <EmptyChart />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-line text-xs text-ink-600">
            <th className="p-2 text-left">Probabilidad</th>
            <th className="p-2 text-right">Contrató</th>
            <th className="p-2 text-right">No contrató</th>
            <th className="p-2 text-right">Sin respuesta</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-surface-container-high">
              <td className="p-2 text-ink-900">{row.label}</td>
              <td className="p-2 text-right tabular-nums">{formatCount(row.yes)}</td>
              <td className="p-2 text-right tabular-nums">{formatCount(row.no)}</td>
              <td className="p-2 text-right tabular-nums">{formatCount(row.unknown)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Índice neto por grupo de afirmaciones, según si la organización contrató en los últimos 5 años. */
export function GroupBalanceBars({
  rows,
}: {
  rows: { group: string; yes: number | null; no: number | null }[]
}) {
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
        <YAxis
          domain={[-100, 100]}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(value) => `${value}`}
        />
        <ReferenceLine y={0} stroke={AXIS_TEXT} />
        <ChartTooltip
          content={
            <ChartTooltipContent formatter={(value) => `${formatDecimal(Number(value), 1)} pts`} />
          }
        />
        <Legend
          verticalAlign="top"
          height={28}
          iconType="square"
          formatter={(value) => <span className="text-xs text-ink-600">{String(value)}</span>}
        />
        <Bar dataKey="yes" fill={EMPLOYER} radius={[4, 4, 0, 0]} maxBarSize={48} />
        <Bar dataKey="no" fill={NEUTRAL} radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ChartContainer>
  )
}

export function GroupBalanceQuestionChart({
  rows,
  storageKey,
}: {
  rows: { group: string; yes: number | null; no: number | null }[]
  storageKey?: string
}) {
  const variants = ['bars', 'table'] as const
  const [variant, setVariant] = useChartVariant(storageKey, 'bars', variants)
  const labels = { bars: 'Barras', table: 'Tabla' } as const
  return (
    <div className="space-y-3">
      <ChartVariantSelector
        value={variant}
        options={variants}
        labels={labels}
        onChange={setVariant}
      />
      {variant === 'table' ? <GroupBalanceTable rows={rows} /> : <GroupBalanceBars rows={rows} />}
    </div>
  )
}

function GroupBalanceTable({
  rows,
}: {
  rows: { group: string; yes: number | null; no: number | null }[]
}) {
  if (!rows.length) return <EmptyChart />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-line text-xs text-ink-600">
            <th className="p-2 text-left">Grupo</th>
            <th className="p-2 text-right">Contrató</th>
            <th className="p-2 text-right">No contrató</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.group} className="border-b border-surface-container-high">
              <td className="p-2 text-ink-900">{row.group}</td>
              <td className="p-2 text-right tabular-nums">
                {row.yes === null ? '—' : formatDecimal(row.yes, 1)}
              </td>
              <td className="p-2 text-right tabular-nums">
                {row.no === null ? '—' : formatDecimal(row.no, 1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
