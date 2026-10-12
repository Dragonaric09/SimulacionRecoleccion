import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { contrastTextColor } from '@/lib/utils'
import { SUFFICIENCY_SCALE } from '../instrumento'
import { competenceLabel } from './labels'
import { formatCount, formatDecimal, formatPercent } from './dashboardFormat'
import { AXIS_TEXT, GRID, likertColor } from './chartTheme'
import { EmptyChart } from './DashboardCharts'
import type { DashboardCompetence, SizeCompetenceCell } from './dashboardTypes'

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
    SUFFICIENCY_SCALE.map((level, index) => [LEVEL_KEYS[index], { label: level.label, color: level.color }]),
  ) as ChartConfig
  return (
    <ChartContainer config={config} className="w-full" style={{ height: rows.length * 34 + 56 }}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" width={170} tickLine={false} axisLine={false} interval={0} tick={AXIS_TICK} />
        <ChartTooltip
          cursor={{ fill: '#F1F5F9' }}
          content={<ChartTooltipContent labelFormatter={(value) => String(value)} formatter={(value, name, item) => {
            const index = LEVEL_KEYS.indexOf(name as (typeof LEVEL_KEYS)[number])
            return `${formatPercent(Number(value))} · ${formatCount(Number(item.payload[`n${index + 1}`]))}`
          }} />}
        />
        {LEVEL_KEYS.map((key, index) => (
          <Bar key={key} dataKey={key} stackId="levels" fill={SUFFICIENCY_SCALE[index].color} barSize={18} />
        ))}
      </BarChart>
    </ChartContainer>
  )
}

/** Leyenda de la escala 1 a 5 usada en CompetenceLevelBars. */
export function LevelLegend() {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600" aria-label="Escala de suficiencia">
      {SUFFICIENCY_SCALE.map((level) => (
        <li key={level.level} className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-slate-200" style={{ background: level.color }} aria-hidden="true" />
          {level.level} {level.label}
        </li>
      ))}
    </ul>
  )
}

/** Media de cada competencia (escala 1 a 5), ordenada de mayor a menor. */
export function CompetenceMeanBars({ competences }: { competences: DashboardCompetence[] }) {
  const rows = competences
    .filter((item) => item.average !== null)
    .map((item) => ({ label: competenceLabel(item.code, item.name), average: item.average as number, answered: item.answered }))
    .sort((a, b) => b.average - a.average)
  if (rows.length === 0) return <EmptyChart text="Sin valoraciones de competencias." />
  const config = { average: { label: 'Media (1 a 5)', color: '#14A39A' } } satisfies ChartConfig
  return (
    <ChartContainer config={config} className="w-full" style={{ height: rows.length * 32 + 24 }}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={AXIS_TICK} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" width={170} tickLine={false} axisLine={false} interval={0} tick={AXIS_TICK} />
        <ChartTooltip cursor={{ fill: '#F1F5F9' }} content={<ChartTooltipContent hideIndicator formatter={(value, _name, item) => `${formatDecimal(Number(value), 2)} · n = ${formatCount(item.payload.answered)}`} />} />
        <Bar dataKey="average" fill="#14A39A" radius={[0, 4, 4, 0]} barSize={16}>
          <LabelList dataKey="average" position="right" formatter={(value) => formatDecimal(Number(value), 2)} className="fill-ink-600 text-xs" />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

/** Mapa de calor tamaño × competencia: media de cada celda, con el número dentro. */
export function SizeCompetenceHeatmap({ cells, sizes, competences, sizeLabel }: {
  cells: SizeCompetenceCell[]
  sizes: string[]
  competences: DashboardCompetence[]
  sizeLabel: (size: string) => string
}) {
  const columns = competences.map((item) => ({ code: item.code, label: competenceLabel(item.code, item.name) }))
  const byKey = new Map(cells.map((cell) => [`${cell.size}|${cell.code}`, cell]))
  const rows = sizes.filter((size) => columns.some((column) => (byKey.get(`${size}|${column.code}`)?.answered ?? 0) > 0))
  if (rows.length === 0 || columns.length === 0) return <EmptyChart text="Sin valoraciones por tamaño." />
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-separate border-spacing-1 text-sm" aria-label="Media de competencias por tamaño de organización">
        <thead>
          <tr>
            <th scope="col" className="w-40 pb-2 text-left text-xs font-medium text-ink-600">Tamaño</th>
            {columns.map((column) => (
              <th key={column.code} scope="col" className="pb-2 text-center align-bottom text-xs font-medium text-ink-600">
                <span className="inline-block max-w-[84px] whitespace-normal leading-tight">{column.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((size) => (
            <tr key={size}>
              <th scope="row" className="pr-2 text-left align-middle text-xs font-medium text-ink-900">{sizeLabel(size)}</th>
              {columns.map((column) => {
                const cell = byKey.get(`${size}|${column.code}`)
                const average = cell?.average ?? null
                const background = average === null ? '#F8FAFC' : likertColor(average)
                return (
                  <td
                    key={column.code}
                    className="h-11 min-w-[56px] rounded-md text-center text-sm font-semibold tabular-nums"
                    style={{ background, color: average === null ? '#94A3B8' : contrastTextColor(background) }}
                    title={`${sizeLabel(size)} · ${column.label}: ${average === null ? 'sin valoraciones' : `media ${formatDecimal(average, 2)} (n = ${cell?.answered ?? 0})`}`}
                  >
                    {average === null ? '—' : formatDecimal(average, 1)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-600" aria-label="Escala de la media">
        <span>1 Muy insuficiente</span>
        {[1, 2, 3, 4, 5].map((level) => (
          <span key={level} className="size-4 rounded" style={{ background: likertColor(level) }} aria-hidden="true" />
        ))}
        <span>5 Muy suficiente</span>
      </div>
    </div>
  )
}
