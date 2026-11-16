import { useEffect, useMemo, useState } from 'react'
import { apiRequest } from '@/api/client'
import { DownloadMenu } from '@/components/analytics/DownloadMenu'
import { StatusPanel } from '@/components/analytics/StatusPanel'
import { TapTooltip } from '@/components/analytics/TapTooltip'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePersistentState } from '@/lib/usePersistentState'
import { downloadAnalyticsCsv } from '../shared/analyticsExport'

type CategoricalVariable = { key: string; label: string; group: string; level: string }
type NumericVariable = { key: string; label: string; unit: string; description: string }
type Summary = {
  n: number
  m: number
  coverage: number | null
  mean: number | null
  median: number | null
  standardDeviation: number | null
  min: number | null
  max: number | null
  state: 'SIN_OBSERVACIONES' | 'SIN_MEDIDA' | 'UNA_MEDIDA' | 'COMPLETO'
}
type Exploratory = {
  status: 'OK' | 'PREGUNTA_AUSENTE' | 'BASE_VACIA'
  config: { rowLabel: string; columnLabel: string; valueLabel: string; unit: string }
  bases: { totalResponses: number; filteredResponses: number; nXY: number; nZ: number; exclusions: { reason: string; count: number }[] }
  rowCategories: string[]
  columnCategories: string[]
  cells: { row: string; column: string; summary: Summary }[]
  global: Summary
  warnings: string[]
}

/** Casos E1 y E2 del informe de la Actividad 2 (secciones 6.13 y 6.14). */
const PRESETS = [
  { id: 'E1', section: '6.13', label: 'Estado laboral × interés en posgrado, según años de vida profesional', row: 'situacion_laboral_actual', column: 'interes_posgrado', value: 'anios_vida_profesional' },
  { id: 'E2', section: '6.14', label: 'Área de interés × financiamiento cursado, según años de vida profesional', row: 'area_posgrado_interes', column: 'financiamiento_posgrado_cursado', value: 'anios_vida_profesional' },
]

/** Mínimo de personas con valor numérico para comparar medias entre grupos en el texto del informe. */
const MIN_GROUP = 10

const STATE_TEXT: Record<Summary['state'], string> = {
  SIN_OBSERVACIONES: 'Sin observaciones: nadie del filtro tiene esta combinación.',
  SIN_MEDIDA: 'Hay personas en el grupo, pero ninguna con un valor numérico válido.',
  UNA_MEDIDA: 'Un solo valor: hay media, pero no desviación estándar muestral.',
  COMPLETO: 'Resumen completo.',
}

const decimal = (value: number | null, digits = 2) =>
  value == null ? '—' : value.toLocaleString('es-BO', { minimumFractionDigits: digits, maximumFractionDigits: digits })
const percent = (value: number | null) => (value == null ? '—' : `${decimal(value, 1)} %`)

/** Párrafo descriptivo listo para pegar en el informe, con los datos de la tabla actual. */
function buildReportText(result: Exploratory, preset?: (typeof PRESETS)[number]) {
  const { config, bases, cells, global } = result
  const unit = config.unit
  const ident = preset ? `Caso ${preset.id} del informe (sección ${preset.section})` : 'Análisis multivariable'
  const lines = [
    `${ident}: ${config.rowLabel} × ${config.columnLabel}, según ${config.valueLabel.toLowerCase()} (${unit}).`,
    `Base: ${bases.nXY} personas con respuesta válida en ambas variables y ${bases.nZ} con valor numérico.`,
  ]
  const eligible = cells.filter((cell) => cell.summary.m >= MIN_GROUP && cell.summary.mean != null)
  if (eligible.length >= 2) {
    const sorted = [...eligible].sort((a, b) => (b.summary.mean ?? 0) - (a.summary.mean ?? 0))
    const high = sorted[0]
    const low = sorted[sorted.length - 1]
    lines.push(
      `Entre los grupos con al menos ${MIN_GROUP} personas con valor numérico, la media más alta es «${high.row} · ${high.column}» ` +
        `(${decimal(high.summary.mean)} ${unit}; m = ${high.summary.m}) y la más baja «${low.row} · ${low.column}» ` +
        `(${decimal(low.summary.mean)} ${unit}; m = ${low.summary.m}).`,
    )
  } else {
    lines.push(`Ningún grupo alcanza ${MIN_GROUP} personas con valor numérico en un número suficiente para comparar medias.`)
  }
  if (global.mean != null) {
    lines.push(`Media total: ${decimal(global.mean)} ${unit} (mediana ${decimal(global.median)}; m = ${global.m}).`)
  }
  lines.push('Es descriptivo: muestra diferencias en quienes respondieron, sin valor p. Para afirmar una asociación, contrástala con un cruce de dos variables.')
  return lines.join(' ')
}

/**
 * Análisis multivariable (método prioritario): dos variables categóricas y el resumen de una numérica en cada
 * combinación. Describe a quienes respondieron: no tiene valor p ni prueba de asociación.
 */
export function ExploratoryView({ datasetId, filterQuery }: { datasetId?: string; filterQuery: string }) {
  const [catalog, setCatalog] = useState<{ categorical: CategoricalVariable[]; numeric: NumericVariable[] } | null>(null)
  const [rowField, setRowField] = usePersistentState('simulacionem.exploratory.row', PRESETS[0].row, isText)
  const [columnField, setColumnField] = usePersistentState('simulacionem.exploratory.column', PRESETS[0].column, isText)
  const [valueField, setValueField] = usePersistentState('simulacionem.exploratory.value', PRESETS[0].value, isText)
  const [result, setResult] = useState<Exploratory | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const activePreset = PRESETS.find((preset) => preset.row === rowField && preset.column === columnField && preset.value === valueField)

  useEffect(() => {
    const controller = new AbortController()
    apiRequest<{ categorical: CategoricalVariable[]; numeric: NumericVariable[] }>('/analytics/titulados/exploratory/catalog', {
      signal: controller.signal,
    })
      .then(setCatalog)
      .catch((cause) => !controller.signal.aborted && setError(cause instanceof Error ? cause.message : String(cause)))
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!datasetId || rowField === columnField) return
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    const query = new URLSearchParams({ datasetId, rowField, columnField, valueField }).toString()
    apiRequest<Exploratory>(`/analytics/titulados/exploratory?${query}${filterQuery}`, { signal: controller.signal })
      .then((next) => !controller.signal.aborted && setResult(next))
      .catch((cause) => !controller.signal.aborted && setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => !controller.signal.aborted && setLoading(false))
    return () => controller.abort()
  }, [datasetId, rowField, columnField, valueField, filterQuery])

  const groups = useMemo(() => {
    const byGroup = new Map<string, CategoricalVariable[]>()
    catalog?.categorical.forEach((variable) => byGroup.set(variable.group, [...(byGroup.get(variable.group) ?? []), variable]))
    return [...byGroup.entries()]
  }, [catalog])
  const unit = result?.config.unit ?? 'años'
  const means = result?.cells.map((cell) => cell.summary.mean).filter((v): v is number => v != null) ?? []
  const low = Math.min(...means)
  const high = Math.max(...means)
  // Escala de color común a todas las celdas; las medias nulas van en gris neutro.
  const shade = (mean: number | null) => {
    if (mean == null) return undefined
    const t = high > low ? (mean - low) / (high - low) : 0.5
    return `rgba(31,111,181,${0.08 + t * 0.55})`
  }
  const cellOf = (row: string, column: string) => result?.cells.find((cell) => cell.row === row && cell.column === column)?.summary

  const reportText = result && result.status === 'OK' ? buildReportText(result, activePreset) : ''
  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const exportCsv = () => {
    if (!result) return
    const rows = result.cells.map((cell) => [
      cell.row, cell.column, cell.summary.n, cell.summary.m, cell.summary.coverage, cell.summary.mean, cell.summary.median,
      cell.summary.standardDeviation, cell.summary.min, cell.summary.max, cell.summary.state,
    ])
    const g = result.global
    rows.push(['Total (personas)', '', g.n, g.m, g.coverage, g.mean, g.median, g.standardDeviation, g.min, g.max, g.state])
    downloadAnalyticsCsv(`multivariable-${result.config.rowLabel}-${result.config.columnLabel}`,
      [result.config.rowLabel, result.config.columnLabel, 'n', 'm', 'Cobertura (%)', `Media (${unit})`, `Mediana (${unit})`,
        `Desviación estándar (${unit})`, `Mínimo (${unit})`, `Máximo (${unit})`, 'Estado'], rows)
  }

  const select = (value: string, onChange: (next: string) => void, disabledKey: string, label: string) => (
    <label className="label-default grid min-w-0 gap-1">
      {label}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full min-w-0"><SelectValue /></SelectTrigger>
        <SelectContent>
          {groups.map(([group, variables]) => (
            <SelectGroup key={group}>
              <SelectLabel className="px-2 pt-2 pb-1 text-[11px] font-bold tracking-wider text-ink-600 uppercase">{group}</SelectLabel>
              {variables.map((variable) => (
                <SelectItem key={variable.key} value={variable.key} disabled={variable.key === disabledKey}>{variable.label}</SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    </label>
  )

  return (
    <div className="space-y-4">
      <Card className="rounded-xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="title-card flex flex-wrap items-center gap-2">
            Análisis multivariable
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-primary uppercase">Prioritario</span>
          </CardTitle>
          <CardDescription>
            Tres variables a la vez: dos categorías (filas y columnas) y una medida numérica resumida dentro de cada combinación.
            Describe a quienes respondieron: no es una prueba de hipótesis ni tiene valor p.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="caption-bold text-ink-600">CASOS DEL INFORME DE LA ACTIVIDAD 2</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((preset) => (
              <Button key={preset.id} type="button" variant="outline" size="sm" className="h-auto min-h-7 px-2 py-1 text-left text-xs"
                onClick={() => { setRowField(preset.row); setColumnField(preset.column); setValueField(preset.value) }}>
                <span className="font-semibold">{preset.id}</span>&nbsp;· {preset.label}
              </Button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {select(rowField, setRowField, columnField, 'Filas (X)')}
            {select(columnField, setColumnField, rowField, 'Columnas (Y)')}
            <label className="label-default grid min-w-0 gap-1">
              Medida numérica (Z)
              <Select value={valueField} onValueChange={setValueField}>
                <SelectTrigger className="w-full min-w-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {catalog?.numeric.map((measure) => <SelectItem key={measure.key} value={measure.key}>{measure.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </label>
          </div>
          <p className="text-xs text-ink-600">
            {catalog?.numeric.find((measure) => measure.key === valueField)?.description} Las escalas ordinales y los rangos salariales no se promedian.
          </p>
        </CardContent>
      </Card>

      {loading && <StatusPanel kind="loading" title="Calculando" description="Agrupando las respuestas y resumiendo la medida numérica." />}
      {error && <StatusPanel kind="warning" title="No se pudo calcular el análisis exploratorio" description={error} />}
      {result && result.status !== 'OK' && (
        <StatusPanel kind="warning" title={result.status === 'PREGUNTA_AUSENTE' ? 'Falta una pregunta en el archivo' : 'Base vacía'}
          description={result.warnings.join(' ')} />
      )}

      {result && result.status === 'OK' && (
        <>
          <Card className="rounded-xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="title-card">Texto para el informe</CardTitle>
              <CardDescription>
                Resumen con los datos de esta tabla. Cópialo en la sección del informe que corresponda y revisa las cifras antes de entregar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="rounded-lg bg-surface-container-low p-3 text-sm leading-relaxed text-ink-900">{reportText}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" size="sm" onClick={copyReport}>{copied ? 'Texto copiado' : 'Copiar texto'}</Button>
                {activePreset && (
                  <span className="text-xs text-ink-600">Corresponde al caso {activePreset.id}, sección {activePreset.section} del informe.</span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="title-card">Media de {result.config.valueLabel.toLowerCase()} por grupo</CardTitle>
                  <CardDescription>
                    {result.config.rowLabel} × {result.config.columnLabel} · N<sub>XY</sub> = {result.bases.nXY} · N<sub>Z</sub> = {result.bases.nZ} · en {unit}
                  </CardDescription>
                </div>
                <DownloadMenu title={`Análisis multivariable ${result.config.rowLabel} × ${result.config.columnLabel}`}
                  options={[{ label: 'Tabla CSV', help: 'Conteos y medidas por grupo, sin redondear', onSelect: exportCsv }]} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-w-full overflow-x-auto rounded-lg border border-border-line">
                <table className="w-full border-separate border-spacing-0 text-sm">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-10 border-b border-border-line bg-surface-container-low p-2 text-left text-xs font-semibold">{result.config.rowLabel}</th>
                      {result.columnCategories.map((column) => (
                        <th key={column} className="border-b border-border-line bg-surface-container-low p-2 text-center text-xs font-semibold">{column}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rowCategories.map((row) => (
                      <tr key={row}>
                        <th className="sticky left-0 z-10 border-b border-border-line bg-white p-2 text-left font-medium">
                          <div className="w-40 whitespace-normal sm:w-52">{row}</div>
                        </th>
                        {result.columnCategories.map((column) => {
                          const s = cellOf(row, column)
                          if (!s) return <td key={column} className="border-b border-border-line" />
                          return (
                            <td key={column} className="border-b border-border-line p-0 text-center" style={{ backgroundColor: shade(s.mean) }}>
                              <TapTooltip content={
                                <div className="grid gap-0.5 text-xs">
                                  <strong>{row} · {column}</strong>
                                  <span>n = {s.n} · m = {s.m} · cobertura {percent(s.coverage)}</span>
                                  <span>Media {decimal(s.mean)} · mediana {decimal(s.median)} · s {decimal(s.standardDeviation)}</span>
                                  <span>Mín. {decimal(s.min)} · máx. {decimal(s.max)} {unit}</span>
                                  <span className="text-ink-600">{STATE_TEXT[s.state]}</span>
                                </div>
                              }>
                                <span tabIndex={0} className="block cursor-help px-2 py-2 outline-none">
                                  <span className={`block text-base font-semibold tabular-nums ${s.mean == null ? 'text-ink-400' : 'text-ink-900'}`}>{decimal(s.mean)}</span>
                                  <span className="block text-[11px] text-ink-600 tabular-nums">m {s.m} de n {s.n}</span>
                                </span>
                              </TapTooltip>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-ink-600">
                El color compara medias con una escala común; el gris indica que no hay media. Mira siempre m: un grupo con pocos datos puede cambiar mucho con una sola respuesta.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="title-card">Resumen por grupo</CardTitle>
              <CardDescription>n = personas del grupo; m = con valor numérico válido. El total se calcula con las personas, no promediando las filas.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="bg-surface-container-low text-xs text-ink-700">
                    <th className="p-2 text-left">{result.config.rowLabel}</th>
                    <th className="p-2 text-left">{result.config.columnLabel}</th>
                    {['n', 'm', 'Cobertura', 'Media', 'Mediana', 's', 'Mín.', 'Máx.'].map((h) => <th key={h} className="p-2 text-right">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {[...result.cells.map((cell) => ({ key: `${cell.row}|${cell.column}`, a: cell.row, b: cell.column, s: cell.summary, total: false })),
                    { key: 'total', a: 'Total (personas)', b: '', s: result.global, total: true }].map(({ key, a, b, s, total }) => (
                    <tr key={key} className={total ? 'border-t-2 border-border-line font-semibold' : 'border-t border-border-line'}>
                      <td className="p-2">{a}</td>
                      <td className="p-2">{b}</td>
                      <td className="p-2 text-right tabular-nums">{s.n}</td>
                      <td className="p-2 text-right tabular-nums">{s.m}</td>
                      <td className="p-2 text-right tabular-nums">{percent(s.coverage)}</td>
                      <td className="p-2 text-right tabular-nums">{decimal(s.mean)}</td>
                      <td className="p-2 text-right tabular-nums">{decimal(s.median)}</td>
                      <td className="p-2 text-right tabular-nums" title={s.state === 'UNA_MEDIDA' ? STATE_TEXT.UNA_MEDIDA : undefined}>{decimal(s.standardDeviation)}</td>
                      <td className="p-2 text-right tabular-nums">{decimal(s.min)}</td>
                      <td className="p-2 text-right tabular-nums">{decimal(s.max)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.bases.exclusions.length > 0 && (
                <div className="mt-3 space-y-1 text-xs text-ink-600">
                  <p className="font-semibold text-ink-700">Personas que no entran en la tabla o no aportan {result.config.valueLabel.toLowerCase()}</p>
                  <ul className="list-disc pl-5">
                    {result.bases.exclusions.map((exclusion) => <li key={exclusion.reason}>{exclusion.reason}: {exclusion.count}</li>)}
                  </ul>
                </div>
              )}
              {result.warnings.map((warning) => <p key={warning} className="mt-2 text-xs text-amber-800">{warning}</p>)}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

const isText = (value: unknown): value is string => typeof value === 'string' && value.length > 0
