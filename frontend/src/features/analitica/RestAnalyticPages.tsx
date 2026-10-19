import { useMemo, useState } from 'react'
import {
  BarChart3,
  Dices,
  FlaskConical,
  GraduationCap,
  ListChecks,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/analytics/Badge'
import {
  ChartCardActions,
  VisualizationDataTooltip,
  VisualizationTooltipContent,
} from '@/components/analytics/ChartCard'
import { formatDistributionTooltip } from '@/components/analytics/visualizationTooltip'
import { FilterToolbar } from '@/components/analytics/FilterToolbar'
import { KpiCard } from '@/components/analytics/KpiCard'
import { StatusPanel } from '@/components/analytics/StatusPanel'
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AnalyticsSummary, CategoryDistribution } from './api'
import type { CohortChartPoint, Domain, EmploymentProfile, Tone } from './shared/analyticsTypes'
import { DatasetSelect, PageHeading } from './shared/AnalyticsPrimitives'
import { formatDecimal, formatPercentValue } from './shared/analyticsFormatters'
import { downloadAnalyticsCsv, downloadDistributionCsv } from './shared/analyticsExport'
import {
  EmploymentDistributionVariant,
  MiniDistribution,
  StackedRelevanceCard,
} from './employment/EmploymentCharts'
import { MetricPanel } from './employment/EmploymentDistributionComponents'
import {
  booleanCount,
  countMatching,
  displayLaborLabel,
  formatPercentage,
  laborColor,
  majorityLabel,
  unemploymentReasonColor,
} from './employment/employmentHelpers'
import { useCompetencePage } from './competence/useCompetencePage'
import { CompetenceQuestionChart } from './competence/CompetenceQuestionChart'
import { SatisfactionPanel as SatisfactionPanelView } from './competence/SatisfactionPanels'
import { groupDisplayName, groupLabel } from './competence/competenceHelpers'
import { CompetencePrintGroup, CurriculumPanel } from './competence/CompetencePrintSections'
import {
  ChartVariantSelector,
  CategoricalQuestionChart,
  useChartVariant,
} from '@/components/analytics/charts'
import {
  SimulationComparisonTable,
  SimulationDistribution,
  SimulationHowItWorks,
  SimulationWeights,
} from './simulation/SimulationComponents'
import { simulationCategories } from './simulation/simulationUtils'
import { SimulationDownloadMenu } from './simulation/SimulationDownloads'
import { useSimulationScenario } from './simulation/useSimulationScenario'
export { FinancingCompletePage, FinancingPage } from './financing/FinancingPages'
export { CrossExportPage } from './cross/CrossExportPage'

function CohortTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { payload?: CohortChartPoint }[]
}) {
  const point = payload?.find((entry) => entry.payload)?.payload
  if (!active || !point) return null
  return (
    <div className="grid min-w-[12rem] gap-1 rounded-lg border border-border-line bg-white px-3 py-2 text-xs shadow-xl">
      <VisualizationTooltipContent
        datum={{
          kind: 'scatter',
          label: 'Titulado',
          xLabel: 'Año de titulación',
          xValue: point.graduationYear,
          yLabel: 'Años de vida profesional',
          yValue: point.professionalYears,
          note: point.isOutlier ? 'Valor atípico' : undefined,
        }}
      />
    </div>
  )
}

export function EmploymentTabContent({
  tab,
  summary,
  profile,
  labor,
  sectors,
  unemployed,
  unemploymentSummary,
  firstEmploymentSummary,
  entrepreneurshipSummary,
}: {
  tab: string
  summary: AnalyticsSummary
  profile: EmploymentProfile | null
  labor?: CategoryDistribution
  sectors?: CategoryDistribution
  unemployed: number | null
  unemploymentSummary: AnalyticsSummary | null
  firstEmploymentSummary: AnalyticsSummary | null
  entrepreneurshipSummary: AnalyticsSummary | null
}) {
  if (tab === 'emprendimiento') return <EntrepreneurshipPanel summary={entrepreneurshipSummary} />
  if (tab === 'trabajo') return <CurrentWorkPanel summary={summary} sectors={sectors} />
  if (tab === 'desempleo')
    return <UnemploymentPanel unemployed={unemployed} unemploymentSummary={unemploymentSummary} />
  if (tab === 'primer-empleo')
    return (
      <FirstEmploymentPanel
        summary={summary}
        unemployed={unemployed}
        firstEmploymentSummary={firstEmploymentSummary}
      />
    )
  return (
    <>
      <div className="grid items-start gap-6 lg:grid-cols-12">
        <CohortScatterCard
          points={profile?.cohortPoints ?? []}
          summary={summary}
          className="lg:col-span-8"
        />
        <SenioritySegmentationCard points={profile?.cohortPoints ?? []} className="lg:col-span-4" />
      </div>
      <div className="mt-1 grid items-start gap-6 lg:grid-cols-2">
        <EmploymentDonutCard distribution={labor} total={summary.validResponses} />
        <ProfileDistributionCard
          title="Sector de inserción laboral"
          description="Sector del trabajo actual de las personas tituladas ocupadas"
          distribution={sectors}
        />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-3">
        <AgeDistributionCard distribution={summary.distributions.edad_rango} />
        <GenderDistributionCard distribution={summary.distributions.genero} />
        <CareerTrajectoryCard professional={summary} unemployment={summary} />
      </div>
    </>
  )
}

function EntrepreneurshipPanel({ summary }: { summary: AnalyticsSummary | null }) {
  const total = summary?.validResponses ?? 0
  const origin = summary?.distributions.origen_emprendimiento
  const deliverable = summary?.distributions.entregable_emprendimiento
  const financing = summary?.distributions.financiamiento_emprendimiento
  const satisfaction = summary?.distributions.satisfaccion_emprendimiento
  const importance = summary?.distributions.importancia_formacion_emprendimiento

  return (
    <Card className="rounded-xl border border-border-line shadow-sm">
      <CardHeader className="border-b border-border-line">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="title-card">
              Emprendimiento propio e iniciativas independientes
            </CardTitle>
            <CardDescription>
              Características, financiamiento, satisfacción e impacto formativo · n = {total}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      {total ? (
        <CardContent className="entrepreneurship-grid grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div>
            <h3 className="mb-4 text-sm font-semibold text-ink-900">
              Origen y fuentes de financiamiento
            </h3>
            <div className="space-y-4">
              <EntrepreneurshipDistribution
                label="Origen del emprendimiento"
                distribution={origin}
                color="#1f6fb5"
              />
              <EntrepreneurshipDistribution
                label="Tipo de producto/entregable"
                distribution={deliverable}
              />
              <EntrepreneurshipDistribution
                label="Financiamiento inicial"
                distribution={financing}
              />
            </div>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold text-ink-900">
              Valoración formativa y satisfacción
            </h3>
            <div className="space-y-4">
              <EntrepreneurshipDistribution
                label="Nivel de satisfacción con el emprendimiento"
                distribution={satisfaction}
              />
              <EntrepreneurshipDistribution
                label="Importancia de la formación universitaria"
                distribution={importance}
              />
            </div>
          </div>
        </CardContent>
      ) : (
        <Empty className="py-10">
          <EmptyTitle>Sin respuestas de emprendimiento</EmptyTitle>
          <EmptyDescription>
            No hay personas clasificadas como emprendimiento propio en este dataset.
          </EmptyDescription>
        </Empty>
      )}
    </Card>
  )
}

function EntrepreneurshipDistribution({
  label,
  distribution,
  color = '#1f6fb5',
}: {
  label: string
  distribution?: CategoryDistribution
  color?: string
}) {
  const total = distribution?.validCount ?? 0
  return (
    <div className="entrepreneurship-distribution py-1.5">
      <EmploymentDistributionVariant
        title={
          <>
            {label} <span className="text-xs font-normal text-ink-600">(n = {total})</span>
          </>
        }
        distribution={distribution}
        order={
          label.includes('satisfacción')
            ? ['Insatisfecho', 'Algo satisfecho', 'Satisfecho']
            : label.includes('Importancia')
              ? ['Nada importante', 'Poco importante', 'Importante', 'Muy importante']
              : undefined
        }
        accent={color}
        variants={['bars', 'table']}
        help="Cada barra representa una categoría de la pregunta y su longitud es el porcentaje sobre las respuestas válidas (n). Al pasar el cursor se muestran conteo y porcentaje."
        exportTitle={label}
      />
    </div>
  )
}

function FirstEmploymentPanel({
  summary,
  unemployed,
  firstEmploymentSummary,
}: {
  summary: AnalyticsSummary
  unemployed: number | null
  firstEmploymentSummary: AnalyticsSummary | null
}) {
  const experience =
    summary.distributions.es_primer_empleo ?? summary.distributions.primera_experiencia_laboral
  const timing = firstEmploymentSummary?.distributions.tiempo_primer_empleo
  const employedTotal = Math.max(summary.validResponses - (unemployed ?? 0), 0)
  const continued = experience ? booleanCount(experience, true) : 0
  const continuedPercent = formatPercentage(continued, employedTotal)
  const timingLabels = [
    'Ya trabajaba antes de titularse',
    'Menos de 1 mes',
    'Entre 1 - 4 meses',
    'Entre 4 - 8 meses',
    'Entre 8 - 12 meses',
    'Más de 12 meses',
  ]
  const branchTotal = timing?.validCount ?? 0

  return (
    <Card className="rounded-xl border border-border-line shadow-sm">
      <CardHeader className="border-b border-border-line">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="title-card">
              Transición al primer empleo (rama n = {branchTotal})
            </CardTitle>
            <CardDescription>
              Tiempo transcurrido desde titulación/egreso hasta la primera contratación laboral
            </CardDescription>
          </div>
          <span className="rounded-md bg-surface-container-high px-3 py-1 text-xs font-semibold tabular-nums text-ink-900">
            n = {branchTotal}
          </span>
        </div>
      </CardHeader>
      <CardContent className="first-employment-grid grid items-start gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="h-fit rounded-xl border border-border-line bg-slate-50 shadow-none">
          <CardContent className="p-4">
            <p className="caption-bold uppercase tracking-wide text-primary">
              Continuidad primer empleo
            </p>
            <p className="mt-4 text-4xl font-semibold tabular-nums text-ink-900">
              {continued} de {employedTotal}{' '}
              <span className="text-base font-normal text-ink-600">({continuedPercent})</span>
            </p>
            <p className="mt-2 text-sm text-ink-600">
              De los titulados actualmente ocupados, continúan trabajando en su primer empleo.
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${employedTotal ? (continued / employedTotal) * 100 : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <div className="min-w-0">
          <EmploymentDistributionVariant
            title={
              <>
                Tiempo hasta el primer empleo{' '}
                <span className="text-xs font-normal text-ink-600">(n = {branchTotal})</span>
              </>
            }
            distribution={timing}
            order={timingLabels}
            variants={['bars', 'table']}
            storageKey="titulados-employment-first-job-timing"
            help="Cada barra representa un intervalo temporal, en el orden de la escala; su longitud es el porcentaje de titulados dentro de la base n."
            exportTitle="tiempo-hasta-primer-empleo"
          />
        </div>
      </CardContent>
    </Card>
  )
}

function UnemploymentPanel({
  unemployed,
  unemploymentSummary,
}: {
  unemployed: number | null
  unemploymentSummary: AnalyticsSummary | null
}) {
  const previousExperience = unemploymentSummary?.distributions.primera_experiencia_laboral
  const reasons = unemploymentSummary?.distributions.razon_no_trabaja
  const total = unemploymentSummary?.validResponses ?? unemployed ?? 0
  const previousCount = previousExperience ? booleanCount(previousExperience, true) : null
  const previousPercent = previousCount == null ? null : formatPercentage(previousCount, total)
  const average = unemploymentSummary?.numericAverages.anios_desempleo
  const median = unemploymentSummary?.numericMedians.anios_desempleo
  const deviation = unemploymentSummary?.numericStandardDeviations.anios_desempleo
  return (
    <Card className="rounded-xl border border-border-line shadow-sm">
      <CardHeader className="border-b border-border-line">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="title-card">
              Población sin empleo (n = {unemployed ?? 0})
            </CardTitle>
            <CardDescription>Motivos y antecedentes laborales previos</CardDescription>
          </div>
          <span className="rounded-md bg-surface-container-high px-3 py-1 text-xs font-semibold tabular-nums text-ink-900">
            n = {unemployed ?? 0}
          </span>
        </div>
      </CardHeader>
      <CardContent className="unemployment-grid grid items-start gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="h-fit rounded-xl border border-border-line bg-surface-container-low p-4">
          <p className="label-default uppercase tracking-wider text-titulados">
            Experiencia laboral previa
          </p>
          <p className="mt-4 text-4xl font-semibold tabular-nums text-ink-900">
            {previousCount == null ? '—' : `${previousCount} de ${total}`}{' '}
            {previousPercent && (
              <span className="text-base font-normal text-ink-600">({previousPercent})</span>
            )}
          </p>
          <p className="mt-2 text-sm text-ink-600">
            Han tenido trabajo formal con anterioridad al periodo actual de búsqueda.
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full bg-titulados transition-all duration-500"
              style={{
                width: `${previousCount == null ? 0 : (previousCount / Math.max(total, 1)) * 100}%`,
              }}
            />
          </div>
        </div>
        <div className="min-w-0">
          <EmploymentDistributionVariant
            title={
              <>
                Razones por las que no trabaja{' '}
                <span className="text-xs font-normal text-ink-600">
                  (n = {reasons?.validCount ?? 0})
                </span>
              </>
            }
            distribution={reasons}
            accent={unemploymentReasonColor()}
            variants={['bars', 'table']}
            storageKey="titulados-employment-unemployment-reasons"
            help="Cada barra representa una razón y su longitud es el porcentaje sobre la base n de personas sin empleo; el tooltip muestra el conteo de esa razón."
            exportTitle="razones-por-las-que-no-trabaja"
          />
          <p className="mt-5 border-t border-surface-container-high pt-3 text-xs font-semibold text-ink-700">
            Tiempo en búsqueda activa
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              ['Media', average],
              ['Mediana', median],
              ['DE', deviation],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="caption-meta text-ink-600">{label} · años</p>
                <p className="mt-1 font-semibold tabular-nums text-ink-900">
                  {typeof value === 'number' ? value.toFixed(1).replace('.', ',') : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CurrentWorkPanel({
  summary,
  sectors,
}: {
  summary: AnalyticsSummary
  sectors?: CategoryDistribution
}) {
  const rubro = summary.distributions.rubro_trabajo_actual
  const remuneration = summary.distributions.remuneracion_rango
  const areas = summary.distributions.area_trabajo
  const relevance = summary.distributions.pertinencia_trabajo_formacion
  const workCount =
    rubro?.validCount ?? remuneration?.validCount ?? areas?.validCount ?? sectors?.validCount ?? 0
  return (
    <Card className="rounded-xl border border-border-line shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="title-card">
              Trabajo actual en organizaciones o empresas (n = {workCount})
            </CardTitle>
            <CardDescription>
              Detalles de contratación, áreas, remuneración y pertinencia
            </CardDescription>
          </div>
          <Badge tone="titulados">n = {workCount}</Badge>
        </div>
      </CardHeader>
      <CardContent className="work-current-grid grid gap-x-6 gap-y-8 border-t border-surface-container-high pt-5 lg:grid-cols-2">
        <MiniDistribution
          title="Rubro de la empresa"
          distribution={rubro}
          storageKey="titulados-employment-current-sector"
        />
        <MiniDistribution
          title="Remuneración mensual líquida"
          distribution={remuneration}
          accent="amber"
          storageKey="titulados-employment-remuneration"
        />
        <MiniDistribution
          title="Áreas dentro de la organización"
          distribution={areas}
          accent="purple"
          note="Varias respuestas posibles"
          storageKey="titulados-employment-areas"
          variants={['bars', 'table']}
        />
        <StackedRelevanceCard
          distribution={relevance}
          storageKey="titulados-employment-relevance"
        />
      </CardContent>
    </Card>
  )
}

function CohortScatterCard({
  points,
  summary,
  className = '',
}: {
  points: EmploymentProfile['cohortPoints']
  summary: AnalyticsSummary
  className?: string
}) {
  const years = points.map((point) => point.graduationYear)
  const values = points.map((point) => point.professionalYears)
  const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
  const sorted = [...values].sort((a, b) => a - b)
  const median = sorted.length
    ? sorted.length % 2
      ? sorted[(sorted.length - 1) / 2]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : 0
  const standardDeviation =
    values.length > 1
      ? Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1))
      : 0
  const yearMin = years.length ? Math.min(...years) : 0
  const yearMax = years.length ? Math.max(...years) : 1
  // No mostramos un tick por año cuando la cohorte abarca muchos años:
  // evita que las etiquetas se encimen en el contenedor web y en el PDF.
  const yearSpan = Math.max(1, yearMax - yearMin + 1)
  const yearTickStep = Math.max(1, Math.ceil(yearSpan / 8))
  const yearTicks = Array.from(
    { length: Math.floor((yearMax - yearMin) / yearTickStep) + 1 },
    (_, index) => yearMin + index * yearTickStep,
  )
  if (yearTicks[yearTicks.length - 1] !== yearMax) yearTicks.push(yearMax)
  const sameReferenceValue = Math.abs(mean - median) < 0.0001
  const chartData: CohortChartPoint[] = points.map((point) => ({
    graduationYear: point.graduationYear,
    professionalYears: point.professionalYears,
    isOutlier: point.professionalYears > mean + standardDeviation,
  }))
  const outlierPoints = chartData.filter((point) => point.isOutlier)
  const [variant, setVariant] = useChartVariant('titulados-employment-cohort', 'scatter', [
    'scatter',
    'table',
  ] as const)
  const chartConfig = {
    professionalYears: {
      label: 'Años de vida profesional',
      color: '#1f6fb5',
    },
  }
  const renderScatterChart = (fixed = false) => (
    <ScatterChart
      {...(fixed ? { width: 960, height: 320 } : {})}
      margin={{ top: 18, right: fixed ? 28 : 18, bottom: fixed ? 34 : 30, left: fixed ? 52 : 18 }}
    >
      <CartesianGrid stroke="#dbe4ee" strokeDasharray="2 4" />
      <XAxis
        type="number"
        dataKey="graduationYear"
        domain={[yearMin - 0.5, yearMax + 0.5]}
        ticks={yearTicks}
        interval={0}
        tick={{ fill: '#0f172a', fontSize: 11 }}
        tickMargin={8}
        allowDecimals={false}
        label={{
          value: 'Año de titulación',
          position: 'insideBottom',
          offset: -18,
          fill: '#475569',
          fontSize: 11,
        }}
      />
      <YAxis
        type="number"
        dataKey="professionalYears"
        domain={[0, Math.max(1, Math.ceil(Math.max(...values, 0)))]}
        tick={{ fill: '#64748b', fontSize: 10 }}
        width={fixed ? 44 : 28}
        allowDecimals={false}
        label={{
          value: 'Años de vida profesional',
          angle: -90,
          position: 'insideLeft',
          fill: '#475569',
          fontSize: 11,
        }}
      />
      {sameReferenceValue ? (
        <ReferenceLine
          y={mean}
          stroke="#7c3aed"
          strokeDasharray="5 4"
          label={{
            value: `Media = mediana: ${formatDecimal(mean, 1)} años`,
            fill: '#6d28d9',
            fontSize: 11,
            position: 'insideTopLeft',
          }}
        />
      ) : (
        <>
          <ReferenceLine
            y={mean}
            stroke="#ef4444"
            strokeDasharray="5 4"
            label={{
              value: `Media ${formatDecimal(mean, 1)} años`,
              fill: '#ef4444',
              fontSize: 11,
              position: 'insideTopLeft',
            }}
          />
          <ReferenceLine
            y={median}
            stroke="#14a39a"
            strokeDasharray="3 4"
            label={{
              value: `Mediana ${formatDecimal(median, 1)} años`,
              fill: '#0f766e',
              fontSize: 11,
              position: 'insideBottomRight',
            }}
          />
        </>
      )}
      <Scatter
        name="Titulado individual"
        data={chartData}
        dataKey="professionalYears"
        fill="#1f6fb5"
        line={false}
        shape={(props: { cx?: number; cy?: number; payload?: { isOutlier?: boolean } }) => (
          <circle
            cx={props.cx}
            cy={props.cy}
            r={props.payload?.isOutlier ? 4.5 : 4}
            fill={props.payload?.isOutlier ? '#dc2626' : '#1f6fb5'}
            stroke="#ffffff"
            strokeWidth={1.5}
          />
        )}
        isAnimationActive={false}
      />
      {!fixed && <ChartTooltip content={<CohortTooltip />} />}
    </ScatterChart>
  )
  return (
    <Card className={`rounded-xl border-0 shadow-sm ${className}`}>
      <CardHeader className="cohort-card-header">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="title-card">Años de vida profesional por cohorte</CardTitle>
            <CardDescription>
              Experiencia profesional según año de titulación · n = {points.length}
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ChartVariantSelector
              value={variant}
              options={['scatter', 'table'] as const}
              labels={{ scatter: 'Puntos', table: 'Tabla' }}
              onChange={setVariant}
            />
            <ChartCardActions
              title="Años de vida profesional por cohorte"
              help="Cada punto representa un titulado: su posición horizontal es el año de titulación y la vertical, los años de vida profesional. Las líneas marcan media y mediana; los puntos rojos superan una desviación estándar sobre la media."
              onExportCsv={() =>
                downloadAnalyticsCsv(
                  'vida-profesional-por-cohorte',
                  ['Año de titulación', 'Años de vida profesional', 'Valor atípico'],
                  chartData.map((point) => [
                    point.graduationYear,
                    point.professionalYears,
                    point.isOutlier ? 'Sí' : 'No',
                  ]),
                )
              }
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-3 divide-x divide-border-line rounded-lg border border-border-line bg-slate-50 py-3">
          {[
            ['Media', summary.numericAverages.anios_vida_profesional],
            ['Mediana', summary.numericMedians.anios_vida_profesional],
            ['Desviación estándar', summary.numericStandardDeviations.anios_vida_profesional],
          ].map(([label, value]) => (
            <div key={label} className="px-3 text-center">
              <p className="text-xs text-ink-600">{label}</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-ink-900">
                {typeof value === 'number' ? formatDecimal(value, 1) : '—'}
                <span className="ml-1 text-xs font-medium text-ink-600">años</span>
              </p>
            </div>
          ))}
        </div>
        {points.length ? (
          <>
            {variant === 'table' ? (
              <div className="overflow-x-auto rounded-lg border border-border-line bg-slate-50 p-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-line text-left text-xs text-ink-600">
                      <th className="p-2">Año de titulación</th>
                      <th className="p-2 text-right">Años de vida profesional</th>
                      <th className="p-2">Clasificación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartData.map((point, index) => (
                      <tr
                        key={`${point.graduationYear}-${point.professionalYears}-${index}`}
                        className="border-b border-surface-container-high"
                      >
                        <td className="p-2 tabular-nums">{point.graduationYear}</td>
                        <td className="p-2 text-right tabular-nums">
                          {formatDecimal(point.professionalYears, 1)} años
                        </td>
                        <td className="p-2">{point.isOutlier ? 'Valor atípico' : 'Observación'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-border-line bg-slate-50 p-2">
                <div className="cohort-responsive-chart">
                  <ChartContainer
                    config={chartConfig}
                    className="h-72 w-full min-w-0 aspect-auto"
                    initialDimension={{ width: 760, height: 286 }}
                  >
                    {renderScatterChart()}
                  </ChartContainer>
                </div>
                <div className="cohort-fixed-chart" aria-label="Gráfico de cohorte para impresión">
                  {renderScatterChart(true)}
                </div>
              </div>
            )}
            {variant === 'scatter' && (
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-600">
                <span>
                  <i className="mr-1 inline-block size-2 rounded-full bg-titulados" />
                  Titulado individual
                </span>
                {outlierPoints.length > 0 && (
                  <span>
                    <i className="mr-1 inline-block size-2 rounded-full bg-red-600" />
                    Valor atípico
                  </span>
                )}
                {sameReferenceValue ? (
                  <span>
                    <i className="mr-1 inline-block w-4 border-t-2 border-dashed border-violet-600" />
                    Media = mediana: {formatDecimal(mean, 1)} años
                  </span>
                ) : (
                  <>
                    <span>
                      <i className="mr-1 inline-block w-4 border-t-2 border-dashed border-red-500" />
                      Media
                    </span>
                    <span>
                      <i className="mr-1 inline-block w-4 border-t-2 border-dashed border-teal-600" />
                      Mediana
                    </span>
                  </>
                )}
              </div>
            )}
            {variant === 'scatter' && (
              <div className="cohort-print-values" aria-label="Valores del gráfico por titulado">
                {points.map((point, index) => (
                  <span key={`${point.graduationYear}-${point.professionalYears}-${index}`}>
                    {point.graduationYear}: {point.professionalYears} años
                    {chartData[index]?.isOutlier ? ' · atípico' : ''}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-ink-600">
            No hay registros numéricos suficientes para dibujar la cohorte.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function SenioritySegmentationCard({
  points,
  className = '',
}: {
  points: EmploymentProfile['cohortPoints']
  className?: string
}) {
  const [threshold, setThreshold] = useState(5)
  const junior = points.filter((point) => point.professionalYears <= threshold).length
  const consolidated = Math.max(0, points.length - junior)
  const percent = (value: number) => (points.length ? (value / points.length) * 100 : 0)
  return (
    <Card className={`h-fit rounded-xl border border-border-line shadow-sm ${className}`}>
      <CardHeader>
        <CardTitle className="title-card">Segmentación de titulados por antigüedad</CardTitle>
        <CardDescription>
          Clasificación según años de ejercicio profesional posterior al egreso
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="print-hide rounded-lg border border-border-line bg-slate-50 p-3">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Umbral de corte experiencia</span>
            <span className="rounded bg-white px-2 py-1 text-titulados">{threshold} años</span>
          </div>
          <Slider
            className="mt-3"
            min={3}
            max={8}
            step={1}
            value={[threshold]}
            onValueChange={([value]) => setThreshold(value)}
          />
          <div className="flex justify-between text-xs text-ink-600">
            <span>3 años (Reciente)</span>
            <span>5 años (Estándar)</span>
            <span>8 años (Senior)</span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border-line bg-slate-50 p-3">
            <p className="caption-bold text-titulados">JUNIOR / RECIENTE</p>
            <p className="display-kpi tabular-nums text-ink-900">
              {formatPercentValue(percent(junior))}
            </p>
            <p className="text-xs text-ink-600">
              {junior} de {points.length} titulados (≤ {threshold}a)
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-titulados"
                style={{ width: `${percent(junior)}%` }}
              />
            </div>
          </div>
          <div className="rounded-lg border border-border-line bg-slate-50 p-3">
            <p className="caption-bold text-ink-900">CONSOLIDADO</p>
            <p className="display-kpi tabular-nums text-ink-900">
              {formatPercentValue(percent(consolidated))}
            </p>
            <p className="text-xs text-ink-600">
              {consolidated} de {points.length} titulados (&gt; {threshold}a)
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-slate-800"
                style={{ width: `${percent(consolidated)}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-between border-t border-surface-container-high pt-2 text-xs text-ink-600">
          <span>Corte metodológico parametrizable</span>
          <strong className="text-ink-900">Total = {points.length}</strong>
        </div>
      </CardContent>
    </Card>
  )
}

const UsersIcon = Users
const GraduationIcon = GraduationCap
void UsersIcon
void GraduationIcon

function ProfileDistributionCard({
  title,
  description,
  distribution,
  className = '',
}: {
  title: string
  description: string
  distribution?: CategoryDistribution
  className?: string
}) {
  const validCount = distribution?.validCount ?? 0
  const smallSample = validCount > 0 && validCount < 5
  return (
    <Card
      className={`h-fit rounded-xl border-0 shadow-sm ${smallSample ? 'border border-amber-300' : ''} ${className}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="title-card">{title}</CardTitle>
          {smallSample && <Badge tone="warning">Muestra pequeña · n = {validCount}</Badge>}
        </div>
        <CardDescription>
          {description} <span className="whitespace-nowrap">· n = {validCount}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EmploymentDistributionVariant
          distribution={distribution}
          variants={['bars', 'table']}
          storageKey={`titulados-employment-profile-${title}`}
          help="Cada barra representa un sector y su longitud es el porcentaje de personas ocupadas que lo declaró; el tooltip muestra también el conteo y la base n."
          exportTitle={title}
        />
      </CardContent>
    </Card>
  )
}

function EmploymentDonutCard({
  distribution,
  total,
  className = '',
}: {
  distribution?: CategoryDistribution
  total: number
  className?: string
}) {
  const entries = useMemo(() => Object.entries(distribution?.counts ?? {}), [distribution])
  const employed = distribution
    ? countMatching(
        distribution,
        ['trabaja', 'organización', 'empresa', 'emprend'],
        ['no trabaja', 'búsqueda', 'desemple'],
      )
    : 0
  const occupiedPercent = total ? (employed / total) * 100 : 0
  const chartData = entries.map(([label, value]) => ({ label, value }))
  const chartConfig = Object.fromEntries(
    entries.map(([label]) => [label, { label, color: laborColor(label) }]),
  )
  const [variant, setVariant] = useChartVariant('titulados-employment-status', 'ranked', [
    'ranked',
    'donut',
    'table',
  ] as const)
  const chartItems = entries.map(([label, count]) => ({
    label: displayLaborLabel(label),
    count,
    total,
    percent: distribution?.percentages[label] ?? 0,
  }))
  return (
    <Card className={`h-fit rounded-xl border-0 shadow-sm ${className}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="title-card">Estado laboral</CardTitle>
            <CardDescription>Situación ocupacional declarada · n = {total}</CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ChartVariantSelector
              value={variant}
              options={['ranked', 'donut', 'table'] as const}
              labels={{ donut: 'Donut', ranked: 'Barras', table: 'Tabla' }}
              onChange={setVariant}
            />
            <ChartCardActions
              title="Estado laboral"
              help="En barras, cada situación laboral ocupa una fila y su longitud es el porcentaje sobre n. En la dona, cada arco representa ese mismo porcentaje; el centro muestra la tasa agrupada de ocupación."
              onExportCsv={() => downloadDistributionCsv('estado-laboral', chartItems, total)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-5 sm:flex-row">
        {variant !== 'donut' ? (
          <div className="w-full">
            <CategoricalQuestionChart
              items={chartItems}
              total={total}
              categoryColors={entries.map(([label]) => laborColor(label))}
              variants={[variant]}
              variant={variant}
              showSelector={false}
            />
          </div>
        ) : (
          <div className="relative size-36 shrink-0">
            <div className="employment-donut-responsive absolute inset-0">
              <ChartContainer config={chartConfig} className="aspect-square">
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        nameKey="label"
                        formatter={(value) =>
                          formatDistributionTooltip(
                            { count: Number(value), total },
                            undefined,
                            'donut',
                          )
                        }
                      />
                    }
                  />
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={48}
                    outerRadius={68}
                    stroke="none"
                    isAnimationActive={false}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.label} fill={laborColor(entry.label)} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            </div>
            <div
              className="employment-donut-fixed absolute inset-0"
              aria-label="Dona de estado laboral para impresión"
            >
              <PieChart width={144} height={144}>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={68}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.label} fill={laborColor(entry.label)} />
                  ))}
                </Pie>
              </PieChart>
            </div>
            <div className="absolute inset-0 m-auto flex size-24 flex-col items-center justify-center rounded-full bg-white">
              <span className="title-card tabular-nums">{formatPercentValue(occupiedPercent)}</span>
              <span className="caption-meta uppercase text-ink-600">Ocupados</span>
            </div>
          </div>
        )}
        {variant === 'donut' && (
          <div className="min-w-0 w-full space-y-2">
            {entries.map(([label, count]) => (
              <VisualizationDataTooltip
                key={label}
                datum={{
                  kind: 'donut',
                  label: displayLaborLabel(label),
                  count,
                  total,
                  percent: distribution?.percentages[label],
                }}
              >
                <div className="flex items-center justify-between gap-3 rounded-lg border border-border-line bg-surface-container-low px-3 py-2 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="size-3 shrink-0 rounded-sm"
                      style={{ backgroundColor: laborColor(label) }}
                    />
                    <span className="break-words">{displayLaborLabel(label)}</span>
                  </div>
                  <span className="tabular-nums whitespace-nowrap font-semibold">
                    {count}{' '}
                    <span className="caption-meta text-ink-600">
                      ({formatPercentValue(distribution?.percentages[label] ?? 0)})
                    </span>
                  </span>
                </div>
              </VisualizationDataTooltip>
            ))}
          </div>
        )}
      </CardContent>
      <div className="mx-6 border-t border-surface-container-high py-3 text-xs text-ink-600">
        Tasa de personas ocupadas: {employed} de {total} titulados
      </div>
    </Card>
  )
}

function AgeDistributionCard({ distribution }: { distribution?: CategoryDistribution }) {
  return (
    <Card className="h-fit rounded-xl border border-border-line shadow-sm">
      <CardHeader>
        <CardTitle className="title-card">
          Distribución por edad (n = {distribution?.validCount ?? 0})
        </CardTitle>
        <CardDescription>Rangos de edad en orden cronológico</CardDescription>
      </CardHeader>
      <CardContent>
        <EmploymentDistributionVariant
          distribution={distribution}
          order={[
            '15 - 18 años',
            '19 - 22 años',
            '23 - 26 años',
            '27 - 30 años',
            '31 - 34 años',
            '35 años o más',
          ]}
          variants={['bars', 'table']}
          storageKey="titulados-employment-age"
          help="Cada barra representa un rango de edad en orden cronológico; su longitud es el porcentaje sobre las respuestas válidas y el tooltip muestra conteo y n."
          exportTitle="distribucion-por-edad"
        />
      </CardContent>
      <CardContent className="flex justify-between border-t border-surface-container-high py-3 text-xs text-ink-600">
        <span>Grupo mayoritario: {majorityLabel(distribution)}</span>
        <strong className="text-ink-900">n = {distribution?.validCount ?? 0}</strong>
      </CardContent>
    </Card>
  )
}

function GenderDistributionCard({ distribution }: { distribution?: CategoryDistribution }) {
  const entries = Object.entries(distribution?.counts ?? {})
  const total = distribution?.validCount ?? 0
  const [variant, setVariant] = useChartVariant('titulados-employment-gender', 'donut', [
    'donut',
    'ranked',
    'table',
  ] as const)
  const chartItems = entries.map(([label, count]) => ({
    label,
    count,
    total,
    percent: distribution?.percentages[label] ?? 0,
  }))
  let offset = 0
  const segments = entries.map(([label]) => {
    const percentage = distribution?.percentages[label] ?? 0
    const segment = `${label.toLowerCase().includes('muj') ? '#8b5bd1' : '#1f6fb5'} ${offset}% ${offset + percentage}%`
    offset += percentage
    return segment
  })
  return (
    <Card className="h-fit rounded-xl border border-border-line shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="title-card">Género (n = {total})</CardTitle>
            <CardDescription>Composición declarada en encuesta</CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ChartVariantSelector
              value={variant}
              options={['donut', 'ranked', 'table'] as const}
              labels={{ donut: 'Donut', ranked: 'Barras', table: 'Tabla' }}
              onChange={setVariant}
            />
            <ChartCardActions
              title="Género"
              help="Cada arco de la dona representa el porcentaje de respuestas de un género sobre n. La leyenda muestra el conteo y el porcentaje; las barras representan la misma distribución en longitud."
              onExportCsv={() => downloadDistributionCsv('genero', chartItems, total)}
            />
          </div>
        </div>
      </CardHeader>
      {variant !== 'donut' ? (
        <CardContent>
          <CategoricalQuestionChart
            items={chartItems}
            total={total}
            categoryColors={['#8b5bd1', '#1f6fb5']}
            variants={[variant]}
            variant={variant}
            showSelector={false}
          />
        </CardContent>
      ) : (
        <CardContent className="flex items-center justify-center gap-5 py-5">
          <div
            className="relative flex size-28 shrink-0 items-center justify-center rounded-full"
            style={{
              background: entries.length ? `conic-gradient(${segments.join(', ')})` : '#e2e8f0',
            }}
          >
            <div className="flex size-20 flex-col items-center justify-center rounded-full bg-white">
              <span className="title-card tabular-nums">{total}</span>
              <span className="caption-meta uppercase text-ink-600">Total</span>
            </div>
          </div>
          <div className="min-w-0 space-y-2">
            {entries.map(([label, count]) => (
              <VisualizationDataTooltip
                key={label}
                datum={{
                  kind: 'donut',
                  label,
                  count,
                  total,
                  percent: distribution?.percentages[label],
                }}
              >
                <div className="flex items-center gap-2 rounded border border-border-line bg-surface-container-low px-2.5 py-2 text-sm">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor: label.toLowerCase().includes('muj') ? '#8b5bd1' : '#1f6fb5',
                    }}
                  />
                  <span className="min-w-0 break-words">
                    {label}: <strong>{count}</strong>{' '}
                    <span className="text-xs">
                      ({formatPercentValue(distribution?.percentages[label] ?? 0)})
                    </span>
                  </span>
                </div>
              </VisualizationDataTooltip>
            ))}
          </div>
        </CardContent>
      )}
      <CardContent className="flex justify-between border-t border-surface-container-high py-3 text-xs text-ink-600">
        <span>
          {entries
            .map(
              ([label]) => `${label}: ${formatPercentValue(distribution?.percentages[label] ?? 0)}`,
            )
            .join(' · ')}
        </span>
        <strong className="text-ink-900">n = {total}</strong>
      </CardContent>
    </Card>
  )
}

function CareerTrajectoryCard({
  professional,
  unemployment,
}: {
  professional: AnalyticsSummary
  unemployment: AnalyticsSummary
}) {
  const professionalDeviation = professional.numericStandardDeviations.anios_vida_profesional
  const unemploymentDeviation = unemployment.numericStandardDeviations.anios_desempleo
  return (
    <Card className="h-fit rounded-xl border border-border-line shadow-sm">
      <CardHeader>
        <CardTitle className="title-card">Trayectoria y búsqueda</CardTitle>
        <CardDescription>Años de ejercicio y periodos sin empleo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <MetricPanel
          title="Vida profesional"
          average={professional.numericAverages.anios_vida_profesional}
          median={professional.numericMedians.anios_vida_profesional}
          deviation={professionalDeviation}
        />
        <MetricPanel
          title="Tiempo en búsqueda activa"
          average={unemployment.numericAverages.anios_desempleo}
          median={unemployment.numericMedians.anios_desempleo}
          deviation={unemploymentDeviation}
        />
      </CardContent>
      <CardContent className="flex justify-between border-t border-surface-container-high py-3 text-xs text-ink-600">
        <span>Parámetros calculados en años calendario</span>
        <strong className="text-ink-900">Base válida</strong>
      </CardContent>
    </Card>
  )
}

export function CompetencePage({
  domain,
  printAll = false,
}: {
  domain: Domain
  printAll?: boolean
}) {
  const {
    tone,
    datasets,
    datasetId,
    setDatasetId,
    loading: datasetsLoading,
    setFilterQuery,
    activeGroup,
    setActiveGroup,
    activeTab,
    setActiveTab,
    items,
    satisfaction,
    curriculum,
    error,
    tabGroup,
    visibleItems,
    average,
    lowest,
    highest,
    tabs,
  } = useCompetencePage(domain)
  if (printAll && domain === 'TITULADOS')
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <PageHeading
          title="Brechas de competencias"
          description="Competencias, satisfacción, pertinencia y malla curricular."
          tone={tone}
        />
        {satisfaction && !printAll && (
          <FilterToolbar summary={satisfaction} onQueryChange={setFilterQuery} />
        )}
        {(['hard', 'soft'] as const).map((key) => {
          const group = tabGroup(key)
          const groupItems = items
            .filter((item) => item.group === group)
            .sort((a, b) => b.average - a.average)
          return (
            <section key={key} className="print-tab-section">
              <h2 className="title-card mb-3">{key === 'hard' ? 'Hard skills' : 'Soft skills'}</h2>
              <CompetencePrintGroup items={groupItems} group={group ?? ''} tone={tone} />
            </section>
          )
        })}
        <section className="print-tab-section">
          <h2 className="title-card mb-3">Satisfacción y pertinencia</h2>
          <SatisfactionPanelView summary={satisfaction} />
        </section>
        <section className="print-tab-section">
          <h2 className="title-card mb-3">Malla y asignaturas</h2>
          <CurriculumPanel summary={curriculum} />
        </section>
      </div>
    )
  if (activeTab === 'satisfaccion' || activeTab === 'malla')
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <PageHeading
            title="Brechas de competencias"
            description={
              activeTab === 'malla'
                ? 'Aspectos útiles, oportunidades de mejora y asignaturas relevantes de la carrera.'
                : 'Satisfacción global y pertinencia con el mercado laboral.'
            }
            tone={tone}
          />
        </div>
        <DatasetSelect
          datasets={datasets}
          value={datasetId}
          onChange={setDatasetId}
          loading={datasetsLoading}
        />
        {domain === 'TITULADOS' && (satisfaction ?? curriculum) && (
          <FilterToolbar summary={(satisfaction ?? curriculum)!} onQueryChange={setFilterQuery} />
        )}
        <Tabs
          value={activeTab}
          onValueChange={(key) => {
            setActiveTab(key)
            const group = tabGroup(key)
            if (group) setActiveGroup(group)
          }}
        >
          <TabsList variant="line" className="w-full justify-start">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {activeTab === 'satisfaccion' ? (
          <SatisfactionPanelView summary={satisfaction} />
        ) : (
          <CurriculumPanel summary={curriculum} />
        )}
      </div>
    )
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <PageHeading
          title="Brechas de competencias"
          description={
            domain === 'EMPLEADORES'
              ? 'Medias y desviaciones estándar por competencia. Los valores no observados se excluyen del cálculo.'
              : 'Medias y desviaciones estándar por competencia.'
          }
          tone={tone}
        />
      </div>
      <DatasetSelect
        datasets={datasets}
        value={datasetId}
        onChange={setDatasetId}
        loading={datasetsLoading}
      />
      {domain === 'TITULADOS' && !printAll && (satisfaction || curriculum) && (
        <FilterToolbar summary={(satisfaction ?? curriculum)!} onQueryChange={setFilterQuery} />
      )}
      {datasetsLoading && (
        <StatusPanel
          kind="loading"
          title="Cargando competencias"
          description="Consultando las valoraciones del dataset."
        />
      )}
      {error && (
        <StatusPanel kind="warning" title="No se pudo cargar competencias" description={error} />
      )}
      {!datasetsLoading && !error && !datasetId && (
        <StatusPanel
          kind="info"
          title="Sin dataset seleccionado"
          description="Selecciona o importa un dataset para mostrar la tabla."
        />
      )}
      {items.length > 0 && (
        <>
          <Tabs
            value={activeTab}
            onValueChange={(key) => {
              setActiveTab(key)
              const group = tabGroup(key)
              if (group) setActiveGroup(group)
            }}
          >
            <TabsList variant="line" className="w-full justify-start">
              {tabs.map((tab) => {
                const group = tabGroup(tab.key)
                const available =
                  Boolean(group) ||
                  (domain === 'TITULADOS' && (tab.key === 'satisfaccion' || tab.key === 'malla'))
                return (
                  <TabsTrigger key={tab.key} value={tab.key} disabled={!available}>
                    {tab.label}
                    {!available && (
                      <span className="text-[10px] uppercase tracking-wide">Próximamente</span>
                    )}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
          {!tabGroup(activeTab) ? (
            <StatusPanel
              kind="info"
              title="Sección preparada"
              description="Esta pestaña forma parte del prototipo, pero todavía no existe un endpoint con los datos necesarios para mostrarla."
            />
          ) : (
            <>
              <div className="competence-kpi-grid grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="h-full">
                  <KpiCard
                    label="Competencias evaluadas"
                    value={String(visibleItems.length)}
                    detail={`${groupDisplayName(activeGroup)} evaluadas`}
                    icon={ListChecks}
                    tone={tone}
                  />
                </div>
                <div className="h-full">
                  <KpiCard
                    label={`Promedio de ${groupDisplayName(activeGroup)}`}
                    value={average ? `${formatDecimal(average)} de 5` : '—'}
                    detail={`Promedio de las ${visibleItems.length} competencias`}
                    icon={BarChart3}
                    tone={tone}
                  />
                </div>
                <div className="h-full">
                  <KpiCard
                    label="Competencia más baja"
                    value={lowest ? formatDecimal(lowest.average) : '—'}
                    detail={lowest?.name ?? 'Sin datos'}
                    icon={TrendingDown}
                    tone={tone}
                  />
                </div>
                <div className="h-full">
                  <KpiCard
                    label="Competencia más alta"
                    value={highest ? formatDecimal(highest.average) : '—'}
                    detail={highest?.name ?? 'Sin datos'}
                    icon={TrendingUp}
                    tone={tone}
                  />
                </div>
              </div>
              <CompetenceQuestionChart
                items={visibleItems}
                group={groupLabel(activeGroup)}
                storageKey={`simulacionem.chartVariant.titulados.competence.${activeGroup}`}
                help="En el mapa de calor, cada celda muestra el número de respuestas de una competencia en ese nivel; una tonalidad más intensa significa más respuestas dentro de esa misma columna. El radar ubica la media de cada competencia en una escala de 1 a 5."
                onExportCsv={() =>
                  downloadAnalyticsCsv(
                    `competencias-${groupLabel(activeGroup)}`,
                    [
                      'Código',
                      'Competencia',
                      'Media',
                      'Mediana',
                      'Desviación estándar',
                      'Respuestas válidas',
                    ],
                    visibleItems.map((item) => [
                      item.code,
                      item.name,
                      item.average,
                      item.median,
                      item.standardDeviation,
                      item.validCount,
                    ]),
                  )
                }
              />
            </>
          )}
        </>
      )}
    </div>
  )
}

export function SimulationPage() {
  const {
    datasets,
    datasetId,
    setDatasetId,
    datasetsLoading,
    summary,
    variable,
    setVariable,
    segment,
    setSegment,
    weights,
    setWeights,
    sampleSize,
    sampleSizeInput,
    setSampleSizeInput,
    setSampleSize,
    repetitions,
    repetitionsInput,
    setRepetitionsInput,
    setRepetitions,
    seed,
    seedInput,
    setSeedInput,
    setSeed,
    result,
    scenarioPercentages,
    executedRun,
    error,
    sampleSizeValid,
    repetitionsValid,
    seedValid,
    parseInteger,
  } = useSimulationScenario()
  const [scenarioName, setScenarioName] = useState('Observado')
  const [moveFrom, setMoveFrom] = useState('')
  const [moveTo, setMoveTo] = useState('')
  const [movePoints, setMovePoints] = useState('10')
  const currentDistribution = summary?.distributions[variable]
  const observedBase = currentDistribution?.validCount ?? 0
  const selectScenario = (value: string) => {
    setScenarioName(value)
    if (!currentDistribution || value === 'Observado') {
      setWeights({})
      return
    }
    const categories = simulationCategories(variable, currentDistribution.counts)
    const total = categories.reduce(
      (sum, category) => sum + (currentDistribution.counts[category] ?? 0),
      0,
    )
    if (value === 'Más muestra') {
      setSampleSize(1000)
      setSampleSizeInput('1000')
      return
    }
    if (value === 'Igualar categorías') {
      setWeights(
        Object.fromEntries(
          categories.map((category) => [category, total / Math.max(categories.length, 1)]),
        ),
      )
      return
    }
    if (value === 'Líder +10 puntos') {
      const ranked = [...categories].sort(
        (a, b) => (currentDistribution.counts[b] ?? 0) - (currentDistribution.counts[a] ?? 0),
      )
      const leader = ranked[0]
      const next = ranked[1]
      if (leader && next) {
        const amount = Math.min(currentDistribution.counts[next] ?? 0, total * 0.1)
        const weights = Object.fromEntries(
          categories.map((category) => [category, currentDistribution.counts[category] ?? 0]),
        )
        weights[leader] += amount
        weights[next] -= amount
        setWeights(weights)
      }
    }
  }
  const applyMove = () => {
    if (!currentDistribution || !moveFrom || !moveTo || moveFrom === moveTo) return
    const points = Number(movePoints)
    if (!Number.isFinite(points) || points <= 0) return
    const categories = simulationCategories(variable, currentDistribution.counts)
    const total = categories.reduce(
      (sum, category) => sum + (currentDistribution.counts[category] ?? 0),
      0,
    )
    const next = Object.fromEntries(
      categories.map((category) => [category, currentDistribution.counts[category] ?? 0]),
    )
    const amount = Math.min(next[moveFrom] ?? 0, (total * points) / 100)
    next[moveFrom] = (next[moveFrom] ?? 0) - amount
    next[moveTo] = (next[moveTo] ?? 0) + amount
    setWeights(next)
    setScenarioName('Personalizado')
  }
  return (
    <div className="simulation-screen-page mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <PageHeading
          title="Simulación de escenarios"
          description="Escenarios hipotéticos mediante muestreo Monte Carlo con transformada inversa."
          tone="titulados"
        />
        <div className="flex flex-wrap items-center gap-2">
          <SimulationDownloadMenu run={executedRun} />
        </div>
      </div>
      <DatasetSelect
        datasets={datasets}
        value={datasetId}
        onChange={setDatasetId}
        loading={datasetsLoading}
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <Card className="h-fit rounded-xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="title-card">Parámetros de la simulación</CardTitle>
            <CardDescription>Se recalcula automáticamente. No es una predicción.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="label-default grid gap-1">
              Variable a simular
              <Select value={variable} onValueChange={setVariable}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Perfil</SelectLabel>
                    <SelectItem value="genero">Género</SelectItem>
                    <SelectItem value="edad_rango">Rango de edad</SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Empleo</SelectLabel>
                    <SelectItem value="situacion_laboral_actual">Estado laboral</SelectItem>
                    <SelectItem value="sector_trabajo">Sector</SelectItem>
                    <SelectItem value="remuneracion_rango">Remuneración mensual</SelectItem>
                    <SelectItem value="tiempo_primer_empleo">
                      Tiempo hasta el primer empleo
                    </SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Formación</SelectLabel>
                    <SelectItem value="satisfaccion_formacion">
                      Satisfacción con la formación
                    </SelectItem>
                    <SelectItem value="concordancia_formacion_requerimientos">
                      Concordancia formación-mercado
                    </SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Posgrado</SelectLabel>
                    <SelectItem value="interes_posgrado">Interés</SelectItem>
                    <SelectItem value="nivel_posgrado_interes">Nivel</SelectItem>
                    <SelectItem value="modalidad_posgrado">Modalidad</SelectItem>
                    <SelectItem value="financiamiento_posgrado_estimado">
                      Fuente de financiamiento
                    </SelectItem>
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Área de posgrado</SelectLabel>
                    <SelectItem value="area_posgrado_interes" disabled>
                      Multirrespuesta · pendiente de decisión
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </label>
            <label className="label-default grid gap-1">
              Escenario
              <Select value={scenarioName} onValueChange={selectScenario}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Observado">Observado</SelectItem>
                  <SelectItem value="Más muestra">Más muestra (N = 1.000)</SelectItem>
                  <SelectItem value="Líder +10 puntos">Líder +10 puntos</SelectItem>
                  <SelectItem value="Igualar categorías">Igualar categorías</SelectItem>
                  <SelectItem value="Personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </label>
            {currentDistribution && (
              <div className="rounded-lg border border-border-line p-3 text-xs">
                <p className="mb-2 font-semibold text-ink-800">Mover puntos</p>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-1">
                  <Select value={moveFrom} onValueChange={setMoveFrom}>
                    <SelectTrigger>
                      <SelectValue placeholder="De" />
                    </SelectTrigger>
                    <SelectContent>
                      {simulationCategories(variable, currentDistribution.counts).map(
                        (category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                  <span>→</span>
                  <Select value={moveTo} onValueChange={setMoveTo}>
                    <SelectTrigger>
                      <SelectValue placeholder="A" />
                    </SelectTrigger>
                    <SelectContent>
                      {simulationCategories(variable, currentDistribution.counts).map(
                        (category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="mt-2 flex gap-2">
                  <Input
                    className="h-8"
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={movePoints}
                    onChange={(event) => setMovePoints(event.target.value)}
                  />
                  <Button type="button" size="sm" onClick={applyMove}>
                    Aplicar puntos
                  </Button>
                </div>
              </div>
            )}
            <label className="label-default grid gap-1">
              Segmento
              <Select value={segment} onValueChange={setSegment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Mujer">Mujer</SelectItem>
                  <SelectItem value="Hombre">Hombre</SelectItem>
                </SelectContent>
              </Select>
              {summary && summary.validResponses < 5 && (
                <span className="text-xs text-amber-700">
                  Muestra pequeña · n = {summary.validResponses}
                </span>
              )}
            </label>
            <label className="label-default grid gap-1">
              Personas a simular (N)
              <Input
                className="w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                type="number"
                min="1"
                max="10000"
                step="1"
                value={sampleSizeInput}
                aria-invalid={!sampleSizeValid}
                onChange={(event) => setSampleSizeInput(event.target.value)}
                onBlur={() => setSampleSize(parseInteger(sampleSizeInput, sampleSize))}
              />
              <Button
                type="button"
                variant="link"
                size="xs"
                className="justify-self-start px-0"
                disabled={!observedBase}
                onClick={() => {
                  setSampleSize(observedBase)
                  setSampleSizeInput(String(observedBase))
                }}
              >
                Usar N = base observada{observedBase ? ` (${observedBase})` : ''}
              </Button>
              {!sampleSizeValid && (
                <span className="text-xs text-destructive">Usa un entero entre 1 y 10.000.</span>
              )}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="label-default grid gap-1">
                Réplicas (R)
                <Input
                  className="control"
                  type="number"
                  min="1"
                  max="5000"
                  step="1"
                  value={repetitionsInput}
                  aria-invalid={!repetitionsValid}
                  onChange={(event) => setRepetitionsInput(event.target.value)}
                  onBlur={() => setRepetitions(parseInteger(repetitionsInput, repetitions))}
                />
                {!repetitionsValid && (
                  <span className="text-xs text-destructive">Entre 1 y 5.000.</span>
                )}
              </label>
              <label className="label-default grid gap-1">
                Semilla
                <div className="flex gap-1">
                  <Input
                    className="control min-w-0 flex-1"
                    type="number"
                    step="1"
                    value={seedInput}
                    aria-invalid={!seedValid}
                    onChange={(event) => setSeedInput(event.target.value)}
                    onBlur={() => setSeed(parseInteger(seedInput, seed))}
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="size-8"
                          aria-label="Volver a sortear"
                          onClick={() => {
                            const nextSeed = Math.floor(Math.random() * 2147483647) + 1
                            setSeed(nextSeed)
                            setSeedInput(String(nextSeed))
                          }}
                        >
                          <Dices className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Volver a sortear</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </label>
            </div>
            {summary && (
              <SimulationWeights
                variable={variable}
                distribution={summary.distributions[variable]}
                weights={weights}
                setWeights={setWeights}
              />
            )}
            <p className="rounded-md bg-surface-container-low p-2 text-xs text-ink-600">
              Las probabilidades parten de las frecuencias observadas y se pueden ajustar con los
              controles.
            </p>
          </CardContent>
        </Card>
        <div className="space-y-5">
          {result ? (
            <SimulationDistribution
              result={result}
              variable={variable}
              observedTotal={
                executedRun?.observedTotal ?? summary?.distributions[variable]?.validCount ?? 0
              }
            />
          ) : (
            <StatusPanel
              kind="info"
              title="Calculando simulación"
              description="La distribución se generará automáticamente con su rango del 95 % de las repeticiones."
            />
          )}
        </div>
      </div>
      {error && (
        <StatusPanel kind="warning" title="No se pudo ejecutar la simulación" description={error} />
      )}
      {result && (
        <SimulationComparisonTable
          result={result}
          observedTotal={
            executedRun?.observedTotal ?? summary?.distributions[variable]?.validCount ?? 0
          }
          scenarioPercentages={executedRun?.scenarioPercentages ?? scenarioPercentages}
        />
      )}
      {result && <SimulationHowItWorks result={result} />}
    </div>
  )
}

export function UnavailableAnalyticPage({
  title,
  description,
  domain,
  items,
}: {
  title: string
  description: string
  domain: Domain
  items: string[]
}) {
  const tone: Tone = domain === 'TITULADOS' ? 'titulados' : 'empleadores'
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeading title={title} description={description} tone={tone} />
      <Card>
        <CardHeader>
          <CardTitle className="title-card flex items-center gap-2">
            <FlaskConical className="size-5" />
            Funcionalidad pendiente de contrato
          </CardTitle>
          <CardDescription>
            La ruta está preparada, pero el backend todavía no expone los datos necesarios para
            mostrar resultados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <StatusPanel
            kind="info"
            title="No disponible todavía"
            description="No se muestran valores manuales ni simulados como si fueran resultados reales."
          />
          {items.map((item) => (
            <div
              key={item}
              className="rounded-lg border border-border-line bg-slate-50 p-3 text-sm text-ink-600"
            >
              {item}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
