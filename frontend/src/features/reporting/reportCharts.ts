import type { CategoryDistribution, AnalyticsSummaryData } from '@/features/analitica/api'

const palette = ['#0061a5', '#2e8bba', '#62a6c9', '#8bc2d8', '#b2d8e5', '#d3e8ef']
const svgFontFamily = 'Roboto, Arial, sans-serif'

const formatDecimal = (value: number) => new Intl.NumberFormat('es-BO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)
const formatInteger = (value: number) => new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 }).format(value)

function escapeXml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function shorten(value: string, max = 28) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

export function buildDistributionSvg(distribution: CategoryDistribution, width = 720, rowHeight = 28, hideEmptyOptions = false, labelFormatter: (value: string) => string = (value) => value) {
  const entries = Object.entries(distribution.counts).filter(([, count]) => !hideEmptyOptions || count > 0)
  const height = distributionSvgHeight(distribution, rowHeight, hideEmptyOptions)
  const max = Math.max(1, ...entries.map(([, count]) => count))
  const chartWidth = width - 260
  const body = entries.length === 0
    ? `<text x="18" y="32" font-family="${svgFontFamily}" font-size="14" fill="#52627a">Sin respuestas</text>`
    : entries.map(([label, count], index) => {
      const y = 28 + index * rowHeight
      const barWidth = Math.max(count > 0 ? 2 : 0, (count / max) * chartWidth)
      const percentage = distribution.percentages[label] ?? 0
      return `<text x="0" y="${y + 15}" font-family="${svgFontFamily}" font-size="12" fill="#172033">${escapeXml(shorten(labelFormatter(label)))}</text><rect x="250" y="${y + 3}" width="${barWidth.toFixed(1)}" height="16" rx="4" fill="${palette[index % palette.length]}"/><text x="${Math.min(width - 55, 255 + barWidth)}" y="${y + 15}" font-family="${svgFontFamily}" font-size="11" fill="#52627a">${formatInteger(count)} · ${formatDecimal(percentage)} %</text>`
    }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/>${body}</svg>`
}

export function distributionRowHeight(distribution: CategoryDistribution, hideEmptyOptions = false) {
  const entries = Object.entries(distribution.counts).filter(([, count]) => !hideEmptyOptions || count > 0)
  return entries.length > 15 ? 20 : 28
}

export function distributionSvgHeight(distribution: CategoryDistribution, rowHeight = 28, hideEmptyOptions = false) {
  const rows = Object.entries(distribution.counts).filter(([, count]) => !hideEmptyOptions || count > 0).length || 1
  return rows * rowHeight + 42
}

export function buildNumericKpiSvg(summary: AnalyticsSummaryData, field: string, width = 720, height = 110) {
  const average = summary.numericAverages[field]
  const median = summary.numericMedians[field]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect x="0" y="0" width="${width}" height="${height}" rx="12" fill="#eef6fb"/><text x="24" y="36" font-family="${svgFontFamily}" font-size="14" fill="#52627a">Media</text><text x="24" y="82" font-family="${svgFontFamily}" font-size="32" font-weight="700" fill="#0061a5">${average == null ? '-' : formatDecimal(average)}</text><text x="230" y="36" font-family="${svgFontFamily}" font-size="14" fill="#52627a">Mediana</text><text x="230" y="82" font-family="${svgFontFamily}" font-size="32" font-weight="700" fill="#0061a5">${median == null ? '-' : formatDecimal(median)}</text><text x="440" y="36" font-family="${svgFontFamily}" font-size="14" fill="#52627a">Base</text><text x="440" y="82" font-family="${svgFontFamily}" font-size="32" font-weight="700" fill="#0061a5">${formatInteger(summary.validResponses)}</text></svg>`
}
