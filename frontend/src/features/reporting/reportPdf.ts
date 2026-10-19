import type { AnalyticsSummaryData, ReportCompetence, ReportComparison } from '@/features/analitica/api'
import type { Simulation } from '@/features/analitica/shared/analyticsTypes'
import type { DatasetDomain } from '@/app/DatasetContext'
import type { ReportCohortPoint, ReportEmployerDashboard, ReportModuleDefinition } from './reportTypes'
import { fieldsForModule } from './reportData'
import { buildReportChartSvg, categoricalSvgHeight, distributionRowHeight } from './reportCharts'
import { categoricalSpec, numericKpiSpec } from './reportChartSpecs'
import { probabilityLabel, valuationLabel } from '@/features/empleadores/dashboard/labels'
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

function competenceTable(competences: ReportCompetence[]) {
  return { table: { headerRows: 1, widths: [170, 45, 45, 45, 45, 45, '*'], body: [
    ['Competencia', 'Base', 'Media', 'Mediana', 'D.E.', 'No obs.', 'Niveles'],
    ...competences.map((item) => [item.name, formatInteger(item.validCount), item.average == null ? 'n/d' : formatDecimal(item.average), item.median == null ? 'n/d' : formatDecimal(item.median), item.standardDeviation == null ? 'n/d' : formatDecimal(item.standardDeviation), formatInteger(item.notObservedCount), Object.entries(item.levelCounts).sort(([a], [b]) => Number(a) - Number(b)).map(([level, count]) => `${level}: ${formatInteger(count)}`).join(' · ')])
  ], dontBreakRows: true }, layout: 'lightHorizontalLines', margin: [0, 6, 0, 12] }
}

function competenceKpiTable(competences: ReportCompetence[], domain: DatasetDomain) {
  const valid = competences.filter((item) => item.average != null)
  const average = valid.length ? valid.reduce((sum, item) => sum + (item.average ?? 0), 0) / valid.length : null
  const lowest = valid.reduce<ReportCompetence | undefined>((current, item) => !current || (item.average ?? Infinity) < (current.average ?? Infinity) ? item : current, undefined)
  const highest = valid.reduce<ReportCompetence | undefined>((current, item) => !current || (item.average ?? -Infinity) > (current.average ?? -Infinity) ? item : current, undefined)
  const accent = domain === 'EMPLEADORES' ? '#14a39a' : '#1f6fb5'
  return {
    table: {
      widths: ['*', '*', '*', '*'],
      body: [[
        { text: `${formatInteger(competences.length)}\nCompetencias evaluadas`, color: accent, bold: true, alignment: 'center' },
        { text: `${average == null ? 'n/d' : formatDecimal(average)} de 5\nPromedio global`, color: accent, bold: true, alignment: 'center' },
        { text: `${lowest ? formatDecimal(lowest.average ?? 0) : 'n/d'}\nCompetencia más baja${lowest ? `\n${lowest.name}` : ''}`, color: lowest ? '#b42318' : '#52627a', bold: true, alignment: 'center' },
        { text: `${highest ? formatDecimal(highest.average ?? 0) : 'n/d'}\nCompetencia más alta${highest ? `\n${highest.name}` : ''}`, color: accent, bold: true, alignment: 'center' },
      ]],
    },
    layout: { fillColor: () => '#eef6fb', hLineColor: () => '#dbe7ef', vLineColor: () => '#dbe7ef' },
    margin: [0, 4, 0, 8],
  }
}

function summaryKpiTable(summary: AnalyticsSummaryData, domain: DatasetDomain) {
  const cells: { value: string; label: string }[] = [{ value: formatInteger(summary.validResponses), label: domain === 'TITULADOS' ? 'Respuestas válidas' : 'Organizaciones válidas' }]
  const employment = summary.distributions.situacion_laboral_actual
  if (employment) {
    const employed = Object.entries(employment.counts).filter(([label]) => /organiza|emprend/i.test(label)).reduce((sum, [, count]) => sum + count, 0)
    if (employed > 0) cells.push({ value: `${formatInteger(employed)} · ${formatDecimal((employed / Math.max(1, summary.validResponses)) * 100)} %`, label: 'Con empleo' })
  }
  const interest = summary.distributions.interes_posgrado
  if (interest) {
    const yes = Object.entries(interest.counts).filter(([label]) => /^(sí|si|true)$/i.test(label.trim())).reduce((sum, [, count]) => sum + count, 0)
    if (yes > 0) cells.push({ value: `${formatInteger(yes)} · ${formatDecimal((yes / Math.max(1, interest.validCount)) * 100)} %`, label: 'Interés en posgrado' })
  }
  if (summary.numericMedians.anio_titulacion != null) cells.push({ value: formatDecimal(summary.numericMedians.anio_titulacion), label: 'Mediana de titulación' })
  const firstEmployment = summary.distributions.es_primer_empleo
  if (firstEmployment) {
    const yes = Object.entries(firstEmployment.counts).filter(([label]) => /^(sí|si|true)$/i.test(label.trim())).reduce((sum, [, count]) => sum + count, 0)
    if (yes > 0) cells.push({ value: formatInteger(yes), label: 'Siguen en su primer empleo' })
  }
  const contract = summary.distributions.contrato_titulados_ultimos_5_anios
  if (contract) {
    const yes = Object.entries(contract.counts).filter(([label]) => /^(sí|si|true)$/i.test(label.trim())).reduce((sum, [, count]) => sum + count, 0)
    if (yes > 0) cells.push({ value: formatInteger(yes), label: 'Contrataron titulados' })
  }
  const displayed = cells.slice(0, 5)
  return {
    table: { widths: displayed.map(() => '*'), body: [displayed.map((cell) => ({ text: `${cell.value}\n${cell.label}`, alignment: 'center', bold: true }))] },
    layout: { fillColor: () => domain === 'EMPLEADORES' ? '#e8f7f5' : '#eef6fb', hLineColor: () => '#dbe7ef', vLineColor: () => '#dbe7ef' },
    margin: [0, 4, 0, 8],
  }
}

function comparisonTable(comparisons: ReportComparison[]) {
  return { table: { headerRows: 1, widths: [170, 45, 45, 45, 45, '*'], body: [
    ['Competencia', 'Tit. media', 'Emp. media', 'Δ medias', 'Δ medianas', 'Prueba'],
    ...comparisons.map((comparison) => {
      const formatTest = comparison.prueba.aplicable
        ? `${comparison.prueba.nombre} · p ajustado: ${comparison.prueba.pAjustado == null ? 'n/d' : formatDecimal(comparison.prueba.pAjustado)}`
        : `No aplicable · ${comparison.prueba.motivo}`
      return [comparison.name, comparison.titulados.media == null ? 'n/d' : formatDecimal(comparison.titulados.media), comparison.empleadores.media == null ? 'n/d' : formatDecimal(comparison.empleadores.media), comparison.diferenciaMedias == null ? 'n/d' : formatDecimal(comparison.diferenciaMedias), comparison.diferenciaMedianas == null ? 'n/d' : formatDecimal(comparison.diferenciaMedianas), formatTest]
    }),
  ], dontBreakRows: true }, layout: 'lightHorizontalLines', margin: [0, 6, 0, 12] }
}

function simulationTable(simulation: Simulation) {
  return { table: { headerRows: 1, widths: [170, 55, 55, 55, 55, 55, '*'], body: [
    ['Categoría', 'Observado', 'Media simulada', 'Mín. 95 %', 'Máx. 95 %', 'D.E.', 'Réplicas'],
    ...simulation.categories.map((item) => [item.category, `${formatInteger(item.observedCount)} (${formatDecimal(item.observedPercentage)} %)`, `${formatDecimal(item.simulatedMean)} %`, `${formatDecimal(item.lower95)} %`, `${formatDecimal(item.upper95)} %`, `${formatDecimal(item.standardDeviation)} pp`, `${formatInteger(simulation.repetitions)}`]),
  ], dontBreakRows: true }, layout: 'lightHorizontalLines', margin: [0, 6, 0, 12] }
}

function moduleBlock(module: ReportModuleDefinition, summary: AnalyticsSummaryData | undefined, competences: ReportCompetence[] | undefined, comparison: ReportComparison[] | undefined, simulation: Simulation | undefined, cohorts: ReportCohortPoint[] | undefined, employerDashboard: ReportEmployerDashboard | undefined, showDataTables: boolean, hideEmptyOptions: boolean, numbering: { figure: number; table: number }, includeSummaryKpis = false) {
  const startOnNewPage = module.domain === 'EMPLEADORES' && (module.kind === 'summary' || module.kind === 'competence')
  if (module.domain === 'COMPARACION') return { stack: [
    { text: module.title, style: 'moduleTitle', tocItem: 'report-module' },
    { text: `${module.description} · diferencias: empleadores − titulados`, style: 'note' },
    ...(comparison?.length ? [{ text: `Tabla ${numbering.table++}. Comparación por competencia`, style: 'caption' }, comparisonTable(comparison)] : [{ text: 'Sin datos disponibles', margin: [0, 6, 0, 12] }]),
  ], pageBreak: 'before' }
  if (module.domain === 'SIMULACION') return { stack: [
    { text: module.title, style: 'moduleTitle', tocItem: 'report-module' },
    { text: `${module.description} · N = ${simulation?.sampleSize ?? 'n/d'} · réplicas = ${simulation ? formatInteger(simulation.repetitions) : 'n/d'} · semilla = ${simulation?.seed ?? 'n/d'}`, style: 'note' },
    ...(simulation ? [{ text: `Tabla ${numbering.table++}. Distribución observada y simulada`, style: 'caption' }, simulationTable(simulation)] : [{ text: 'Sin datos disponibles', margin: [0, 6, 0, 12] }]),
  ], pageBreak: 'before' }
  if (module.kind === 'summary') return { stack: [
    { text: module.title, style: 'moduleTitle', keepWithNext: true, tocItem: 'report-module' },
    { text: module.description, style: 'note', keepWithNext: true },
    ...(summary ? [{ text: 'Resumen ejecutivo', style: 'caption' }, summaryKpiTable(summary, module.domain === 'EMPLEADORES' ? 'EMPLEADORES' : 'TITULADOS')] : [{ text: 'Sin datos disponibles', margin: [0, 6, 0, 12] }]),
  ], pageBreak: 'before' }
  if (module.domain === 'EMPLEADORES' && employerDashboard && module.visualType === 'timeline') return { stack: [
    { text: module.title, style: 'moduleTitle', keepWithNext: true, tocItem: 'report-module' },
    { text: `${module.description} · n = ${formatInteger(employerDashboard.filteredResponses)}`, style: 'note', keepWithNext: true },
    ...(employerDashboard.timeline.length ? [{ text: `Figura ${numbering.figure++}. Respuestas por ${employerDashboard.timelineGranularity === 'week' ? 'semana' : 'día'} y acumulado`, style: 'caption' }, { svg: buildReportChartSvg({ type: 'employer-timeline', dashboard: employerDashboard }), fit: [720, 300], margin: [0, 6, 0, 8] }] : [{ text: 'Sin datos disponibles', margin: [0, 6, 0, 12] }]),
  ], pageBreak: 'before' }
  if (module.domain === 'EMPLEADORES' && employerDashboard && module.visualType === 'grouped') {
    if (module.id === 'empleadores.resumen.balance-valoracion') {
      const rows = employerDashboard.valuations.map((item) => {
        const total = item.agree + item.partly + item.disagree
        const percent = (value: number) => total === 0 ? 0 : value * 100 / total
        return { label: valuationLabel(item.key), agree: percent(item.agree), partly: percent(item.partly), disagree: -percent(item.disagree), netIndex: item.netIndex, base: total }
      })
      return { stack: [{ text: module.title, style: 'moduleTitle', keepWithNext: true, tocItem: 'report-module' }, { text: module.description, style: 'note', keepWithNext: true }, ...(rows.length ? [{ text: `Figura ${numbering.figure++}. Balance de valoración`, style: 'caption' }, { svg: buildReportChartSvg({ type: 'employer-balance', rows }), fit: [720, Math.max(100, rows.length * 34 + 54)], margin: [0, 6, 0, 8] }] : [{ text: 'Sin datos disponibles', margin: [0, 6, 0, 12] }])], pageBreak: 'before' }
    }
    const groupRows = (['formacion', 'relacion'] as const).map((group) => ({ group: group === 'formacion' ? 'Formación y perfil' : 'Relación con la Carrera', yes: employerDashboard.balanceByHiring.find((item) => item.group === group && item.hired === 'Sí')?.netIndex ?? null, no: employerDashboard.balanceByHiring.find((item) => item.group === group && item.hired === 'No')?.netIndex ?? null }))
    return { stack: [{ text: module.title, style: 'moduleTitle', keepWithNext: true, tocItem: 'report-module' }, { text: module.description, style: 'note', keepWithNext: true }, { text: `Figura ${numbering.figure++}. Índice neto por grupo y contratación`, style: 'caption' }, { svg: buildReportChartSvg({ type: 'employer-group-balance', rows: groupRows }), fit: [720, 260], margin: [0, 6, 0, 8] }], pageBreak: 'before' }
  }
  if (module.domain === 'EMPLEADORES' && employerDashboard && module.visualType === 'matrix') {
    const probabilityOrder = ['Sí, existe una alta probabilidad de contratación', 'Sí, dependiendo del crecimiento o nuevos proyectos de la organización', 'No se tiene prevista la contratación actualmente', 'No requiere profesionales del área de Sistemas']
    const labels = [...probabilityOrder, ...Array.from(new Set(employerDashboard.hiringByProbability.map((item) => item.probability))).filter((item) => !probabilityOrder.includes(item))]
    const rows = labels.map((probability) => ({ label: probabilityLabel(probability), yes: employerDashboard.hiringByProbability.find((item) => item.probability === probability && item.hired === 'Sí')?.count ?? 0, no: employerDashboard.hiringByProbability.find((item) => item.probability === probability && item.hired === 'No')?.count ?? 0, unknown: employerDashboard.hiringByProbability.find((item) => item.probability === probability && item.hired === 'Sin respuesta')?.count ?? 0 })).filter((row) => row.yes + row.no + row.unknown > 0)
    return { stack: [{ text: module.title, style: 'moduleTitle', keepWithNext: true, tocItem: 'report-module' }, { text: module.description, style: 'note', keepWithNext: true }, ...(rows.length ? [{ text: `Figura ${numbering.figure++}. Contratación por probabilidad`, style: 'caption' }, { svg: buildReportChartSvg({ type: 'employer-hiring-matrix', rows }), fit: [720, Math.max(100, rows.length * 42 + 56)], margin: [0, 6, 0, 8] }] : [{ text: 'Sin datos disponibles', margin: [0, 6, 0, 12] }])], pageBreak: 'before' }
  }
  if (module.visualType === 'scatter') return { stack: [
    { text: module.title, style: 'moduleTitle', keepWithNext: true, tocItem: 'report-module' },
    { text: `${module.description} · n = ${cohorts?.length ?? 0}`, style: 'note', keepWithNext: true },
    ...(cohorts?.length ? [{ text: `Figura ${numbering.figure++}. Años de vida profesional por cohorte`, style: 'caption' }, { svg: buildReportChartSvg({ type: 'cohort-scatter', points: cohorts }), fit: [720, 320], margin: [0, 6, 0, 8] }] : [{ text: 'Sin datos disponibles', margin: [0, 6, 0, 12] }]),
  ], pageBreak: 'before' }
  if (module.kind === 'competence') {
    const employer = module.domain === 'EMPLEADORES'
    const visualType = module.visualType ?? 'heatmap'
    const visual = visualType === 'radar'
      ? { svg: buildReportChartSvg({ type: 'competence-radar', items: competences ?? [], color: employer ? '#14a39a' : '#1f6fb5' }), fit: [720, 380], margin: [0, 6, 0, 8] }
      : visualType === 'heatmap'
        ? { svg: buildReportChartSvg({ type: 'competence-heatmap', items: competences ?? [], employer }), fit: [720, Math.max(100, (competences?.length ?? 0) * 28 + 44)], margin: [0, 6, 0, 8] }
        : { svg: buildReportChartSvg({ type: 'competence-mean', items: competences ?? [] }), fit: [720, Math.max(100, (competences?.length ?? 0) * ((competences?.length ?? 0) > 14 ? 21 : 27) + 42)], margin: [0, 6, 0, 8] }
    return { stack: [{ text: module.title, style: 'moduleTitle', keepWithNext: true, tocItem: 'report-module' }, { text: `${module.description} · base por competencia`, style: 'note', keepWithNext: true }, ...(competences?.length ? [competenceKpiTable(competences, employer ? 'EMPLEADORES' : 'TITULADOS'), { text: `Figura ${numbering.figure++}. ${visualType === 'radar' ? 'Radar' : visualType === 'heatmap' ? 'Mapa de calor' : 'Media'} por competencia`, style: 'caption' }, visual, { text: `Tabla ${numbering.table++}. Estadísticos por competencia`, style: 'caption' }, competenceTable(competences)] : [{ text: 'Sin datos disponibles', margin: [0, 6, 0, 12] }])], pageBreak: startOnNewPage ? 'before' : undefined }
  }
  const fields = fieldsForModule(module)
  const rows: unknown[][] = [['Variable', 'Base', 'Resumen']]
  const visual: unknown[] = []
  fields.forEach((field) => {
    const rawDistribution = summary?.distributions[field]
    const distribution = rawDistribution ? reportDistribution(field, rawDistribution) : undefined
    if (distribution) {
      const rowHeight = distributionRowHeight(distribution, hideEmptyOptions)
      const accent = module.domain === 'EMPLEADORES' ? '#14a39a' : '#1f6fb5'
      const chartVariant = module.chartVariant ?? 'ranked'
      const chartHeight = categoricalSvgHeight(distribution, rowHeight, hideEmptyOptions, chartVariant)
      const values = Object.entries(distribution.counts).map(([label, count]) => `${reportValueLabel(field, label)}: ${formatInteger(count)} (${formatDecimal(distribution.percentages[label] ?? 0)} %)`).join('\n')
      rows.push([reportFieldLabel(field), formatInteger(distribution.validCount), values || 'Sin respuestas'])
      if (visual.length === 0) visual.push({ text: `Figura ${numbering.figure++}. ${reportFieldLabel(field)}`, style: 'caption' }, { svg: buildReportChartSvg(categoricalSpec(distribution, chartVariant, (label) => reportValueLabel(field, label), hideEmptyOptions, accent)), fit: [720, chartHeight], margin: [0, 8, 0, 8] })
    } else if (summary?.numericAverages[field] != null) {
      rows.push([reportFieldLabel(field), formatInteger(summary.validResponses), `Media: ${formatDecimal(summary.numericAverages[field])} · Mediana: ${formatDecimal(summary.numericMedians[field] ?? 0)}`])
      if (visual.length === 0) visual.push({ text: `Figura ${numbering.figure++}. ${reportFieldLabel(field)}`, style: 'caption' }, { svg: buildReportChartSvg(numericKpiSpec(summary, field)), fit: [720, 110], margin: [0, 8, 0, 8] })
    }
  })
  return {
    stack: [
      { text: module.title, style: 'moduleTitle', keepWithNext: true, tocItem: 'report-module' },
      { text: `${module.description} · base por variable en la tabla`, style: 'note', keepWithNext: true },
      ...(includeSummaryKpis && summary ? [{ text: 'Indicadores principales', style: 'caption' }, summaryKpiTable(summary, module.domain === 'EMPLEADORES' ? 'EMPLEADORES' : 'TITULADOS')] : []),
      ...visual,
      showDataTables ? { stack: [{ text: `Tabla ${numbering.table++}. Datos de ${module.title}`, style: 'caption' }, { table: { headerRows: 1, widths: [170, 45, '*'], body: rows, dontBreakRows: true }, layout: 'lightHorizontalLines', margin: [0, 6, 0, 12] }] } : { text: rows.slice(1).map((row) => `${row[0]}: ${row[2]}`).join('\n') || 'Sin datos disponibles', margin: [0, 6, 0, 12] },
    ],
    pageBreak: startOnNewPage ? 'before' : undefined,
  }
}

export async function createReportPdf(modules: ReportModuleDefinition[], summaries: Map<DatasetDomain, AnalyticsSummaryData>, competences: Map<DatasetDomain, ReportCompetence[]>, comparison: ReportComparison[] | undefined, simulation: Simulation | undefined, cohorts: ReportCohortPoint[] | undefined, employerDashboard: ReportEmployerDashboard | undefined, options: { title: string; showCover: boolean; showDataTables: boolean; hideEmptyOptions: boolean; compactMode: boolean; paper: 'A4' | 'LETTER'; orientation: 'landscape' | 'portrait' | 'auto'; filters: Partial<Record<DatasetDomain, ReportFilters>>; omitted: { module: ReportModuleDefinition; status: ReportModuleAvailability }[]; datasetNames: Partial<Record<DatasetDomain, string>> }) {
  const pdfMake = await loadPdfMake()
  const content: unknown[] = []
  const numbering = { figure: 1, table: 1 }
  if (options.showCover) content.push(
    { text: options.title, style: 'title' },
    { text: `Reporte dinámico · ${new Intl.DateTimeFormat('es-BO', { dateStyle: 'long', timeZone: 'America/La_Paz' }).format(new Date())}`, style: 'subtitle' },
    { text: `Encuestas incluidas: ${[...summaries.keys()].map((domain) => domain === 'TITULADOS' ? 'Titulados' : 'Empleadores').join(' y ') || 'ninguna'}`, style: 'subtitle' },
    ...[...summaries.keys()].map((domain) => ({ text: `${domain === 'TITULADOS' ? 'Titulados' : 'Empleadores'} · dataset: ${options.datasetNames[domain] ?? 'sin nombre'} · filtros: ${filterLabel(domain, options.filters[domain])}`, style: 'subtitle' })),
    { text: '', margin: [0, 0, 0, 12] },
    { toc: { title: { text: 'Contenido', style: 'moduleTitle' }, textStyle: 'note' }, pageBreak: 'after' },
  )
  modules.forEach((module, index) => {
    try {
      const dataDomain = module.domain === 'COMPARACION' || module.domain === 'SIMULACION' ? 'TITULADOS' : module.domain
      const firstInSection = modules.findIndex((candidate) => candidate.domain === module.domain && candidate.section === module.section) === index
      content.push(moduleBlock(module, summaries.get(dataDomain), competences.get(dataDomain), comparison, simulation, cohorts, employerDashboard, options.showDataTables, options.hideEmptyOptions, numbering, firstInSection && (module.section === 'Resumen general' || module.section === 'Resumen y contratación')))
    } catch (cause) {
      console.error(`[Reporte] no se pudo generar el módulo ${module.id}`, cause)
      content.push({ stack: [
        { text: module.title, style: 'moduleTitle', tocItem: 'report-module' },
        { text: 'No se pudo generar este módulo. El resto del reporte continúa disponible.', style: 'errorBox' },
      ], pageBreak: 'before' })
    }
    if (index < modules.length - 1) content.push({ text: '', margin: [0, 4, 0, 4] })
  })
  if (options.omitted.length > 0) {
    content.push({ text: 'Módulos omitidos', style: 'moduleTitle', pageBreak: 'before' })
    content.push({ text: options.omitted.slice(0, 10).map(({ module, status }) => `• ${module.title}: ${statusLabel(status)}`).join('\n'), style: 'note' })
    if (options.omitted.length > 10) content.push({ text: `Se omitieron ${options.omitted.length - 10} módulos adicionales; consulte el panel para ver el detalle.`, style: 'note', margin: [0, 6, 0, 0] })
  }
  const footerFilters = [...summaries.keys()].map((domain) => `${domain === 'TITULADOS' ? 'Titulados' : 'Empleadores'}: ${filterLabel(domain, options.filters[domain])}`).join(' · ')
  const hasWideModule = modules.some((module) => module.kind === 'competence' || module.domain === 'COMPARACION' || module.domain === 'SIMULACION' || module.visualType === 'timeline' || module.visualType === 'grouped' || module.visualType === 'matrix')
  const pageOrientation = options.orientation === 'portrait' ? 'portrait' : options.orientation === 'landscape' || hasWideModule ? 'landscape' : 'portrait'
  const pageMargin = options.compactMode ? 24 : 32
  return pdfMake.createPdf({
    info: { title: options.title, author: 'SimulacionEM' },
    pageSize: options.paper, pageOrientation, pageMargins: [pageMargin, pageMargin, pageMargin, 36],
    defaultStyle: { font: 'Roboto', fontSize: options.compactMode ? 7 : 8, color: '#172033' },
    styles: { title: { fontSize: options.compactMode ? 18 : 20, bold: true, margin: [0, 0, 0, 8] }, subtitle: { fontSize: options.compactMode ? 8 : 9, color: '#52627a', margin: [0, 0, 0, 5] }, moduleTitle: { fontSize: options.compactMode ? 11 : 12, bold: true, margin: [0, options.compactMode ? 5 : 8, 0, 2] }, note: { fontSize: options.compactMode ? 7 : 8, color: '#52627a' }, caption: { fontSize: options.compactMode ? 7 : 8, bold: true, color: '#52627a', margin: [0, 4, 0, 2] }, errorBox: { fontSize: 8, color: '#991b1b', fillColor: '#fef2f2', margin: [0, 6, 0, 12], padding: [8, 8, 8, 8] } },
    footer: (currentPage: number, pageCount: number) => ({ text: `Página ${currentPage} de ${pageCount}${footerFilters ? ` · ${footerFilters}` : ''}`, alignment: 'right', fontSize: 7, color: '#64748b', margin: [pageMargin, 0, pageMargin, 12] }),
    content,
  })
}

function statusLabel(status: ReportModuleAvailability) {
  return status === 'MUESTRA_PEQUENA' ? 'muestra pequeña' : status === 'SIN_DATOS_CON_FILTRO' ? 'sin datos con los filtros actuales' : status === 'SIN_RESPUESTAS' ? 'sin respuestas' : 'dataset o columna no disponible'
}
