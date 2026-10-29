import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { contrastTextColor } from '@/lib/utils'
import { SUFFICIENCY_SCALE } from '../instrumento'
import { competenceLabel } from './labels'
import { formatCount, formatDecimal, formatPercent } from './dashboardFormat'
import { AXIS_TEXT, GRID, likertColor } from './chartTheme'
import { EmptyChart } from './DashboardCharts'
import type { DashboardCompetence, SizeCompetenceCell } from './dashboardTypes'
import { MeanBars as SharedMeanBars } from '@/components/analytics/charts'
import { ChartVariantSelector, useChartVariant } from '@/components/analytics/charts'
import { TapTooltip } from '@/components/analytics/TapTooltip'

const AXIS_TICK = { fontSize: 12, fill: AXIS_TEXT }
const LEVEL_KEYS = ['l1', 'l2', 'l3', 'l4', 'l5'] as const

/** Distribución de niveles 1 a 5 por competencia, en porcentaje de quienes la valoraron. «No observado» aparte. */
export function CompetenceLevelBars({ competences }: { competences: DashboardCompetence[] }) {
  const rows = competences
    .filter((item) => item.answered > 0)
    .map((item) => {
      const row: Record<string, number | string> = { label: competenceLabel(item.code, item.name) }
      SUFFICIENCY_SCALE.forEach((level, index) => {
        const count = item.levels[String(level.level)] ?? 0
        row[LEVEL_KEYS[index]] = (count * 100) / item.answered
        row[`n${index + 1}`] = count
      })
      return row
    })
  if (rows.length === 0) return <EmptyChart text="Sin valoraciones de competencias." />
  const config = Object.fromEntries(
    SUFFICIENCY_SCALE.map((level, index) => [
      LEVEL_KEYS[index],
      { label: level.label, color: level.color },
    ]),
  ) as ChartConfig
  return (
    <ChartContainer config={config} className="w-full" style={{ height: rows.length * 34 + 56 }}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={(value) => `${value}%`}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={170}
          tickLine={false}
          axisLine={false}
          interval={0}
          tick={AXIS_TICK}
        />
        <ChartTooltip
          cursor={{ fill: '#F1F5F9' }}
          content={
            <ChartTooltipContent
              labelFormatter={(value) => String(value)}
              formatter={(value, name, item) => {
                const index = LEVEL_KEYS.indexOf(name as (typeof LEVEL_KEYS)[number])
                return (
                  <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
                    <span className="min-w-0 text-muted-foreground">{SUFFICIENCY_SCALE[index]?.label ?? 'Nivel'}</span>
                    <span className="text-right font-mono font-medium tabular-nums">{formatPercent(Number(value))}</span>
                    <span className="col-span-2 text-muted-foreground">Respuestas: n = {formatCount(Number(item.payload[`n${index + 1}`]))}</span>
                  </div>
                )
              }}
            />
          }
        />
        {LEVEL_KEYS.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            stackId="levels"
            fill={SUFFICIENCY_SCALE[index].color}
            barSize={18}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}

export function CompetenceLevelQuestionChart({
  competences,
  storageKey,
}: {
  competences: DashboardCompetence[]
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
      {variant === 'table' ? (
        <CompetenceLevelTable competences={competences} />
      ) : (
        <>
          <CompetenceLevelBars competences={competences} />
          <LevelLegend />
        </>
      )}
    </div>
  )
}

function CompetenceLevelTable({ competences }: { competences: DashboardCompetence[] }) {
  const rows = competences.filter((item) => item.answered > 0)
  if (rows.length === 0) return <EmptyChart text="Sin valoraciones de competencias." />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-line text-xs text-ink-600">
            <th className="p-2 text-left">Competencia</th>
            {SUFFICIENCY_SCALE.map((level) => (
              <th key={level.level} className="p-2 text-right">
                Nivel {level.level}
              </th>
            ))}
            <th className="p-2 text-right">n</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.code} className="border-b border-surface-container-high">
              <td className="p-2 text-ink-900">{competenceLabel(item.code, item.name)}</td>
              {SUFFICIENCY_SCALE.map((level) => {
                const count = item.levels[String(level.level)] ?? 0
                return (
                  <td key={level.level} className="p-2 text-right tabular-nums">
                    {formatPercent((count * 100) / item.answered)}
                    <span className="ml-1 text-xs text-ink-500">({formatCount(count)})</span>
                  </td>
                )
              })}
              <td className="p-2 text-right tabular-nums">{formatCount(item.answered)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Leyenda de la escala 1 a 5 usada en CompetenceLevelBars. */
export function LevelLegend() {
  return (
    <ul
      className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600"
      aria-label="Escala de suficiencia"
    >
      {SUFFICIENCY_SCALE.map((level) => (
        <li key={level.level} className="flex items-center gap-1.5">
          <span
            className="size-3 rounded-sm border border-slate-200"
            style={{ background: level.color }}
            aria-hidden="true"
          />
          {level.level} {level.label}
        </li>
      ))}
    </ul>
  )
}

/** Media de cada competencia (escala 1 a 5), ordenada de mayor a menor. */
export function CompetenceMeanBars({
  competences,
  renderMode = 'screen',
}: {
  competences: DashboardCompetence[]
  renderMode?: 'screen' | 'print'
}) {
  const rows = competences
    .filter((item) => item.average !== null)
    .map((item) => ({
      label: competenceLabel(item.code, item.name),
      value: item.average as number,
      sampleSize: item.answered,
    }))
  return <SharedMeanBars items={rows} renderMode={renderMode} />
}

export function CompetenceMeanQuestionChart({
  competences,
  storageKey,
}: {
  competences: DashboardCompetence[]
  storageKey?: string
}) {
  const variants = ['bars', 'table'] as const
  const [variant, setVariant] = useChartVariant(storageKey, 'bars', variants)
  const labels = { bars: 'Barras', table: 'Tabla' } as const
  const rows = competences.filter((item) => item.average !== null)
  return (
    <div className="space-y-3">
      <ChartVariantSelector
        value={variant}
        options={variants}
        labels={labels}
        onChange={setVariant}
      />
      {variant === 'table' ? (
        <MeanTable competences={rows} />
      ) : (
        <CompetenceMeanBars competences={competences} />
      )}
    </div>
  )
}

function MeanTable({ competences }: { competences: DashboardCompetence[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-line text-xs text-ink-600">
            <th className="p-2 text-left">Competencia</th>
            <th className="p-2 text-right">Media</th>
            <th className="p-2 text-right">n</th>
          </tr>
        </thead>
        <tbody>
          {competences.map((item) => (
            <tr key={item.code} className="border-b border-surface-container-high">
              <td className="p-2 text-ink-900">{competenceLabel(item.code, item.name)}</td>
              <td className="p-2 text-right font-semibold tabular-nums">
                {formatDecimal(item.average ?? 0, 2)}
              </td>
              <td className="p-2 text-right tabular-nums">{formatCount(item.answered)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Mapa de calor competencia × tamaño: media de cada celda, con el número dentro. */
export function SizeCompetenceHeatmap({
  cells,
  sizes,
  competences,
  sizeLabel,
}: {
  cells: SizeCompetenceCell[]
  sizes: string[]
  competences: DashboardCompetence[]
  sizeLabel: (size: string) => string
}) {
  const byKey = new Map(cells.map((cell) => [`${cell.size}|${cell.code}`, cell]))
  const rows = competences
    .map((item) => ({ code: item.code, label: competenceLabel(item.code, item.name) }))
    .filter((row) => sizes.some((size) => (byKey.get(`${size}|${row.code}`)?.answered ?? 0) > 0))
  const columns = sizes.filter((size) =>
    rows.some((row) => (byKey.get(`${size}|${row.code}`)?.answered ?? 0) > 0),
  )
  const getColumnWidth = (label: string) =>
    `${Math.max(96, Math.min(170, (label.length + 2) * 8.5))}px`
  if (rows.length === 0 || columns.length === 0)
    return <EmptyChart text="Sin valoraciones por tamaño." />
  return (
    <div className="overflow-x-auto">
      <table
        className="border-separate border-spacing-1 text-sm"
        style={{ width: 'max-content', minWidth: '100%' }}
        aria-label="Media por tamaño y competencia"
      >
        <thead>
          <tr>
            <th scope="col" className="w-40 pb-2 text-left text-xs font-medium text-ink-600">
              Competencia
            </th>
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="pb-2 text-center align-bottom text-xs font-medium text-ink-600"
                style={{ minWidth: getColumnWidth(sizeLabel(column)) }}
              >
                <span className="inline-block whitespace-normal leading-tight">
                  {sizeLabel(column)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.code}>
              <th
                scope="row"
                className="pr-2 text-left align-middle text-xs font-medium text-ink-900"
              >
                {row.label}
              </th>
              {columns.map((column) => {
                const cell = byKey.get(`${column}|${row.code}`)
                const average = cell?.average ?? null
                const background = average === null ? '#F8FAFC' : likertColor(average)
                return (
                  <TapTooltip
                    key={`${row.code}-${column}`}
                    content={<div className="grid gap-0.5"><strong>{row.label}</strong><span>{sizeLabel(column)}</span><span>{average === null ? 'Sin valoraciones' : `Media: ${formatDecimal(average, 2)} de 5 · n = ${formatCount(cell?.answered ?? 0)}`}</span><span className="text-muted-foreground">El color representa el promedio en la escala de suficiencia.</span></div>}
                  >
                    <td
                      tabIndex={0}
                      className="h-11 cursor-help rounded-md text-center text-sm font-semibold tabular-nums"
                      style={{
                        background,
                        color: average === null ? '#94A3B8' : contrastTextColor(background),
                        minWidth: getColumnWidth(sizeLabel(column)),
                      }}
                    >
                      {average === null ? '—' : formatDecimal(average, 1)}
                    </td>
                  </TapTooltip>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div
        className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-600"
        aria-label="Escala de la media"
      >
        <span>1 Muy insuficiente</span>
        {[1, 2, 3, 4, 5].map((level) => (
          <span
            key={level}
            className="size-4 rounded"
            style={{ background: likertColor(level) }}
            aria-hidden="true"
          />
        ))}
        <span>5 Muy suficiente</span>
      </div>
    </div>
  )
}

export function SizeCompetenceQuestionChart({
  cells,
  sizes,
  competences,
  sizeLabel,
  storageKey,
}: {
  cells: SizeCompetenceCell[]
  sizes: string[]
  competences: DashboardCompetence[]
  sizeLabel: (size: string) => string
  storageKey?: string
}) {
  const variants = ['heatmap', 'table'] as const
  const [variant, setVariant] = useChartVariant(storageKey, 'heatmap', variants)
  const labels = { heatmap: 'Mapa de calor', table: 'Tabla' } as const
  return (
    <div className="space-y-3">
      <ChartVariantSelector
        value={variant}
        options={variants}
        labels={labels}
        onChange={setVariant}
      />
      {variant === 'table' ? (
        <SizeCompetenceTable
          cells={cells}
          sizes={sizes}
          competences={competences}
          sizeLabel={sizeLabel}
        />
      ) : (
        <SizeCompetenceHeatmap
          cells={cells}
          sizes={sizes}
          competences={competences}
          sizeLabel={sizeLabel}
        />
      )}
    </div>
  )
}

function SizeCompetenceTable({
  cells,
  sizes,
  competences,
  sizeLabel,
}: {
  cells: SizeCompetenceCell[]
  sizes: string[]
  competences: DashboardCompetence[]
  sizeLabel: (size: string) => string
}) {
  const byKey = new Map(cells.map((cell) => [`${cell.size}|${cell.code}`, cell]))
  const rows = competences.filter((item) =>
    sizes.some(
      (size) =>
        byKey.get(`${size}|${item.code}`)?.average !== null &&
        byKey.get(`${size}|${item.code}`)?.average !== undefined,
    ),
  )
  if (!rows.length) return <EmptyChart text="Sin valoraciones por tamaño." />
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-line text-xs text-ink-600">
            <th className="p-2 text-left">Competencia</th>
            {sizes.map((size) => (
              <th key={size} className="p-2 text-right">
                {sizeLabel(size)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.code} className="border-b border-surface-container-high">
              <td className="p-2 text-ink-900">{competenceLabel(item.code, item.name)}</td>
              {sizes.map((size) => {
                const cell = byKey.get(`${size}|${item.code}`)
                return (
                  <td key={size} className="p-2 text-right tabular-nums">
                    {cell?.average == null ? '—' : formatDecimal(cell.average, 2)}
                    {cell?.answered ? (
                      <span className="ml-1 text-xs text-ink-500">
                        ({formatCount(cell.answered)})
                      </span>
                    ) : null}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
