import type { CategoryDistribution, AnalyticsSummaryData, ReportCompetence } from '@/features/analitica/api'
import { chartColor, reportChartPalette } from '@/features/analitica/shared/chartTheme'
import type { ReportChartVariant } from './reportTypes'
import type { ReportCohortPoint } from './reportTypes'
import type { ReportEmployerDashboard } from './reportTypes'
import type { ReportChartSpec } from './reportChartSpecs'

const svgFontFamily = 'Roboto, Arial, sans-serif'

const formatDecimal = (value: number) => new Intl.NumberFormat('es-BO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)
const formatInteger = (value: number) => new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 }).format(value)

function escapeXml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
}

function shorten(value: string, max = 28) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

export function buildDistributionSvg(distribution: CategoryDistribution, width = 720, rowHeight = 28, hideEmptyOptions = false, labelFormatter: (value: string) => string = (value) => value, accent = '#1f6fb5') {
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
      return `<text x="0" y="${y + 15}" font-family="${svgFontFamily}" font-size="12" fill="#172033">${escapeXml(shorten(labelFormatter(label)))}</text><rect x="250" y="${y + 3}" width="${barWidth.toFixed(1)}" height="16" rx="4" fill="${accent}"/><text x="${Math.min(width - 55, 255 + barWidth)}" y="${y + 15}" font-family="${svgFontFamily}" font-size="11" fill="#52627a">${formatInteger(count)} · ${formatDecimal(percentage)} %</text>`
    }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/>${body}</svg>`
}

/** Usa el tipo visual que emplean los módulos web: dona para pocas categorías y barras para listas largas. */
export function buildCategoricalSvg(distribution: CategoryDistribution, width = 720, rowHeight = 28, hideEmptyOptions = false, labelFormatter: (value: string) => string = (value) => value, variant: ReportChartVariant = 'ranked', accent = '#1f6fb5') {
  if (variant === 'stacked') return buildStackedSvg(distribution, width, labelFormatter, hideEmptyOptions)
  if (variant === 'columns') return buildColumnsSvg(distribution, width, labelFormatter, hideEmptyOptions, accent)
  if (variant === 'diverging') return buildDivergingSvg(distribution, width, labelFormatter, hideEmptyOptions)
  return variant === 'donut'
    ? buildDonutSvg(distribution, width, labelFormatter, hideEmptyOptions)
    : buildDistributionSvg(distribution, width, rowHeight, hideEmptyOptions, labelFormatter, accent)
}

/** Renderer único del PDF: la especificación visual no contiene layout web ni depende del DOM. */
export function buildReportChartSvg(spec: ReportChartSpec, width = 720) {
  switch (spec.type) {
    case 'categorical': return buildCategoricalSvg(spec.distribution, width, distributionRowHeight(spec.distribution, spec.hideEmptyOptions), spec.hideEmptyOptions, spec.labelFormatter, spec.variant, spec.accent)
    case 'numeric-kpi': return buildNumericKpiSvg(spec.summary, spec.field, width)
    case 'competence-mean': return buildCompetenceSvg(spec.items, width)
    case 'competence-heatmap': return buildCompetenceHeatmapSvg(spec.items, width, spec.employer)
    case 'competence-radar': return buildCompetenceRadarSvg(spec.items, width, spec.color)
    case 'cohort-scatter': return buildCohortScatterSvg(spec.points, width)
    case 'employer-timeline': return buildEmployerTimelineSvg(spec.dashboard, width)
    case 'employer-balance': return buildEmployerBalanceSvg(spec.rows, width)
    case 'employer-hiring-matrix': return buildEmployerHiringMatrixSvg(spec.rows, width)
    case 'employer-group-balance': return buildEmployerGroupBalanceSvg(spec.rows, width)
  }
}

export function categoricalSvgHeight(distribution: CategoryDistribution, rowHeight = 28, hideEmptyOptions = false, variant: ReportChartVariant = 'ranked') {
  const entries = Object.entries(distribution.counts).filter(([, count]) => !hideEmptyOptions || count > 0)
  if (entries.length > 0 && variant === 'donut') return 290
  if (variant === 'stacked') return Math.max(150, 130 + Math.ceil(entries.length / 3) * 28)
  if (variant === 'columns') return 250
  if (variant === 'diverging') return Math.max(90, entries.length * 30 + 30)
  return distributionSvgHeight(distribution, rowHeight, hideEmptyOptions)
}

function buildDonutSvg(distribution: CategoryDistribution, width: number, labelFormatter: (value: string) => string, hideEmptyOptions: boolean) {
  const entries = Object.entries(distribution.counts).filter(([, count]) => !hideEmptyOptions || count > 0)
  const total = entries.reduce((sum, [, count]) => sum + count, 0)
  const cx = 150
  const cy = 145
  const radius = 82
  const circumference = 2 * Math.PI * radius
  let offset = 0
  const rings = entries.map(([, count], index) => {
    const ratio = total === 0 ? 0 : count / total
    const length = ratio * circumference
    const ring = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${chartColor(index, reportChartPalette)}" stroke-width="34" stroke-dasharray="${length.toFixed(2)} ${(circumference - length).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"/>`
    offset += length
    return ring
  }).join('')
  const legend = entries.map(([label, count], index) => {
    const y = 42 + index * 42
    const percentage = distribution.percentages[label] ?? 0
    return `<rect x="330" y="${y - 13}" width="12" height="12" rx="2" fill="${chartColor(index, reportChartPalette)}"/><text x="350" y="${y - 2}" font-family="${svgFontFamily}" font-size="13" fill="#172033">${escapeXml(shorten(labelFormatter(label), 32))}</text><text x="350" y="${y + 17}" font-family="${svgFontFamily}" font-size="11" fill="#52627a">${formatInteger(count)} · ${formatDecimal(percentage)} %</text>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="290" viewBox="0 0 ${width} 290"><rect width="100%" height="100%" fill="#ffffff"/><circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#e8eef3" stroke-width="34"/>${rings}<circle cx="${cx}" cy="${cy}" r="54" fill="#ffffff"/><text x="${cx}" y="${cy - 4}" text-anchor="middle" font-family="${svgFontFamily}" font-size="25" font-weight="700" fill="#1f6fb5">${formatInteger(total)}</text><text x="${cx}" y="${cy + 17}" text-anchor="middle" font-family="${svgFontFamily}" font-size="11" fill="#52627a">respuestas</text>${legend}</svg>`
}

function buildStackedSvg(distribution: CategoryDistribution, width: number, labelFormatter: (value: string) => string, hideEmptyOptions: boolean) {
  const entries = Object.entries(distribution.counts).filter(([, count]) => !hideEmptyOptions || count > 0)
  const total = entries.reduce((sum, [, count]) => sum + count, 0)
  const barX = 24
  const barWidth = width - 48
  let offset = 0
  const segments = entries.map(([, count], index) => {
    const segmentWidth = total ? (count / total) * barWidth : 0
    const element = `<rect x="${barX + offset}" y="42" width="${segmentWidth.toFixed(1)}" height="34" fill="${chartColor(index, reportChartPalette)}"/><text x="${barX + offset + segmentWidth / 2}" y="64" text-anchor="middle" font-family="${svgFontFamily}" font-size="11" fill="#ffffff">${segmentWidth > 48 ? formatInteger(count) : ''}</text>`
    offset += segmentWidth
    return element
  }).join('')
  const legend = entries.map(([label, count], index) => `<text x="${barX + (index % 3) * 230}" y="${112 + Math.floor(index / 3) * 28}" font-family="${svgFontFamily}" font-size="11" fill="#172033">■ ${escapeXml(shorten(labelFormatter(label), 28))} · ${formatInteger(count)} (${formatDecimal(distribution.percentages[label] ?? 0)} %)</text>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.max(150, 130 + Math.ceil(entries.length / 3) * 28)}" viewBox="0 0 ${width} ${Math.max(150, 130 + Math.ceil(entries.length / 3) * 28)}"><rect width="100%" height="100%" fill="#ffffff"/><rect x="${barX}" y="42" width="${barWidth}" height="34" rx="5" fill="#e8eef3"/>${segments}${legend}</svg>`
}

function buildColumnsSvg(distribution: CategoryDistribution, width: number, labelFormatter: (value: string) => string, hideEmptyOptions: boolean, accent: string) {
  const entries = Object.entries(distribution.counts).filter(([, count]) => !hideEmptyOptions || count > 0)
  const height = 250
  const chartHeight = 170
  const max = Math.max(1, ...entries.map(([, count]) => count))
  const slot = (width - 48) / Math.max(entries.length, 1)
  const bars = entries.map(([label, count], index) => {
    const barHeight = (count / max) * chartHeight
    const x = 24 + index * slot + slot * 0.2
    return `<rect x="${x.toFixed(1)}" y="${(190 - barHeight).toFixed(1)}" width="${(slot * 0.6).toFixed(1)}" height="${barHeight.toFixed(1)}" rx="3" fill="${accent}"/><text x="${(x + slot * 0.3).toFixed(1)}" y="${(184 - barHeight).toFixed(1)}" text-anchor="middle" font-family="${svgFontFamily}" font-size="10" fill="#52627a">${formatInteger(count)}</text><text x="${(x + slot * 0.3).toFixed(1)}" y="214" text-anchor="middle" font-family="${svgFontFamily}" font-size="10" fill="#172033">${escapeXml(shorten(labelFormatter(label), 14))}</text>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/><line x1="24" y1="190" x2="${width - 24}" y2="190" stroke="#cbd5e1"/>${bars}</svg>`
}

function buildDivergingSvg(distribution: CategoryDistribution, width: number, labelFormatter: (value: string) => string, hideEmptyOptions: boolean) {
  const entries = Object.entries(distribution.counts).filter(([, count]) => !hideEmptyOptions || count > 0)
  const midpoint = Math.ceil(entries.length / 2)
  const rowHeight = 30
  const center = 360
  const max = Math.max(1, ...entries.map(([, count]) => count))
  const rows = entries.map(([label, count], index) => {
    const y = 28 + index * rowHeight
    const isNegative = index < midpoint
    const barWidth = (count / max) * 270
    const x = isNegative ? center - barWidth : center
    const color = isNegative ? (index === midpoint - 1 ? '#ed8d78' : '#c83b2b') : (index === midpoint ? '#72a9d3' : '#1f6fb5')
    return `<text x="${isNegative ? 0 : 520}" y="${y + 15}" font-family="${svgFontFamily}" font-size="11" fill="#172033">${escapeXml(shorten(labelFormatter(label), 28))}</text><rect x="${x.toFixed(1)}" y="${y + 3}" width="${barWidth.toFixed(1)}" height="18" rx="3" fill="${color}"/><text x="${isNegative ? Math.max(0, x - 8) : Math.min(width - 8, x + barWidth + 8)}" y="${y + 16}" text-anchor="${isNegative ? 'end' : 'start'}" font-family="${svgFontFamily}" font-size="10" fill="#52627a">${formatDecimal(distribution.percentages[label] ?? 0)} %</text>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.max(90, entries.length * rowHeight + 30)}" viewBox="0 0 ${width} ${Math.max(90, entries.length * rowHeight + 30)}"><rect width="100%" height="100%" fill="#ffffff"/><line x1="${center}" y1="16" x2="${center}" y2="${entries.length * rowHeight + 20}" stroke="#94a3b8"/>${rows}</svg>`
}

export function buildCompetenceSvg(items: ReportCompetence[], width = 720) {
  const ordered = [...items].filter((item) => item.average != null).sort((a, b) => (b.average ?? 0) - (a.average ?? 0))
  const rowHeight = ordered.length > 14 ? 21 : 27
  const height = Math.max(100, ordered.length * rowHeight + 42)
  const chartWidth = width - 270
  const body = ordered.length === 0
    ? '<text x="18" y="32" font-family="Roboto, Arial, sans-serif" font-size="14" fill="#52627a">Sin competencias observadas</text>'
    : ordered.map((item, index) => {
      const y = 27 + index * rowHeight
      const value = Math.max(0, Math.min(5, item.average ?? 0))
      const barWidth = (value / 5) * chartWidth
      return `<text x="0" y="${y + 14}" font-family="${svgFontFamily}" font-size="11" fill="#172033">${escapeXml(shorten(item.name, 30))}</text><rect x="250" y="${y + 2}" width="${barWidth.toFixed(1)}" height="15" rx="4" fill="#1f6fb5"/><text x="${Math.min(width - 42, 258 + barWidth)}" y="${y + 14}" font-family="${svgFontFamily}" font-size="11" fill="#52627a">${formatDecimal(value)}</text>`
    }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/>${body}</svg>`
}

export function buildCompetenceHeatmapSvg(items: ReportCompetence[], width = 720, employer = false) {
  const rowHeight = 28
  const labelWidth = 260
  const cellWidth = 58
  const height = Math.max(100, items.length * rowHeight + 44)
  const body = items.map((item, row) => {
    const y = 30 + row * rowHeight
    const cells = [1, 2, 3, 4, 5].map((level) => {
      const count = item.levelCounts[String(level)] ?? 0
      const max = Math.max(1, ...items.map((entry) => entry.levelCounts[String(level)] ?? 0))
      const intensity = count / max
      const fill = level <= 2 ? `rgba(214,69,69,${0.08 + intensity * 0.62})` : level === 3 ? `rgba(148,163,184,${0.08 + intensity * 0.62})` : employer ? `rgba(20,163,154,${0.08 + intensity * 0.62})` : `rgba(31,111,181,${0.08 + intensity * 0.62})`
      return `<rect x="${labelWidth + (level - 1) * cellWidth}" y="${y}" width="${cellWidth - 3}" height="22" rx="2" fill="${fill}"/><text x="${labelWidth + (level - 1) * cellWidth + (cellWidth - 3) / 2}" y="${y + 15}" text-anchor="middle" font-family="${svgFontFamily}" font-size="10" fill="#172033">${formatInteger(count)}</text>`
    }).join('')
    return `<text x="0" y="${y + 15}" font-family="${svgFontFamily}" font-size="10" fill="#172033">${escapeXml(shorten(item.name, 35))}</text>${cells}`
  }).join('')
  const headers = [1, 2, 3, 4, 5].map((level) => `<text x="${labelWidth + (level - 1) * cellWidth + (cellWidth - 3) / 2}" y="18" text-anchor="middle" font-family="${svgFontFamily}" font-size="10" font-weight="700" fill="#52627a">${level}</text>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/>${headers}${body}</svg>`
}

export function buildCompetenceRadarSvg(items: ReportCompetence[], width = 720, color = '#1f6fb5') {
  const plotted = items.filter((item) => item.average != null).slice(0, 8)
  const height = 380
  const cx = width / 2
  const cy = 190
  const radius = 120
  const count = Math.max(plotted.length, 1)
  const point = (index: number, value: number, scale = radius) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count
    return { x: cx + Math.cos(angle) * scale * (value / 5), y: cy + Math.sin(angle) * scale * (value / 5) }
  }
  const axis = (index: number, scale = radius) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count
    return { x: cx + Math.cos(angle) * scale, y: cy + Math.sin(angle) * scale }
  }
  const grids = [1, 2, 3, 4, 5].map((level) => `<polygon points="${plotted.map((_, index) => { const p = point(index, 5, (radius * level) / 5); return `${p.x},${p.y}` }).join(' ')}" fill="none" stroke="#cbd5e1" stroke-dasharray="2 2"/>`).join('')
  const axes = plotted.map((item, index) => { const p = axis(index); const label = axis(index, radius + 34); return `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="#cbd5e1"/><text x="${label.x}" y="${label.y}" text-anchor="middle" font-family="${svgFontFamily}" font-size="10" fill="#334155">${escapeXml(shorten(item.name, 22))} ${formatDecimal(item.average ?? 0)}</text>` }).join('')
  const polygon = plotted.map((item, index) => { const p = point(index, item.average ?? 0); return `${p.x},${p.y}` }).join(' ')
  const points = plotted.map((item, index) => { const p = point(index, item.average ?? 0); return `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${color}"/>` }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/>${grids}${axes}<polygon points="${polygon}" fill="${color}" fill-opacity="0.24" stroke="${color}" stroke-width="2.25"/>${points}</svg>`
}

export function buildCohortScatterSvg(points: ReportCohortPoint[], width = 720, height = 320) {
  const valid = points.filter((point) => Number.isFinite(point.graduationYear) && Number.isFinite(point.professionalYears))
  const minYear = Math.min(...valid.map((point) => point.graduationYear), new Date().getFullYear())
  const maxYear = Math.max(...valid.map((point) => point.graduationYear), minYear + 1)
  const maxYears = Math.max(...valid.map((point) => point.professionalYears), 1)
  const left = 58
  const right = 20
  const top = 20
  const bottom = 44
  const plotWidth = width - left - right
  const plotHeight = height - top - bottom
  const x = (year: number) => left + ((year - minYear) / Math.max(1, maxYear - minYear)) * plotWidth
  const y = (years: number) => top + plotHeight - (years / maxYears) * plotHeight
  const grid = [0, 0.25, 0.5, 0.75, 1].map((step) => `<line x1="${left}" y1="${y(maxYears * step)}" x2="${width - right}" y2="${y(maxYears * step)}" stroke="#e2e8f0"/><text x="${left - 8}" y="${y(maxYears * step) + 4}" text-anchor="end" font-family="${svgFontFamily}" font-size="10" fill="#64748b">${formatDecimal(maxYears * step)}</text>`).join('')
  const dots = valid.map((point) => `<circle cx="${x(point.graduationYear).toFixed(1)}" cy="${y(point.professionalYears).toFixed(1)}" r="3.5" fill="#1f6fb5" fill-opacity="0.68"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/>${grid}<line x1="${left}" y1="${top + plotHeight}" x2="${width - right}" y2="${top + plotHeight}" stroke="#94a3b8"/><line x1="${left}" y1="${top}" x2="${left}" y2="${top + plotHeight}" stroke="#94a3b8"/>${dots}<text x="${width / 2}" y="${height - 10}" text-anchor="middle" font-family="${svgFontFamily}" font-size="10" fill="#52627a">Año de titulación (${minYear}–${maxYear})</text><text x="14" y="${height / 2}" transform="rotate(-90 14 ${height / 2})" text-anchor="middle" font-family="${svgFontFamily}" font-size="10" fill="#52627a">Años de vida profesional</text></svg>`
}

export function buildEmployerTimelineSvg(dashboard: ReportEmployerDashboard, width = 720, height = 300) {
  const points = dashboard.timeline
  if (!points.length) return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><text x="18" y="32" font-family="${svgFontFamily}" font-size="14" fill="#52627a">Sin fechas de respuesta</text></svg>`
  const left = 52, right = 28, top = 24, bottom = 48
  const plotWidth = width - left - right, plotHeight = height - top - bottom
  const max = Math.max(1, ...points.map((point) => point.cumulative))
  const x = (index: number) => left + (index / Math.max(1, points.length - 1)) * plotWidth
  const y = (value: number) => top + plotHeight - (value / max) * plotHeight
  const bars = points.map((point, index) => {
    const slot = plotWidth / points.length
    const barWidth = Math.max(3, slot * 0.62)
    return `<rect x="${(left + index * slot + (slot - barWidth) / 2).toFixed(1)}" y="${y(point.count).toFixed(1)}" width="${barWidth.toFixed(1)}" height="${(top + plotHeight - y(point.count)).toFixed(1)}" rx="3" fill="#14a39a"/>`
  }).join('')
  const line = points.map((point, index) => `${x(index).toFixed(1)},${y(point.cumulative).toFixed(1)}`).join(' ')
  const labels = points.filter((_, index) => index === 0 || index === points.length - 1 || index % Math.ceil(points.length / 6) === 0).map((point) => {
    const index = points.indexOf(point)
    return `<text x="${x(index).toFixed(1)}" y="${height - 22}" text-anchor="middle" font-family="${svgFontFamily}" font-size="10" fill="#52627a">${escapeXml(point.bucket.slice(0, 10))}</text>`
  }).join('')
  const grid = [0, 0.5, 1].map((step) => `<line x1="${left}" y1="${y(max * step)}" x2="${width - right}" y2="${y(max * step)}" stroke="#e2e8f0"/><text x="${left - 8}" y="${y(max * step) + 4}" text-anchor="end" font-family="${svgFontFamily}" font-size="10" fill="#64748b">${formatInteger(max * step)}</text>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/>${grid}${bars}<polyline points="${line}" fill="none" stroke="#2f8f66" stroke-width="2.5"/>${labels}<text x="${width - 28}" y="18" text-anchor="end" font-family="${svgFontFamily}" font-size="10" fill="#52627a">Barras: respuestas · línea: acumulado</text></svg>`
}

export function buildEmployerBalanceSvg(rows: { label: string; agree: number; partly: number; disagree: number; netIndex: number | null; base: number }[], width = 720) {
  const rowHeight = 34
  const height = Math.max(100, rows.length * rowHeight + 54)
  const center = 360
  const max = 100
  const body = rows.map((row, index) => {
    const y = 28 + index * rowHeight
    const scale = (value: number) => (Math.abs(value) / max) * 250
    const disagreeWidth = scale(row.disagree)
    const partlyWidth = scale(row.partly)
    const agreeWidth = scale(row.agree)
    return `<text x="0" y="${y + 16}" font-family="${svgFontFamily}" font-size="10" fill="#172033">${escapeXml(shorten(row.label, 31))}</text><rect x="${(center - disagreeWidth).toFixed(1)}" y="${y + 4}" width="${disagreeWidth.toFixed(1)}" height="9" fill="#c83b2b"/><rect x="${center}" y="${y + 4}" width="${partlyWidth.toFixed(1)}" height="9" fill="#edb84b"/><rect x="${(center + partlyWidth).toFixed(1)}" y="${y + 4}" width="${agreeWidth.toFixed(1)}" height="9" fill="#2f8f66"/><text x="${width - 4}" y="${y + 16}" text-anchor="end" font-family="${svgFontFamily}" font-size="10" fill="#52627a">${row.netIndex == null ? 'n/d' : formatDecimal(row.netIndex)} · n=${formatInteger(row.base)}</text>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/><line x1="${center}" y1="18" x2="${center}" y2="${height - 12}" stroke="#94a3b8"/>${body}<text x="${center - 12}" y="${height - 4}" text-anchor="end" font-family="${svgFontFamily}" font-size="10" fill="#52627a">Desacuerdo</text><text x="${center + 12}" y="${height - 4}" font-family="${svgFontFamily}" font-size="10" fill="#52627a">Acuerdo</text></svg>`
}

export function buildEmployerHiringMatrixSvg(rows: { label: string; yes: number; no: number; unknown: number }[], width = 720) {
  const rowHeight = 42
  const height = Math.max(100, rows.length * rowHeight + 56)
  const left = 170, plotWidth = width - left - 24
  const max = Math.max(1, ...rows.map((row) => row.yes + row.no + row.unknown))
  const body = rows.map((row, index) => {
    const y = 28 + index * rowHeight
    let offset = left
    const segments = ([['#14a39a', row.yes], ['#edb84b', row.no], ['#94a3b8', row.unknown]] as const).map(([color, value]) => { const w = (value / max) * plotWidth; const part = `<rect x="${offset.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="20" fill="${color}"/>`; offset += w; return part }).join('')
    return `<text x="0" y="${y + 14}" font-family="${svgFontFamily}" font-size="11" fill="#172033">${escapeXml(shorten(row.label, 22))}</text>${segments}<text x="${Math.min(width - 6, offset + 8).toFixed(1)}" y="${y + 14}" font-family="${svgFontFamily}" font-size="10" fill="#52627a">${formatInteger(row.yes + row.no + row.unknown)}</text>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/>${body}<text x="${left}" y="${height - 12}" font-family="${svgFontFamily}" font-size="10" fill="#52627a">■ Contrató</text><text x="${left + 94}" y="${height - 12}" font-family="${svgFontFamily}" font-size="10" fill="#52627a">■ No contrató</text><text x="${left + 190}" y="${height - 12}" font-family="${svgFontFamily}" font-size="10" fill="#52627a">■ Sin respuesta</text></svg>`
}

export function buildEmployerGroupBalanceSvg(rows: { group: string; yes: number | null; no: number | null }[], width = 720, height = 260) {
  const center = height - 54
  const top = 32
  const scale = 0.9
  const groups = rows.map((row, index) => {
    const x = 210 + index * 280
    const yesHeight = Math.abs(row.yes ?? 0) * scale
    const noHeight = Math.abs(row.no ?? 0) * scale
    const yesY = row.yes != null && row.yes >= 0 ? center - yesHeight : center
    const noY = row.no != null && row.no >= 0 ? center - noHeight : center
    return `<rect x="${x - 48}" y="${yesY}" width="38" height="${yesHeight}" fill="#14a39a" rx="4"/><rect x="${x + 10}" y="${noY}" width="38" height="${noHeight}" fill="#94a3b8" rx="4"/><text x="${x}" y="${height - 28}" text-anchor="middle" font-family="${svgFontFamily}" font-size="11" fill="#172033">${escapeXml(row.group)}</text><text x="${x - 29}" y="${Math.max(top, yesY - 5)}" text-anchor="middle" font-family="${svgFontFamily}" font-size="10" fill="#52627a">${row.yes == null ? 'n/d' : formatDecimal(row.yes)}</text><text x="${x + 29}" y="${Math.max(top, noY - 5)}" text-anchor="middle" font-family="${svgFontFamily}" font-size="10" fill="#52627a">${row.no == null ? 'n/d' : formatDecimal(row.no)}</text>`
  }).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="#ffffff"/><line x1="90" y1="${center}" x2="${width - 40}" y2="${center}" stroke="#94a3b8"/>${groups}<text x="24" y="${height - 10}" font-family="${svgFontFamily}" font-size="10" fill="#52627a">Índice neto · verde: contrató · gris: no contrató</text></svg>`
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
