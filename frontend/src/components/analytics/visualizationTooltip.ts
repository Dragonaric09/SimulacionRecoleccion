export type DistributionTooltipDatum = {
  kind: 'bar' | 'column' | 'stacked' | 'donut'
  label: string
  count: number
  total: number
  percent?: number
}

export type HeatmapTooltipDatum = {
  kind: 'heatmap'
  row: string
  column: string | number
  count: number
  total: number
}

export type ScatterTooltipDatum = {
  kind: 'scatter'
  label: string
  xLabel: string
  xValue: string | number
  yLabel: string
  yValue: string | number
  note?: string
}

export type MeanTooltipDatum = {
  kind: 'mean'
  label: string
  value: number
  sampleSize?: number
}

export type VisualizationTooltipDatum =
  DistributionTooltipDatum | HeatmapTooltipDatum | ScatterTooltipDatum | MeanTooltipDatum

export function formatDistributionTooltip(
  datum: Pick<DistributionTooltipDatum, 'count' | 'total'>,
  percent = datum.total ? (datum.count * 100) / datum.total : 0,
  kind?: DistributionTooltipDatum['kind'],
) {
  const representation =
    kind &&
    {
      bar: 'Longitud de la barra',
      column: 'Altura de la columna',
      stacked: 'Ancho del segmento',
      donut: 'Arco de la dona',
    }[kind]
  return `${datum.count} de ${datum.total} respuestas (${formatTooltipPercent(percent)})${representation ? ` · ${representation}: ${formatTooltipPercent(percent)} de n` : ''}`
}

export function formatTooltipPercent(value: number) {
  return `${value.toFixed(1).replace('.', ',')} %`
}

export function formatMeanTooltip(datum: Omit<MeanTooltipDatum, 'kind'>) {
  return `Media: ${formatMeanValue(datum.value)} de 5${datum.sampleSize === undefined ? '' : ` · n = ${datum.sampleSize}`} · Longitud de la barra: valor medio en la escala de 1 a 5`
}

export function formatMeanValue(value: number) {
  return value.toFixed(2).replace('.', ',')
}
