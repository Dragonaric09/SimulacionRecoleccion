import { AGREEMENT, likertColor } from '../dashboard/chartTheme'
import { formatDecimal, formatPercent } from '../dashboard/dashboardFormat'
import { VALUATION_ITEMS } from '../instrumento'
import { AssociationBadge } from './AssociationTest'
import { AGREEMENT_SHORT, formatP, scoreColor } from './valuationFormat'
import type {
  EmployerValuation,
  ValuationDimension,
  ValuationItemStat,
  ValuationSegment,
} from './valuationTypes'
import {
  AgreementLegend as SharedAgreementLegend,
  AssociationMatrix,
  CorrelationMatrix as SharedCorrelationMatrix,
  ScoreDimensionCard,
  ScoreLegend as SharedScoreLegend,
  SegmentScoreMatrix,
} from '@/components/analytics/charts'
import { TapTooltip } from '@/components/analytics/TapTooltip'

/**
 * Visualizaciones de la valoración por dimensiones. Son HTML y CSS (sin Recharts): se ven igual en pantalla y en
 * el PDF, sin depender del ancho del contenedor al imprimir.
 */

/** Color de una correlación −1..1. */
function rhoColor(rho: number | null) {
  return rho === null ? '#F8FAFC' : likertColor(3 + 2 * Math.max(-1, Math.min(1, rho)))
}

/** Leyenda de la escala de acuerdo y de «No sabe». */
export function AgreementLegend({ withUnknown = true }: { withUnknown?: boolean }) {
  return (
    <SharedAgreementLegend
      entries={[
        { key: 'disagree', label: AGREEMENT_SHORT.disagree, value: 0, color: AGREEMENT.disagree },
        { key: 'partial', label: AGREEMENT_SHORT.partial, value: 0, color: AGREEMENT.partly },
        { key: 'full', label: AGREEMENT_SHORT.full, value: 0, color: AGREEMENT.agree },
      ]}
      unknownLabel={withUnknown ? 'No sabe (fuera de la escala)' : undefined}
    />
  )
}

/** Leyenda del puntaje 0–100. */
export function ScoreLegend() {
  return <SharedScoreLegend scoreColor={scoreColor} />
}

// ---------------------------------------------------------------- dimensiones

export function DimensionScorecards({ dimensions }: { dimensions: ValuationDimension[] }) {
  return (
    <div className="dimension-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {dimensions.map((dimension) => (
        <ScoreDimensionCard
          key={dimension.key}
          dimension={{
            key: dimension.key,
            label: dimension.label,
            description: dimension.description,
            itemCount: dimension.itemKeys.length,
            respondents: dimension.respondents,
            score: dimension.score,
            disagreementShare: dimension.disagreementShare ?? 0,
            partialShare: dimension.partialShare ?? 0,
            fullAgreementShare: dimension.fullAgreementShare ?? 0,
            unknownShare: dimension.unknownShare ?? 0,
          }}
          scoreColor={scoreColor}
          agreementColors={{
            disagree: AGREEMENT.disagree,
            partial: AGREEMENT.partly,
            full: AGREEMENT.agree,
          }}
          formatScore={(value) => formatDecimal(value, 0)}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- afirmaciones

const STATEMENTS = new Map(VALUATION_ITEMS.map((item) => [item.key, item.statement]))

/**
 * Afirmaciones ordenadas por puntaje, en barras divergentes: desacuerdo a la izquierda del eje, acuerdo parcial y
 * total a la derecha. «No sabe» queda fuera de la barra y se informa en su columna.
 */
export function StatementRanking({
  items,
  dimensions,
  variant = 'bars',
}: {
  items: ValuationItemStat[]
  dimensions: ValuationDimension[]
  variant?: 'bars' | 'table'
}) {
  const dimensionLabel = new Map(dimensions.map((d) => [d.key, d.label]))
  const sorted = [...items].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  if (variant === 'table')
    return <StatementRankingTable items={sorted} dimensionLabel={dimensionLabel} />
  return (
    <div className="statement-ranking space-y-1.5">
      <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)_56px_56px] items-end gap-3 border-b border-border-line pb-1 text-[11px] font-semibold text-ink-600">
        <span>Afirmación</span>
        <span className="grid grid-cols-2 text-center">
          <span>Desacuerdo</span>
          <span>Acuerdo parcial y total</span>
        </span>
        <span className="text-right">Puntaje</span>
        <span className="text-right">No sabe</span>
      </div>
      {sorted.map((item) => {
        const answered = item.full + item.partial + item.disagreement
        const pct = (value: number) => (answered === 0 ? 0 : (value * 100) / answered)
        const asked = answered + item.unknown
        return (
          <div
            key={item.key}
            className="statement-row grid grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)_56px_56px] items-center gap-3 text-xs"
          >
            <div className="min-w-0">
              {/* El enunciado completo se abre con el cursor o al tocar la etiqueta. */}
              <TapTooltip content={STATEMENTS.get(item.key) ?? item.label}>
                <button type="button" className="block w-full cursor-help truncate text-left font-medium text-ink-900">{item.label}</button>
              </TapTooltip>
              <p className="truncate text-[11px] text-ink-500">
                {dimensionLabel.get(item.dimension) ?? ''}
              </p>
            </div>
            <div className="grid h-4 grid-cols-2">
              <div className="flex justify-end border-r border-ink-400">
                <TapTooltip content={<div className="grid gap-0.5"><strong>{AGREEMENT_SHORT.disagree}</strong><span>{item.disagreement} respuestas · {formatPercent(pct(item.disagreement))}</span><span className="text-muted-foreground">Porcentaje sobre {answered} respuestas válidas a esta afirmación.</span></div>}>
                  <div tabIndex={0} aria-label={`${AGREEMENT_SHORT.disagree}: ${formatPercent(pct(item.disagreement))}`} className="cursor-help" style={{ width: `${pct(item.disagreement)}%`, background: AGREEMENT.disagree }} />
                </TapTooltip>
              </div>
              <div className="flex">
                <TapTooltip content={<div className="grid gap-0.5"><strong>{AGREEMENT_SHORT.partial}</strong><span>{item.partial} respuestas · {formatPercent(pct(item.partial))}</span><span className="text-muted-foreground">Porcentaje sobre {answered} respuestas válidas a esta afirmación.</span></div>}>
                  <div tabIndex={0} aria-label={`${AGREEMENT_SHORT.partial}: ${formatPercent(pct(item.partial))}`} className="cursor-help" style={{ width: `${pct(item.partial)}%`, background: AGREEMENT.partly }} />
                </TapTooltip>
                <TapTooltip content={<div className="grid gap-0.5"><strong>{AGREEMENT_SHORT.full}</strong><span>{item.full} respuestas · {formatPercent(pct(item.full))}</span><span className="text-muted-foreground">Porcentaje sobre {answered} respuestas válidas a esta afirmación.</span></div>}>
                  <div tabIndex={0} aria-label={`${AGREEMENT_SHORT.full}: ${formatPercent(pct(item.full))}`} className="cursor-help" style={{ width: `${pct(item.full)}%`, background: AGREEMENT.agree }} />
                </TapTooltip>
              </div>
            </div>
            <span className="text-right font-semibold tabular-nums text-ink-900">
              {item.score === null ? '—' : formatDecimal(item.score, 0)}
            </span>
            <span className="text-right tabular-nums text-ink-600">
              {asked === 0 ? '—' : formatPercent((item.unknown * 100) / asked, 0)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function StatementRankingTable({
  items,
  dimensionLabel,
}: {
  items: ValuationItemStat[]
  dimensionLabel: Map<string, string>
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-xs">
        <thead>
          <tr className="border-b border-border-line text-left text-ink-600">
            <th className="p-2">Afirmación</th>
            <th className="p-2">Dimensión</th>
            <th className="p-2 text-right">Desacuerdo</th>
            <th className="p-2 text-right">Acuerdo parcial</th>
            <th className="p-2 text-right">Acuerdo total</th>
            <th className="p-2 text-right">Puntaje</th>
            <th className="p-2 text-right">No sabe</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const answered = item.full + item.partial + item.disagreement
            const asked = answered + item.unknown
            const percent = (value: number) =>
              answered ? `${((value * 100) / answered).toFixed(0)} %` : '—'
            return (
              <tr key={item.key} className="border-b border-surface-container-high">
                <td className="max-w-[300px] p-2 font-medium text-ink-900">{item.label}</td>
                <td className="p-2 text-ink-600">{dimensionLabel.get(item.dimension) ?? ''}</td>
                <td className="p-2 text-right tabular-nums">{percent(item.disagreement)}</td>
                <td className="p-2 text-right tabular-nums">{percent(item.partial)}</td>
                <td className="p-2 text-right tabular-nums">{percent(item.full)}</td>
                <td className="p-2 text-right font-semibold tabular-nums">
                  {item.score === null ? '—' : formatDecimal(item.score, 0)}
                </td>
                <td className="p-2 text-right tabular-nums">
                  {asked ? `${((item.unknown * 100) / asked).toFixed(0)} %` : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------- segmentos

/** Puntaje por dimensión en cada grupo de organizaciones; cada variable lleva su prueba sobre el puntaje global. */
export function SegmentHeatmap({
  segments,
  dimensions,
}: {
  segments: ValuationSegment[]
  dimensions: ValuationDimension[]
}) {
  return (
    <SegmentScoreMatrix
      sections={segments.map((segment) => ({
        label: segment.label,
        groups: segment.groups,
        test: <AssociationBadge result={segment.test} />,
      }))}
      dimensions={dimensions}
      scoreColor={scoreColor}
      formatScore={(value) => formatDecimal(value, 0)}
    />
  )
}

// ---------------------------------------------------------------- conocimiento × desempeño

export function KnowledgeMatrixView({ knowledge }: { knowledge: EmployerValuation['knowledge'] }) {
  const rows = knowledge.categories.map((label, rowIndex) => {
    const total = knowledge.counts[rowIndex].reduce((sum, value) => sum + value, 0)
    return {
      label,
      total,
      cells: knowledge.counts[rowIndex].map((count) => ({
        count,
        percent: total ? (count * 100) / total : 0,
      })),
    }
  })
  const total = rows.reduce((sum, row) => sum + row.total, 0)
  return (
    <AssociationMatrix
      rowHeader="Conoce el perfil de egreso ↓ · Perfil coherente con el desempeño →"
      columns={knowledge.categories}
      rows={rows}
      total={total}
      excluded={knowledge.excluded}
      test={<AssociationBadge result={knowledge.test} />}
    />
  )
}

// ---------------------------------------------------------------- correlaciones

/** Triángulo inferior de ρ de Spearman entre dimensiones. «*» marca p < 0,05. */
export function CorrelationMatrix({
  correlations,
}: {
  correlations: EmployerValuation['correlations']
}) {
  return (
    <SharedCorrelationMatrix
      labels={correlations.labels}
      rho={correlations.rho}
      pValues={correlations.pValues}
      sampleSizes={correlations.n}
      colorScale={rhoColor}
      formatPValue={(value) => formatP(value)}
    />
  )
}
