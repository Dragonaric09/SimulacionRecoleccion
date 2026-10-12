import { useEffect, useState, type ReactNode } from 'react'
import { BriefcaseBusiness, Building2, GraduationCap, Target } from 'lucide-react'
import { ChartCard, SmallSampleNotice } from '@/components/analytics/ChartCard'
import { MetricCard, type MetricChange } from '@/components/analytics/MetricCard'
import { StatusPanel } from '@/components/analytics/StatusPanel'
import { useDatasets } from '@/features/analitica/shared/AnalyticsPrimitives'
import { EmployerFilterToolbar } from './EmployerFilterToolbar'
import { EmployerPageHeader, NoEmployerDataPanel } from './EmployerPageHeader'
import { useEmployerFilters } from './employerData'
import { useEmployerApi } from './useEmployerApi'
import { DEMANDED_LEVEL_ORDER, ORGANIZATION_SIZE_ORDER } from './instrumento'
import { BalanceBars, DonutChart, EmptyChart, GroupBalanceBars, HiringMatrixBars, RankedBars, TimelineChart } from './dashboard/DashboardCharts'
import { CompetenceLevelBars, CompetenceMeanBars, LevelLegend, SizeCompetenceHeatmap } from './dashboard/CompetenceVisuals'
import { ResponsesTable, type SortKey, type SortState } from './dashboard/ResponsesTable'
import { formatCount, formatDecimal, formatPercent } from './dashboard/dashboardFormat'
import { probabilityLabel, SIZE_SHORT_LABEL, valuationLabel } from './dashboard/labels'
import type { CountItem, DashboardKpi, Distribution, EmployerDashboard, ResponsePage, ValuationStat } from './dashboard/dashboardTypes'

/** Orden de las probabilidades de contratar, de mayor a menor. */
const PROBABILITY_ORDER = [
  'Sí, existe una alta probabilidad de contratación',
  'Sí, dependiendo del crecimiento o nuevos proyectos de la organización',
  'No se tiene prevista la contratación actualmente',
  'No requiere profesionales del área de Sistemas',
]

/** Items de una distribución en un orden fijo (escala). Las categorías sin respuesta aparecen con 0. */
function inOrder(distribution: Distribution, order: readonly string[], labelOf: (value: string) => string = (v) => v) {
  return order.map((value) => {
    const item = distribution.items.find((candidate) => candidate.label === value)
    return { label: labelOf(value), count: item?.count ?? 0, percent: item?.percent ?? 0 }
  })
}

function ranked(items: CountItem[], labelOf: (value: string) => string = (v) => v) {
  return items.map((item) => ({ label: labelOf(item.label), count: item.count, percent: item.percent }))
}

function kpiChange(kpi: DashboardKpi): MetricChange | null {
  if (kpi.change === null) return null
  return { value: kpi.change, format: kpi.changeFormat, unit: kpi.unit }
}

function kpiValue(kpi: DashboardKpi) {
  if (kpi.value === null) return '—'
  if (kpi.unit === 'percent') return formatPercent(kpi.value)
  if (kpi.unit === 'score') return formatDecimal(kpi.value, 2)
  return formatCount(Math.round(kpi.value))
}

export function EmpleadoresDashboardPage() {
  const { datasetId } = useDatasets('EMPLEADORES')
  const filters = useEmployerFilters(datasetId)
  const [sort, setSort] = useState<SortState>({ key: 'fecha', dir: 'desc' })
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(25)

  useEffect(() => {
    setPage(0)
  }, [datasetId, filters.query])

  const dashboardUrl = datasetId
    ? `/analytics/employers/dashboard?datasetId=${encodeURIComponent(datasetId)}${filters.query}`
    : null
  const tableUrl = datasetId
    ? `/analytics/employers/responses?datasetId=${encodeURIComponent(datasetId)}&page=${page}&size=${pageSize}&sort=${sort.key}&dir=${sort.dir}${filters.query}`
    : null
  const dashboard = useEmployerApi<EmployerDashboard>(dashboardUrl)
  const table = useEmployerApi<ResponsePage>(tableUrl)
  const data = dashboard.data

  if (!datasetId) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <EmployerPageHeader title="Resumen y contratación" description="Panel de las organizaciones encuestadas: demanda, contratación, valoración de la Carrera y competencias." />
        <NoEmployerDataPanel />
      </div>
    )
  }

  const onSort = (key: SortKey) => {
    setSort((current) => (current.key === key
      ? { key, dir: current.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: key === 'fecha' ? 'desc' : 'asc' }))
    setPage(0)
  }

  const balanceRows = (data?.valuations ?? []).map((v: ValuationStat) => {
    const scale = v.agree + v.partly + v.disagree
    const share = (count: number) => (scale === 0 ? 0 : (count * 100) / scale)
    return {
      label: valuationLabel(v.key),
      agree: share(v.agree),
      partly: share(v.partly),
      disagree: -share(v.disagree),
      netIndex: v.netIndex,
      base: scale,
    }
  })

  const hiringRows = (() => {
    const cells = data?.hiringByProbability ?? []
    const labels = [...PROBABILITY_ORDER, ...Array.from(new Set(cells.map((c) => c.probability))).filter((p) => !PROBABILITY_ORDER.includes(p))]
    return labels
      .map((probability) => ({
        label: probabilityLabel(probability),
        yes: cells.find((c) => c.probability === probability && c.hired === 'Sí')?.count ?? 0,
        no: cells.find((c) => c.probability === probability && c.hired === 'No')?.count ?? 0,
        unknown: cells.find((c) => c.probability === probability && c.hired === 'Sin respuesta')?.count ?? 0,
      }))
      .filter((row) => row.yes + row.no + row.unknown > 0)
  })()

  const groupRows = (['formacion', 'relacion'] as const).map((group) => {
    const yes = data?.balanceByHiring.find((g) => g.group === group && g.hired === 'Sí')?.netIndex ?? null
    const no = data?.balanceByHiring.find((g) => g.group === group && g.hired === 'No')?.netIndex ?? null
    return { group: group === 'formacion' ? 'Formación y perfil' : 'Relación con la Carrera', yes, no }
  })

  const kpis = data?.kpis ?? []
  const kpiByKey = (key: string) => kpis.find((kpi) => kpi.key === key)
  const respondents = data?.filteredResponses ?? 0

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <EmployerPageHeader
        title="Resumen y contratación"
        description="Panel de las organizaciones encuestadas: demanda, contratación, valoración de la Carrera y competencias."
      />
      <EmployerFilterToolbar
        filters={filters.filters}
        onToggle={filters.toggle}
        onClear={filters.clear}
        active={filters.active}
        validCount={data?.filteredResponses}
        totalCount={data?.totalResponses}
      />
      {dashboard.error && <StatusPanel kind="warning" title="No se pudo cargar el panel" description={dashboard.error} />}
      {dashboard.loading && !data && <StatusPanel kind="loading" title="Cargando el panel" description="Calculando los indicadores sobre todas las respuestas del dataset." />}
      {data && respondents === 0 && <StatusPanel kind="info" title="Ningún registro coincide" description="Cambia o limpia los filtros para ver resultados." />}
      {data && respondents > 0 && respondents < 5 && <SmallSampleNotice count={respondents} />}

      {data && respondents > 0 && (
        <>
          <section aria-label="Indicadores principales" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpiByKey('respuestas') && (
              <MetricCard
                label="Organizaciones encuestadas"
                value={kpiValue(kpiByKey('respuestas')!)}
                icon={Building2}
                change={kpiChange(kpiByKey('respuestas')!)}
                comparison="vs. 7 días anteriores"
                note={`n = ${formatCount(respondents)}`}
                detail={`${formatCount(kpiByKey('respuestas')!.previous ?? 0)} en los 7 días anteriores`}
              />
            )}
            {kpiByKey('contratacion') && (
              <MetricCard
                label="Han contratado en los últimos 5 años"
                value={kpiValue(kpiByKey('contratacion')!)}
                icon={BriefcaseBusiness}
                change={kpiChange(kpiByKey('contratacion')!)}
                comparison="puntos vs. 7 días anteriores"
                note={`Base: ${formatCount(kpiByKey('contratacion')!.base)} respuestas`}
              />
            )}
            {kpiByKey('probabilidad') && (
              <MetricCard
                label="Con alta probabilidad de contratar"
                value={kpiValue(kpiByKey('probabilidad')!)}
                icon={Target}
                change={kpiChange(kpiByKey('probabilidad')!)}
                comparison="puntos vs. 7 días anteriores"
                note={`Base: ${formatCount(kpiByKey('probabilidad')!.base)} respuestas`}
              />
            )}
            {kpiByKey('competencias') && (
              <MetricCard
                label="Competencia media percibida"
                value={kpiValue(kpiByKey('competencias')!)}
                icon={GraduationCap}
                change={kpiChange(kpiByKey('competencias')!)}
                comparison="puntos vs. 7 días anteriores"
                note="Escala 1 a 5, sin «No observado»"
              />
            )}
          </section>

          <section aria-label="Gráficos" className="grid gap-6 lg:grid-cols-3">
            <Panel span={2}>
              <ChartCard
                title={data.timelineGranularity === 'week' ? 'Respuestas por semana' : 'Respuestas por día'}
                n={respondents}
                help="Número de respuestas en cada intervalo (barras) y acumulado de respuestas (línea), según la fecha de envío."
              >
                <TimelineChart points={data.timeline} granularity={data.timelineGranularity} />
              </ChartCard>
            </Panel>
            <Panel>
              <ChartCard title="Tipo de organización" n={data.organizationType.answered} help="Organizaciones públicas o privadas, sobre quienes respondieron la pregunta.">
                <DonutChart items={data.organizationType.items} total={data.organizationType.answered} />
              </ChartCard>
            </Panel>

            <Panel>
              <ChartCard title="Tamaño de la organización" n={data.organizationSize.answered} help="Número de funcionarios, en el orden de la escala de Micro a Grande.">
                <RankedBars items={inOrder(data.organizationSize, ORGANIZATION_SIZE_ORDER, (value) => SIZE_SHORT_LABEL[value] ?? value)} color="#1F6FB5" maxItems={4} labelWidth={130} />
              </ChartCard>
            </Panel>
            <Panel>
              <ChartCard title="Nivel de formación que demanda" n={data.demandedLevel.answered} help="Nivel académico o de actualización que la organización exige para contratar, de menor a mayor.">
                <RankedBars items={inOrder(data.demandedLevel, DEMANDED_LEVEL_ORDER)} maxItems={6} labelWidth={130} />
              </ChartCard>
            </Panel>
            <Panel>
              <ChartCard title="Medio de convocatoria" n={data.channel.answered} help="Medio por el que la organización convoca a profesionales. Base: quienes respondieron la pregunta.">
                <RankedBars items={ranked(data.channel.items)} maxItems={6} labelWidth={170} />
              </ChartCard>
            </Panel>

            <Panel span={2}>
              <ChartCard
                title="Balance de acuerdo por afirmación"
                n={Math.max(0, ...(data.valuations.map((v) => v.agree + v.partly + v.disagree)))}
                help="Porcentaje de acuerdo (derecha) y desacuerdo (izquierda) sobre quienes contestaron la escala. «No sabe» no entra. El índice neto es acuerdo menos desacuerdo, de -100 a 100."
              >
                <BalanceBars rows={balanceRows} />
              </ChartCard>
            </Panel>
            <Panel>
              <ChartCard title="Contratación según probabilidad de contratar" n={data.hiringProbability.answered} help="Cada barra es una respuesta sobre la probabilidad de contratar; el color indica si la organización contrató en los últimos 5 años.">
                <HiringMatrixBars rows={hiringRows} />
              </ChartCard>
            </Panel>

            <Panel>
              <ChartCard title="Índice neto de acuerdo según contratación" help="Acuerdo menos desacuerdo (sobre la escala, sin «No sabe») por grupo de afirmaciones y según si la organización contrató.">
                <GroupBalanceBars rows={groupRows} />
              </ChartCard>
            </Panel>
            <Panel span={2}>
              <ChartCard title="Niveles de suficiencia por competencia" help="Porcentaje de respuestas en cada nivel de la escala 1 (muy insuficiente) a 5 (muy suficiente). «No observado» no entra.">
                <CompetenceLevelBars competences={data.competences} />
                <LevelLegend />
              </ChartCard>
            </Panel>

            <Panel>
              <ChartCard title="Media por competencia" help="Media de la escala 1 a 5 por competencia, de mayor a menor. No incluye «No observado».">
                <CompetenceMeanBars competences={data.competences} />
              </ChartCard>
            </Panel>
            <Panel span={2}>
              <ChartCard title="Media por tamaño y competencia" help="Cada celda es la media de la escala 1 a 5 de las organizaciones de ese tamaño para esa competencia.">
                <SizeCompetenceHeatmap cells={data.sizeCompetence} sizes={[...ORGANIZATION_SIZE_ORDER]} competences={data.competences} sizeLabel={(size) => SIZE_SHORT_LABEL[size] ?? size} />
              </ChartCard>
            </Panel>

            <Panel span={2}>
              <ChartCard title="Rubro o sector principal" n={data.sector.answered} help="Rubro principal de la organización donde trabajan titulados. Base: quienes respondieron la pregunta.">
                <RankedBars items={ranked(data.sector.items)} maxItems={15} labelWidth={260} />
              </ChartCard>
            </Panel>
            <Panel>
              <ChartCard title="Cargos que ocupan los titulados" n={data.positions.answered} help="Cargos marcados por la organización. Una organización puede marcar varios: el porcentaje usa como base a quienes respondieron.">
                {data.positions.items.length === 0 ? <EmptyChart /> : <RankedBars items={ranked(data.positions.items)} maxItems={7} labelWidth={150} />}
                <p className="caption-meta mt-3 text-ink-600">Varias respuestas posibles.</p>
              </ChartCard>
            </Panel>

            <Panel>
              <ChartCard title="Departamento" n={data.department.answered} help="Departamento donde se ubica la organización. Base: quienes respondieron la pregunta.">
                <RankedBars items={ranked(data.department.items)} maxItems={9} labelWidth={120} />
              </ChartCard>
            </Panel>
            <Panel>
              <ChartCard title="Presencia de sedes" n={data.branch.answered} help="Alcance territorial de la organización según sus sedes.">
                <RankedBars items={ranked(data.branch.items)} maxItems={6} labelWidth={170} />
              </ChartCard>
            </Panel>
            <Panel>
              <ChartCard title="Contratación en los últimos 5 años" n={data.hiring.answered} help="Si la organización contrató ingenieros de la Carrera en los últimos 5 años.">
                <RankedBars items={ranked(data.hiring.items)} maxItems={2} labelWidth={80} />
              </ChartCard>
            </Panel>
          </section>
        </>
      )}

      <ResponsesTable
        data={table.data}
        loading={table.loading}
        sort={sort}
        onSort={onSort}
        page={page}
        pageSize={pageSize}
        onPage={setPage}
        onPageSize={(size) => {
          setPageSize(size)
          setPage(0)
        }}
      />
      {table.error && <StatusPanel kind="warning" title="No se pudo cargar la tabla" description={table.error} />}
    </div>
  )
}

function Panel({ span = 1, children }: { span?: 1 | 2 | 3; children: ReactNode }) {
  const spanClass = span === 2 ? 'lg:col-span-2' : span === 3 ? 'lg:col-span-3' : ''
  return <div className={spanClass}>{children}</div>
}
