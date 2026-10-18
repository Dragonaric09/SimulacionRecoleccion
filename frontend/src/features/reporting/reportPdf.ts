import type { AnalyticsSummaryData } from '@/features/analitica/api'
import type { DatasetDomain } from '@/app/DatasetContext'
import type { ReportModuleDefinition } from './reportTypes'
import { fieldsForModule } from './reportData'
import { buildDistributionSvg, buildNumericKpiSvg, distributionRowHeight, distributionSvgHeight } from './reportCharts'
import { reportDistribution, reportFieldLabel, reportValueLabel } from './reportFields'
import type { ReportFilters, ReportModuleAvailability } from './reportTypes'

type PdfMake = typeof import('pdfmake/build/pdfmake').default
let ready: Promise<PdfMake> | undefined

async function loadPdfMake() {
  if (!ready) {
    ready = Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')]).then(([pdf, fonts]) => {
      const pdfMake = pdf.default
      pdfMake.addVirtualFileSystem(fonts.default)
      return pdfMake
    })
  }
  return ready
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value)
}

function formatInteger(value: number) {
  return new Intl.NumberFormat('es-BO', { maximumFractionDigits: 0 }).format(value)
}

function filterLabel(domain: DatasetDomain, filters: ReportFilters | undefined) {
  if (!filters) return 'Todos'
  const values: string[] = []
  if (domain === 'TITULADOS') {
    if (filters.yearFrom !== undefined || filters.yearTo !== undefined) values.push(`Año: ${filters.yearFrom ?? 'mínimo'}–${filters.yearTo ?? 'máximo'}`)
    if (filters.laborStatus.length) values.push(`Estado laboral: ${filters.laborStatus.join(', ')}`)
    if (filters.sector.length) values.push(`Sector: ${filters.sector.join(', ')}`)
    if (filters.gender.length) values.push(`Género: ${filters.gender.join(', ')}`)
  } else {
    if (filters.organizationType.length) values.push(`Tipo: ${filters.organizationType.join(', ')}`)
    if (filters.organizationSize.length) values.push(`Tamaño: ${filters.organizationSize.join(', ')}`)
  }
  return values.length ? values.join(' · ') : 'Todos'
}

function moduleBlock(module: ReportModuleDefinition, summary: AnalyticsSummaryData | undefined, showDataTables: boolean, hideEmptyOptions: boolean) {
  const fields = fieldsForModule(module)
  const rows: unknown[][] = [['Variable', 'Base', 'Resumen']]
  const visual: unknown[] = []
  fields.forEach((field) => {
    const rawDistribution = summary?.distributions[field]
    const distribution = rawDistribution ? reportDistribution(field, rawDistribution) : undefined
    if (distribution) {
      const rowHeight = distributionRowHeight(distribution, hideEmptyOptions)
      const chartHeight = distributionSvgHeight(distribution, rowHeight, hideEmptyOptions)
      const values = Object.entries(distribution.counts).map(([label, count]) => `${reportValueLabel(field, label)}: ${formatInteger(count)} (${formatDecimal(distribution.percentages[label] ?? 0)} %)`).join('\n')
      rows.push([reportFieldLabel(field), formatInteger(distribution.validCount), values || 'Sin respuestas'])
      if (visual.length === 0) visual.push({ svg: buildDistributionSvg(distribution, 720, rowHeight, hideEmptyOptions, (label) => reportValueLabel(field, label)), fit: [720, chartHeight], margin: [0, 8, 0, 8] })
    } else if (summary?.numericAverages[field] != null) {
      rows.push([reportFieldLabel(field), formatInteger(summary.validResponses), `Media: ${formatDecimal(summary.numericAverages[field])} · Mediana: ${formatDecimal(summary.numericMedians[field] ?? 0)}`])
      if (visual.length === 0) visual.push({ svg: buildNumericKpiSvg(summary, field), fit: [720, 110], margin: [0, 8, 0, 8] })
    }
  })
  return {
    unbreakable: visual.length === 0 || visual.every((item) => !('fit' in (item as { fit?: unknown }))) || !visual.some((item) => Array.isArray((item as { fit?: unknown }).fit) && ((item as { fit: [number, number] }).fit[1] > 500)),
    stack: [
      { text: module.title, style: 'moduleTitle' },
      { text: `${module.description} · base por variable en la tabla`, style: 'note' },
      ...visual,
      showDataTables ? { table: { headerRows: 1, widths: [170, 45, '*'], body: rows }, layout: 'lightHorizontalLines', margin: [0, 6, 0, 12] } : { text: rows.slice(1).map((row) => `${row[0]}: ${row[2]}`).join('\n') || 'Sin datos disponibles', margin: [0, 6, 0, 12] },
    ],
  }
}

export async function createReportPdf(modules: ReportModuleDefinition[], summaries: Map<DatasetDomain, AnalyticsSummaryData>, options: { title: string; showCover: boolean; showDataTables: boolean; hideEmptyOptions: boolean; paper: 'A4' | 'LETTER'; filters: Partial<Record<DatasetDomain, ReportFilters>>; omitted: { module: ReportModuleDefinition; status: ReportModuleAvailability }[]; datasetNames: Partial<Record<DatasetDomain, string>> }) {
  const pdfMake = await loadPdfMake()
  const content: unknown[] = []
  if (options.showCover) content.push(
    { text: options.title, style: 'title' },
    { text: `Reporte dinámico · ${new Intl.DateTimeFormat('es-BO', { dateStyle: 'long', timeZone: 'America/La_Paz' }).format(new Date())}`, style: 'subtitle' },
    { text: `Encuestas incluidas: ${[...summaries.keys()].map((domain) => domain === 'TITULADOS' ? 'Titulados' : 'Empleadores').join(' y ') || 'ninguna'}`, style: 'subtitle' },
    ...[...summaries.keys()].map((domain) => ({ text: `${domain === 'TITULADOS' ? 'Titulados' : 'Empleadores'} · dataset: ${options.datasetNames[domain] ?? 'sin nombre'} · filtros: ${filterLabel(domain, options.filters[domain])}`, style: 'subtitle' })),
    { text: '', margin: [0, 0, 0, 12] },
  )
  modules.forEach((module, index) => {
    content.push(moduleBlock(module, summaries.get(module.domain), options.showDataTables, options.hideEmptyOptions))
    if (index < modules.length - 1) content.push({ text: '', margin: [0, 4, 0, 4] })
  })
  if (options.omitted.length > 0) {
    content.push({ text: 'Módulos omitidos', style: 'moduleTitle', pageBreak: 'before' })
    content.push({ text: options.omitted.slice(0, 10).map(({ module, status }) => `• ${module.title}: ${statusLabel(status)}`).join('\n'), style: 'note' })
    if (options.omitted.length > 10) content.push({ text: `Se omitieron ${options.omitted.length - 10} módulos adicionales; consulte el panel para ver el detalle.`, style: 'note', margin: [0, 6, 0, 0] })
  }
  const footerFilters = [...summaries.keys()].map((domain) => `${domain === 'TITULADOS' ? 'Titulados' : 'Empleadores'}: ${filterLabel(domain, options.filters[domain])}`).join(' · ')
  return pdfMake.createPdf({
    info: { title: options.title, author: 'SimulacionEM' },
    pageSize: options.paper, pageOrientation: 'landscape', pageMargins: [32, 32, 32, 36],
    defaultStyle: { font: 'Roboto', fontSize: 8, color: '#172033' },
    styles: { title: { fontSize: 20, bold: true, margin: [0, 0, 0, 8] }, subtitle: { fontSize: 9, color: '#52627a', margin: [0, 0, 0, 5] }, moduleTitle: { fontSize: 12, bold: true, margin: [0, 8, 0, 2] }, note: { fontSize: 8, color: '#52627a' } },
    footer: (currentPage: number, pageCount: number) => ({ text: `Página ${currentPage} de ${pageCount}${footerFilters ? ` · ${footerFilters}` : ''}`, alignment: 'right', fontSize: 7, color: '#64748b', margin: [32, 0, 32, 12] }),
    content,
  })
}

function statusLabel(status: ReportModuleAvailability) {
  return status === 'MUESTRA_PEQUENA' ? 'muestra pequeña' : status === 'SIN_DATOS_CON_FILTRO' ? 'sin datos con los filtros actuales' : status === 'SIN_RESPUESTAS' ? 'sin respuestas' : 'dataset o columna no disponible'
}
