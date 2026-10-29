import ReactEChartsCore from 'echarts-for-react/lib/core'
import * as echarts from 'echarts/core'
import { BarChart, CustomChart, ScatterChart } from 'echarts/charts'
import { GridComponent, LegendComponent, MarkAreaComponent, MarkLineComponent, TooltipComponent } from 'echarts/components'
import { SVGRenderer } from 'echarts/renderers'
import type { ComposeOption } from 'echarts/core'
import type { BarSeriesOption, CustomSeriesOption, ScatterSeriesOption } from 'echarts/charts'
import type {
  GridComponentOption,
  LegendComponentOption,
  MarkAreaComponentOption,
  MarkLineComponentOption,
  TooltipComponentOption,
} from 'echarts/components'
import { responsiveLabelWidth, useChartContainerWidth } from '@/components/analytics/charts/useChartContainerSize'
import {
  EMPLEADORES_COLOR,
  NEUTRAL_COLOR,
  SIGNIFICANT_COLOR,
  TITULADOS_COLOR,
  decimal,
  effectSize,
  pValue,
  signed,
  type ComparisonCompetence,
} from './comparisonTypes'

echarts.use([
  BarChart,
  CustomChart,
  ScatterChart,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TooltipComponent,
  SVGRenderer,
])

type ChartOption = ComposeOption<
  | BarSeriesOption
  | CustomSeriesOption
  | ScatterSeriesOption
  | GridComponentOption
  | LegendComponentOption
  | MarkAreaComponentOption
  | MarkLineComponentOption
  | TooltipComponentOption
>

type AreaEdge = {
  yAxis: string
  name?: string
  itemStyle?: { color: string }
  label?: { show: boolean; position: 'insideTopRight'; color: string; fontSize: number; fontWeight: number }
}

const AXIS_TEXT = '#475569'
const GRID_LINE = '#E2E8F0'

/** Técnicas primero y después transversales, en el orden del catálogo. */
function ordered(items: ComparisonCompetence[]) {
  return [...items.filter((item) => item.group === 'HARD_SKILL'), ...items.filter((item) => item.group === 'SOFT_SKILL')]
}

/** Detalle común de una competencia para los tooltips (cursor o toque). */
function tooltipHtml(item: ComparisonCompetence) {
  const result = !item.prueba.aplicable
    ? `No aplicable: ${item.prueba.motivo}`
    : item.prueba.significativa
      ? 'Difieren (p ajustado &lt; α)'
      : 'Sin diferencia significativa'
  return [
    `<strong>${item.name}</strong>`,
    `<span style="color:${TITULADOS_COLOR}">●</span> Titulados: ${decimal(item.titulados.media)} (n = ${item.titulados.n})`,
    `<span style="color:${EMPLEADORES_COLOR}">●</span> Empleadores: ${decimal(item.empleadores.media)} (n = ${item.empleadores.n})`,
    `Δ medias (E − T): <strong>${signed(item.diferenciaMedias)}</strong>`,
    item.prueba.aplicable
      ? `p ajustado: ${pValue(item.prueba.pAjustado)} · efecto r = ${decimal(item.prueba.rBiserial)} (${effectSize(item.prueba.rBiserial)})`
      : '',
    result,
  ]
    .filter(Boolean)
    .join('<br/>')
}

const tooltipBase: TooltipComponentOption = {
  // El disparador por defecto incluye «click»: en pantallas táctiles el detalle se abre al tocar la fila.
  confine: true,
  backgroundColor: '#FFFFFF',
  borderColor: '#CBD5E1',
  textStyle: { color: '#0F172A', fontSize: 12 },
  extraCssText: 'box-shadow: 0 4px 12px rgb(15 23 42 / 12%); border-radius: 8px; max-width: 280px; white-space: normal;',
}

/** Zonas sombreadas que separan competencias técnicas y transversales en un eje de categorías. */
function groupAreas(items: ComparisonCompetence[]): [AreaEdge, AreaEdge][] {
  const names = (group: ComparisonCompetence['group']) => items.filter((item) => item.group === group).map((item) => item.name)
  const hard = names('HARD_SKILL')
  const soft = names('SOFT_SKILL')
  const area = (list: string[], label: string, color: string): [AreaEdge, AreaEdge][] =>
    list.length === 0
      ? []
      : [[
          { yAxis: list[0], name: label, itemStyle: { color }, label: { show: true, position: 'insideTopRight', color: AXIS_TEXT, fontSize: 10, fontWeight: 600 } },
          { yAxis: list[list.length - 1] },
        ]]
  return [...area(hard, 'TÉCNICAS', 'rgba(241, 245, 249, 0.6)'), ...area(soft, 'TRANSVERSALES', 'rgba(225, 244, 242, 0.45)')]
}

/**
 * Medias de titulados (autopercepción) y empleadores (nivel observado) en la misma escala 1–5. El segmento entre
 * ambos puntos es la brecha; las competencias con diferencia significativa llevan la etiqueta resaltada.
 */
export function MeansDumbbellChart({ items }: { items: ComparisonCompetence[] }) {
  const { ref, width } = useChartContainerWidth()
  const rows = ordered(items)
  const labelWidth = responsiveLabelWidth(width, 210, 96)
  const height = Math.max(240, rows.length * 34 + 84)
  const option: ChartOption = {
    animationDuration: 300,
    grid: { left: 8, right: 20, top: 36, bottom: 30, containLabel: true },
    legend: {
      top: 0,
      left: 0,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: AXIS_TEXT, fontSize: 12 },
      data: ['Titulados (autopercepción)', 'Empleadores (nivel observado)'],
    },
    tooltip: {
      ...tooltipBase,
      trigger: 'axis',
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(148, 163, 184, 0.12)' } },
      formatter: (params) => {
        const first = Array.isArray(params) ? params[0] : params
        const item = rows[first?.dataIndex ?? 0]
        return item ? tooltipHtml(item) : ''
      },
    },
    xAxis: {
      type: 'value',
      min: 1,
      max: 5,
      interval: 1,
      axisLabel: {
        color: AXIS_TEXT,
        fontSize: 11,
        formatter: (value: number) => (value === 1 ? '1\nMuy insuf.' : value === 5 ? '5\nMuy suf.' : String(value)),
      },
      splitLine: { lineStyle: { color: GRID_LINE } },
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: rows.map((item) => item.name),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: {
        width: labelWidth,
        overflow: 'break',
        lineHeight: 14,
        fontSize: 12,
        formatter: (name: string) => {
          const item = rows.find((row) => row.name === name)
          return item?.prueba.significativa ? `{sig|${name} ◆}` : `{base|${name}}`
        },
        rich: {
          base: { color: '#0F172A', fontSize: 12, lineHeight: 14 },
          sig: { color: SIGNIFICANT_COLOR, fontSize: 12, fontWeight: 600, lineHeight: 14 },
        },
      },
    },
    series: [
      {
        name: 'Brecha',
        type: 'custom',
        silent: true,
        encode: { x: [1, 2], y: 0 },
        data: rows.map((item, index) => [index, item.titulados.media ?? NaN, item.empleadores.media ?? NaN]),
        renderItem: (_params, api) => {
          const t = Number(api.value(1))
          const e = Number(api.value(2))
          if (!Number.isFinite(t) || !Number.isFinite(e)) return null
          const start = api.coord([t, api.value(0)])
          const end = api.coord([e, api.value(0)])
          return {
            type: 'line',
            shape: { x1: start[0], y1: start[1], x2: end[0], y2: end[1] },
            style: { stroke: '#94A3B8', lineWidth: 3, opacity: 0.7 },
          }
        },
        markArea: { silent: true, data: groupAreas(rows) },
        z: 1,
      },
      {
        name: 'Titulados (autopercepción)',
        type: 'scatter',
        symbolSize: 12,
        itemStyle: { color: TITULADOS_COLOR, borderColor: '#FFFFFF', borderWidth: 2 },
        data: rows.map((item) => item.titulados.media),
        z: 3,
      },
      {
        name: 'Empleadores (nivel observado)',
        type: 'scatter',
        symbolSize: 12,
        itemStyle: { color: EMPLEADORES_COLOR, borderColor: '#FFFFFF', borderWidth: 2 },
        data: rows.map((item) => item.empleadores.media),
        z: 3,
      },
    ],
  }
  return (
    <div ref={ref} className="w-full min-w-0">
      <ReactEChartsCore echarts={echarts} option={option} style={{ height, width: '100%' }} opts={{ renderer: 'svg' }} notMerge lazyUpdate />
    </div>
  )
}

/**
 * Brecha de medias (empleadores − titulados) por competencia, de la más negativa a la más positiva. El color
 * distingue las diferencias significativas tras el ajuste de Holm; las no aplicables van en gris claro.
 */
export function GapBarsChart({ items }: { items: ComparisonCompetence[] }) {
  const { ref, width } = useChartContainerWidth()
  const rows = [...items]
    .filter((item) => item.diferenciaMedias != null)
    .sort((a, b) => (a.diferenciaMedias ?? 0) - (b.diferenciaMedias ?? 0))
  const limit = Math.max(0.5, ...rows.map((item) => Math.abs(item.diferenciaMedias ?? 0)))
  const bound = Math.ceil(limit * 2) / 2
  const labelWidth = responsiveLabelWidth(width, 210, 96)
  const height = Math.max(220, rows.length * 30 + 70)
  const colorFor = (item: ComparisonCompetence) =>
    !item.prueba.aplicable ? '#CBD5E1' : item.prueba.significativa ? SIGNIFICANT_COLOR : NEUTRAL_COLOR
  const option: ChartOption = {
    animationDuration: 300,
    grid: { left: 8, right: 44, top: 10, bottom: 30, containLabel: true },
    tooltip: {
      ...tooltipBase,
      trigger: 'item',
      formatter: (params) => {
        const single = Array.isArray(params) ? params[0] : params
        const item = rows[single?.dataIndex ?? 0]
        return item ? tooltipHtml(item) : ''
      },
    },
    xAxis: {
      type: 'value',
      min: -bound,
      max: bound,
      axisLabel: { color: AXIS_TEXT, fontSize: 11, formatter: (value: number) => signed(value) },
      splitLine: { lineStyle: { color: GRID_LINE } },
    },
    yAxis: {
      type: 'category',
      data: rows.map((item) => item.name),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: '#0F172A', fontSize: 12, width: labelWidth, overflow: 'break', lineHeight: 14 },
    },
    series: [
      {
        type: 'bar',
        barWidth: 14,
        data: rows.map((item) => ({ value: item.diferenciaMedias, itemStyle: { color: colorFor(item), borderRadius: 3 } })),
        label: {
          show: true,
          position: 'right',
          color: AXIS_TEXT,
          fontSize: 11,
          formatter: (params) => signed(Number(params.value)),
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#475569', type: 'solid', width: 1 },
          label: { show: false },
          data: [{ xAxis: 0 }],
        },
      },
    ],
  }
  return (
    <div ref={ref} className="w-full min-w-0 space-y-2">
      <ReactEChartsCore echarts={echarts} option={option} style={{ height, width: '100%' }} opts={{ renderer: 'svg' }} notMerge lazyUpdate />
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
        <LegendSwatch color={SIGNIFICANT_COLOR} label="Diferencia significativa (Holm)" />
        <LegendSwatch color={NEUTRAL_COLOR} label="Sin diferencia significativa" />
        <LegendSwatch color="#CBD5E1" label="Prueba no aplicable (muestra pequeña)" />
      </div>
    </div>
  )
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  )
}
