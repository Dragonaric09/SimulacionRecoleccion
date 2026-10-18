export type DistributionChartItem = {
  label: string
  count: number
  percent: number
  total?: number
}

export type MeanChartItem = {
  label: string
  value: number
  sampleSize?: number
}

export type ChartRenderMode = 'screen' | 'print'
