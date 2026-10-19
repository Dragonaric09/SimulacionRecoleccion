import type { ReactNode } from 'react'
import { ChartVariantSelector, useChartVariant } from '@/components/analytics/charts'
import { ChartCard, SmallSampleNotice } from '@/components/analytics/ChartCard'
import { StatusPanel } from '@/components/analytics/StatusPanel'
import { useDatasets } from '@/features/analitica/shared/AnalyticsPrimitives'
import { VALUATION_ITEMS } from './instrumento'
import { EmployerFilterToolbar } from './EmployerFilterToolbar'
import { EmployerPageHeader, NoEmployerDataPanel } from './EmployerPageHeader'
import { downloadCsv, useEmployerFilters } from './employerData'
import { useEmployerApi } from './useEmployerApi'
import { formatCount, formatDecimal, formatPercent } from './dashboard/dashboardFormat'
import type { EmployerValuation } from './valuation/valuationTypes'
import {
  AgreementLegend,
  CorrelationMatrix,
  DimensionScorecards,
  KnowledgeMatrixView,
  ScoreLegend,
  SegmentHeatmap,
  StatementRanking,
} from './valuation/ValuationVisuals'
import { scoreColor, valuationUrl } from './valuation/valuationFormat'

/**
 * Valoración de la Carrera agrupada en seis dimensiones: cuánto confían los empleadores en la formación, cómo ven
 * el desempeño, si conocen el perfil, si la Carrera los escucha, si participan y si recurren a ella para contratar.
 */
export function EmpleadoresValoracionPage() {
  const { datasetId } = useDatasets('EMPLEADORES')
  const filters = useEmployerFilters(datasetId)
  const { data, loading, error } = useEmployerApi<EmployerValuation>(
    datasetId ? valuationUrl(datasetId, filters.query) : null,
  )

  const header = (
    <EmployerPageHeader
      title="Valoración de la Carrera"
      description="18 afirmaciones agrupadas en 6 dimensiones, con su comparación entre tipos de organización y la relación entre dimensiones."
    />
  )
  if (!datasetId) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {header}
        <NoEmployerDataPanel />
      </div>
    )
  }

  const respondents = data?.summary.respondents ?? 0
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {header}
      <EmployerFilterToolbar
        filters={filters.filters}
        onToggle={filters.toggle}
        onClear={filters.clear}
        active={filters.active}
        validCount={data?.summary.respondents}
        totalCount={data?.summary.totalResponses}
      />
      {error && (
        <StatusPanel kind="warning" title="No se pudo cargar la pantalla" description={error} />
      )}
      {loading && !data && (
        <StatusPanel
          kind="loading"
          title="Cargando datos"
          description="Consultando el dataset seleccionado."
        />
      )}
      {data && respondents > 0 && respondents < 5 && <SmallSampleNotice count={respondents} />}
      {data && respondents === 0 && (
        <StatusPanel
          kind="info"
          title="Ningún registro coincide"
          description="Cambia o limpia los filtros para ver resultados."
        />
      )}
      {data && respondents > 0 && <ValuationContent data={data} />}
    </div>
  )
}

/** Contenido de la pantalla; el reporte PDF lo reutiliza tal cual. */
export function ValuationContent({
  data,
  print = false,
}: {
  data: EmployerValuation
  print?: boolean
}) {
  const { summary, dimensions } = data
  const byKey = new Map(dimensions.map((d) => [d.key, d]))
  const strongest = summary.strongestDimension ? byKey.get(summary.strongestDimension) : undefined
  const weakest = summary.weakestDimension ? byKey.get(summary.weakestDimension) : undefined
  const n = summary.respondents
  const [statementVariant, setStatementVariant] = useChartVariant(
    'empleadores-valoracion-statements',
    'bars',
    ['bars', 'table'] as const,
  )

  const exportItems = () => {
    const statements = new Map(VALUATION_ITEMS.map((item) => [item.key, item.statement]))
    const dimensionLabel = new Map(dimensions.map((d) => [d.key, d.label]))
    downloadCsv('empleadores-valoracion-afirmaciones.csv', [
      [
        'Afirmación',
        'Dimensión',
        'Totalmente de acuerdo',
        'Parcialmente de acuerdo',
        'Totalmente desacuerdo',
        'No sabe',
        'Sin respuesta',
        'Puntaje 0-100',
        'Índice neto',
      ],
      ...data.items.map((item) => [
        statements.get(item.key) ?? item.label,
        dimensionLabel.get(item.dimension) ?? '',
        item.full,
        item.partial,
        item.disagreement,
        item.unknown,
        item.missing,
        item.score ?? '',
        item.netIndex ?? '',
      ]),
    ])
  }
  const exportSegments = () => {
    downloadCsv('empleadores-valoracion-segmentos.csv', [
      [
        'Variable',
        'Grupo',
        'n',
        'Puntaje global',
        ...dimensions.map((d) => d.label),
        'Prueba',
        'p-valor',
        'Efecto',
      ],
      ...data.segments.flatMap((segment) =>
        segment.groups.map((group) => [
          segment.label,
          group.category,
          group.n,
          group.score ?? '',
          ...dimensions.map((d) => group.dimensions[d.key] ?? ''),
          segment.test?.nombrePrueba ?? '',
          segment.test?.pValor ?? '',
          segment.test?.efecto ?? '',
        ]),
      ),
    ])
  }
  const exportDimensions = () => {
    downloadCsv('empleadores-valoracion-dimensiones.csv', [
      [
        'Dimensión',
        'Afirmaciones',
        'Respuestas válidas',
        'Puntaje 0-100',
        'Totalmente de acuerdo (%)',
        'Parcialmente de acuerdo (%)',
        'Totalmente desacuerdo (%)',
        'No sabe (%)',
      ],
      ...dimensions.map((dimension) => [
        dimension.label,
        dimension.itemKeys.length,
        dimension.respondents,
        dimension.score ?? '',
        dimension.fullAgreementShare ?? '',
        dimension.partialShare ?? '',
        dimension.disagreementShare ?? '',
        dimension.unknownShare ?? '',
      ]),
    ])
  }
  const exportKnowledge = () => {
    const { categories, counts } = data.knowledge
    downloadCsv('empleadores-valoracion-perfil-y-desempeno.csv', [
      ['Conoce el perfil / Perfil coherente', ...categories, 'Total'],
      ...categories.map((category, rowIndex) => {
        const values = counts[rowIndex] ?? []
        return [category, ...values, values.reduce((sum, value) => sum + value, 0)]
      }),
    ])
  }
  const exportCorrelations = () => {
    const { labels, rho, pValues, n: sampleSizes } = data.correlations
    downloadCsv('empleadores-valoracion-correlaciones.csv', [
      ['Dimensión', 'Dimensión comparada', 'ρ de Spearman', 'p-valor', 'n'],
      ...labels.flatMap((rowLabel, rowIndex) =>
        labels.slice(0, rowIndex).map((columnLabel, columnIndex) => [
          rowLabel,
          columnLabel,
          rho[rowIndex]?.[columnIndex] ?? '',
          pValues[rowIndex]?.[columnIndex] ?? '',
          sampleSizes[rowIndex]?.[columnIndex] ?? '',
        ]),
      ),
    ])
  }

  return (
    <div className="valuation-content space-y-6">
      <div className="valuation-kpis grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Puntaje global de valoración"
          value={summary.score === null ? '—' : formatDecimal(summary.score, 0)}
          suffix="/ 100"
          score={summary.score}
        >
          Acuerdo total {formatPercent(summary.fullAgreementShare, 0)} · Desacuerdo{' '}
          {formatPercent(summary.disagreementShare, 0)}
        </StatTile>
        <StatTile
          label="Dimensión mejor valorada"
          value={strongest?.label ?? '—'}
          score={strongest?.score ?? null}
          compact
        >
          {strongest
            ? `Puntaje ${formatDecimal(strongest.score ?? 0, 0)} · n = ${formatCount(strongest.respondents)}`
            : 'Requiere al menos dos dimensiones con respuestas'}
        </StatTile>
        <StatTile
          label="Dimensión peor valorada"
          value={weakest?.label ?? '—'}
          score={weakest?.score ?? null}
          compact
        >
          {weakest
            ? `Puntaje ${formatDecimal(weakest.score ?? 0, 0)} · n = ${formatCount(weakest.respondents)}`
            : 'Requiere al menos dos dimensiones con respuestas'}
        </StatTile>
        <StatTile label="Respuestas «No sabe»" value={formatPercent(summary.unknownShare, 1)}>
          {formatCount(summary.uniformResponses)} de {formatCount(n)} organizaciones marcaron la
          misma opción en las 18 afirmaciones
        </StatTile>
      </div>

      <ChartCard
        title="Puntaje por dimensión"
        n={n}
        help="Cada dimensión agrupa afirmaciones del formulario que miden lo mismo. Puntaje 0–100: Totalmente de acuerdo = 100, Parcialmente = 50, Totalmente desacuerdo = 0. «No sabe» no entra en el puntaje."
        onExportCsv={print ? undefined : exportDimensions}
      >
        <div className="space-y-4">
          <DimensionScorecards dimensions={dimensions} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <AgreementLegend withUnknown={false} />
            <ScoreLegend />
          </div>
        </div>
      </ChartCard>

      <ChartCard
        title="Afirmaciones ordenadas por puntaje"
        n={n}
        help="Porcentajes sobre las organizaciones que eligieron una opción de la escala. «No sabe» se informa en su columna, sobre todas las que respondieron la afirmación. Pase el cursor por una fila para leer el enunciado completo."
        onExportCsv={print ? undefined : exportItems}
        headerActions={
          !print && (
            <ChartVariantSelector
              value={statementVariant}
              options={['bars', 'table'] as const}
              labels={{ bars: 'Barras divergentes', table: 'Tabla' }}
              onChange={setStatementVariant}
            />
          )
        }
      >
        <div className="space-y-3">
          <StatementRanking
            items={data.items}
            dimensions={dimensions}
            variant={print ? 'bars' : statementVariant}
          />
          <AgreementLegend withUnknown={false} />
        </div>
      </ChartCard>

      <ChartCard
        title="Puntaje por tipo de organización y situación de contratación"
        n={n}
        help="Puntaje promedio de cada dimensión por grupo. La prueba compara el puntaje global entre grupos y se elige por el tipo de variable: Mann–Whitney para 2 grupos, Kruskal–Wallis para 3 o más, Spearman si los grupos tienen orden. * Grupo con menos de 5 organizaciones."
        onExportCsv={print ? undefined : exportSegments}
      >
        <div className="space-y-3">
          <SegmentHeatmap segments={data.segments} dimensions={dimensions} />
          <ScoreLegend />
        </div>
      </ChartCard>

      <div className="valuation-pair grid gap-6">
        <ChartCard
          title="Conocimiento del perfil de egreso frente a su coherencia con el desempeño"
          n={data.knowledge.counts.flat().reduce((sum, value) => sum + value, 0)}
          help="Filas: «Conozco el perfil profesional y las competencias de egreso». Columnas: «El perfil declarado es coherente con el desempeño demostrado». Ambas son ordinales: se usa ρ de Spearman."
          onExportCsv={print ? undefined : exportKnowledge}
        >
          <KnowledgeMatrixView knowledge={data.knowledge} />
        </ChartCard>
        <ChartCard
          title="Relación entre dimensiones"
          n={n}
          help="ρ de Spearman entre los puntajes de dimensión de cada organización (solo organizaciones con ambas dimensiones respondidas). Pase el cursor por una celda para ver n y p."
          onExportCsv={print ? undefined : exportCorrelations}
        >
          <CorrelationMatrix correlations={data.correlations} />
        </ChartCard>
      </div>
    </div>
  )
}

function StatTile({
  label,
  value,
  suffix,
  score,
  compact = false,
  children,
}: {
  label: string
  value: string
  suffix?: string
  score?: number | null
  compact?: boolean
  children: ReactNode
}) {
  return (
    <div className="stat-tile flex h-full flex-col gap-2 rounded-lg border border-border-line bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="caption-bold text-ink-600">{label}</p>
        {score !== undefined && score !== null && (
          <span
            className="mt-0.5 size-3 shrink-0 rounded-full"
            style={{ background: scoreColor(score) }}
          />
        )}
      </div>
      <p
        className={
          compact
            ? 'text-lg font-semibold leading-6 text-ink-900'
            : 'display-kpi tabular-nums text-ink-900'
        }
      >
        {value}
        {suffix && <span className="ml-1 text-sm font-medium text-ink-500">{suffix}</span>}
      </p>
      <p className="caption-meta mt-auto text-ink-500">{children}</p>
    </div>
  )
}
