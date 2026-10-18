import { AGREEMENT, NEUTRAL, likertColor } from '../dashboard/chartTheme'
import { formatCount, formatDecimal, formatPercent } from '../dashboard/dashboardFormat'
import { VALUATION_ITEMS } from '../instrumento'
import { AssociationBadge } from './AssociationTest'
import { AGREEMENT_SHORT, formatP, scoreColor } from './valuationFormat'
import type { EmployerValuation, ValuationDimension, ValuationItemStat, ValuationSegment } from './valuationTypes'

/**
 * Visualizaciones de la valoración por dimensiones. Son HTML y CSS (sin Recharts): se ven igual en pantalla y en
 * el PDF, sin depender del ancho del contenedor al imprimir.
 */

function readableText(score: number | null) {
  return score !== null && (score < 18 || score > 82) ? '#FFFFFF' : '#0F172A'
}

/** Color de una correlación −1..1. */
function rhoColor(rho: number | null) {
  return rho === null ? '#F8FAFC' : likertColor(3 + 2 * Math.max(-1, Math.min(1, rho)))
}

/** Leyenda de la escala de acuerdo y de «No sabe». */
export function AgreementLegend({ withUnknown = true }: { withUnknown?: boolean }) {
  const entries: [string, string][] = [
    [AGREEMENT_SHORT.disagree, AGREEMENT.disagree],
    [AGREEMENT_SHORT.partial, AGREEMENT.partly],
    [AGREEMENT_SHORT.full, AGREEMENT.agree],
  ]
  if (withUnknown) entries.push(['No sabe (fuera de la escala)', NEUTRAL])
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
      {entries.map(([label, color]) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: color }} />
          {label}
        </span>
      ))}
    </div>
  )
}

/** Leyenda del puntaje 0–100. */
export function ScoreLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-600">
      <span>0</span>
      <span className="h-2.5 w-40 rounded-sm" style={{ background: `linear-gradient(90deg, ${[0, 25, 50, 75, 100].map(scoreColor).join(', ')})` }} />
      <span>100</span>
      <span className="ml-2">Puntaje: Totalmente de acuerdo = 100 · Parcialmente = 50 · Desacuerdo = 0</span>
    </div>
  )
}

function StackedAgreement({ disagree, partial, full, height = 10 }: { disagree: number; partial: number; full: number; height?: number }) {
  const segments: [number, string, string][] = [
    [disagree, AGREEMENT.disagree, AGREEMENT_SHORT.disagree],
    [partial, AGREEMENT.partly, AGREEMENT_SHORT.partial],
    [full, AGREEMENT.agree, AGREEMENT_SHORT.full],
  ]
  return (
    <div className="flex w-full overflow-hidden rounded-sm bg-[#F1F5F9]" style={{ height }}>
      {segments.map(([value, color, label]) => value > 0 && (
        <div key={label} style={{ width: `${value}%`, background: color }} title={`${label}: ${formatPercent(value)}`} />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- dimensiones

export function DimensionScorecards({ dimensions }: { dimensions: ValuationDimension[] }) {
  return (
    <div className="dimension-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {dimensions.map((dimension) => (
        <article key={dimension.key} className="dimension-card flex flex-col gap-3 rounded-lg border border-border-line bg-white p-4" title={dimension.description}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="body-medium text-ink-900">{dimension.label}</h3>
              <p className="caption-meta text-ink-500">
                {dimension.itemKeys.length} {dimension.itemKeys.length === 1 ? 'afirmación' : 'afirmaciones'} · n = {formatCount(dimension.respondents)}
              </p>
            </div>
            <span
              className="flex h-11 min-w-14 shrink-0 items-center justify-center rounded-md px-2 text-lg font-semibold tabular-nums"
              style={{ background: scoreColor(dimension.score), color: readableText(dimension.score) }}
            >
              {dimension.score === null ? '—' : formatDecimal(dimension.score, 0)}
            </span>
          </div>
          <StackedAgreement
            disagree={dimension.disagreementShare ?? 0}
            partial={dimension.partialShare ?? 0}
            full={dimension.fullAgreementShare ?? 0}
          />
          <div className="flex flex-wrap justify-between gap-x-3 text-xs tabular-nums text-ink-600">
            <span>Acuerdo total {formatPercent(dimension.fullAgreementShare, 0)}</span>
            <span>Desacuerdo {formatPercent(dimension.disagreementShare, 0)}</span>
            <span style={{ color: (dimension.unknownShare ?? 0) >= 20 ? '#B45309' : undefined }}>No sabe {formatPercent(dimension.unknownShare, 0)}</span>
          </div>
        </article>
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
export function StatementRanking({ items, dimensions }: { items: ValuationItemStat[]; dimensions: ValuationDimension[] }) {
  const dimensionLabel = new Map(dimensions.map((d) => [d.key, d.label]))
  const sorted = [...items].sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
  return (
    <div className="statement-ranking space-y-1.5">
      <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)_56px_56px] items-end gap-3 border-b border-border-line pb-1 text-[11px] font-semibold text-ink-600">
        <span>Afirmación</span>
        <span className="grid grid-cols-2 text-center"><span>Desacuerdo</span><span>Acuerdo parcial y total</span></span>
        <span className="text-right">Puntaje</span>
        <span className="text-right">No sabe</span>
      </div>
      {sorted.map((item) => {
        const answered = item.full + item.partial + item.disagreement
        const pct = (value: number) => (answered === 0 ? 0 : (value * 100) / answered)
        const asked = answered + item.unknown
        return (
          <div key={item.key} className="statement-row grid grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)_56px_56px] items-center gap-3 text-xs" title={STATEMENTS.get(item.key)}>
            <div className="min-w-0">
              <p className="truncate font-medium text-ink-900">{item.label}</p>
              <p className="truncate text-[11px] text-ink-500">{dimensionLabel.get(item.dimension) ?? ''}</p>
            </div>
            <div className="grid h-4 grid-cols-2">
              <div className="flex justify-end border-r border-ink-400">
                <div style={{ width: `${pct(item.disagreement)}%`, background: AGREEMENT.disagree }} title={`${AGREEMENT_SHORT.disagree}: ${formatPercent(pct(item.disagreement))}`} />
              </div>
              <div className="flex">
                <div style={{ width: `${pct(item.partial)}%`, background: AGREEMENT.partly }} title={`${AGREEMENT_SHORT.partial}: ${formatPercent(pct(item.partial))}`} />
                <div style={{ width: `${pct(item.full)}%`, background: AGREEMENT.agree }} title={`${AGREEMENT_SHORT.full}: ${formatPercent(pct(item.full))}`} />
              </div>
            </div>
            <span className="text-right font-semibold tabular-nums text-ink-900">{item.score === null ? '—' : formatDecimal(item.score, 0)}</span>
            <span className="text-right tabular-nums text-ink-600">{asked === 0 ? '—' : formatPercent((item.unknown * 100) / asked, 0)}</span>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------- segmentos

/** Puntaje por dimensión en cada grupo de organizaciones; cada variable lleva su prueba sobre el puntaje global. */
export function SegmentHeatmap({ segments, dimensions }: { segments: ValuationSegment[]; dimensions: ValuationDimension[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="segment-heatmap w-full min-w-[760px] border-separate border-spacing-[3px] text-xs">
        <thead>
          <tr className="text-[11px] text-ink-600">
            <th className="text-left font-semibold">Grupo</th>
            <th className="w-12 text-right font-semibold">n</th>
            <th className="w-16 text-center font-semibold">Global</th>
            {dimensions.map((d) => <th key={d.key} className="w-20 text-center font-semibold leading-tight">{d.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {segments.map((segment) => (
            <SegmentRows key={segment.variable} segment={segment} dimensions={dimensions} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SegmentRows({ segment, dimensions }: { segment: ValuationSegment; dimensions: ValuationDimension[] }) {
  return (
    <>
      <tr>
        <td colSpan={3 + dimensions.length} className="pt-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border-line pb-1">
            <span className="caption-bold text-ink-900">{segment.label}</span>
            <AssociationBadge result={segment.test} />
          </div>
        </td>
      </tr>
      {segment.groups.length === 0 && (
        <tr><td colSpan={3 + dimensions.length} className="caption-meta py-1 text-ink-500">Sin respuestas en este segmento.</td></tr>
      )}
      {segment.groups.map((group) => {
        const small = group.n < 5
        return (
          <tr key={group.category} style={{ opacity: small ? 0.55 : 1 }} title={small ? 'Menos de 5 organizaciones: interprete con cautela' : undefined}>
            <td className="max-w-[240px] truncate pr-2 text-ink-900">{group.category}{small ? ' *' : ''}</td>
            <td className="text-right tabular-nums text-ink-600">{formatCount(group.n)}</td>
            <ScoreCell score={group.score} strong />
            {dimensions.map((d) => <ScoreCell key={d.key} score={group.dimensions[d.key] ?? null} />)}
          </tr>
        )
      })}
    </>
  )
}

function ScoreCell({ score, strong = false }: { score: number | null; strong?: boolean }) {
  return (
    <td
      className={`h-7 rounded-sm text-center tabular-nums ${strong ? 'font-semibold' : ''}`}
      style={{ background: scoreColor(score), color: readableText(score) }}
    >
      {score === null ? '—' : formatDecimal(score, 0)}
    </td>
  )
}

// ---------------------------------------------------------------- conocimiento × desempeño

export function KnowledgeMatrixView({ knowledge }: { knowledge: EmployerValuation['knowledge'] }) {
  const rowTotals = knowledge.counts.map((row) => row.reduce((sum, value) => sum + value, 0))
  const total = rowTotals.reduce((sum, value) => sum + value, 0)
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="knowledge-matrix w-full min-w-[520px] border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th className="w-[34%] text-left align-bottom text-[11px] font-semibold text-ink-600">Conoce el perfil de egreso ↓ · Perfil coherente con el desempeño →</th>
              {knowledge.categories.map((c) => <th key={c} className="text-center text-[11px] font-semibold text-ink-600">{c}</th>)}
              <th className="w-14 text-right text-[11px] font-semibold text-ink-600">n</th>
            </tr>
          </thead>
          <tbody>
            {knowledge.categories.map((rowLabel, i) => (
              <tr key={rowLabel}>
                <td className="font-medium text-ink-900">{rowLabel}</td>
                {knowledge.counts[i].map((count, j) => {
                  const share = rowTotals[i] === 0 ? 0 : (count * 100) / rowTotals[i]
                  return (
                    <td key={j} className="h-12 rounded-sm text-center tabular-nums" style={{ background: `rgba(20, 163, 154, ${0.08 + (share / 100) * 0.8})`, color: share > 55 ? '#FFFFFF' : '#0F172A' }}>
                      <div className="font-semibold">{formatCount(count)}</div>
                      <div className="text-[10px] opacity-80">{rowTotals[i] === 0 ? '—' : formatPercent(share, 0)}</div>
                    </td>
                  )
                })}
                <td className="text-right tabular-nums text-ink-600">{formatCount(rowTotals[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="caption-meta text-ink-500">
        Porcentaje por fila. n = {formatCount(total)} organizaciones con ambas respuestas; {formatCount(knowledge.excluded)} excluidas por «No sabe» o sin respuesta.
      </p>
      <AssociationBadge result={knowledge.test} />
    </div>
  )
}

// ---------------------------------------------------------------- correlaciones

/** Triángulo inferior de ρ de Spearman entre dimensiones. «*» marca p < 0,05. */
export function CorrelationMatrix({ correlations }: { correlations: EmployerValuation['correlations'] }) {
  const { labels, rho, pValues, n } = correlations
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="correlation-matrix w-full min-w-[620px] border-separate border-spacing-[3px] text-xs">
          <thead>
            <tr>
              <th />
              {labels.slice(0, -1).map((label) => <th key={label} className="w-24 text-center text-[11px] font-semibold leading-tight text-ink-600">{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {labels.slice(1).map((rowLabel, offset) => {
              const i = offset + 1
              return (
                <tr key={rowLabel}>
                  <th className="pr-2 text-left text-[11px] font-semibold text-ink-700">{rowLabel}</th>
                  {labels.slice(0, -1).map((_, j) => {
                    if (j >= i) return <td key={j} />
                    const value = rho[i][j]
                    const p = pValues[i][j]
                    return (
                      <td
                        key={j}
                        className="h-9 rounded-sm text-center tabular-nums"
                        style={{ background: rhoColor(value), color: value !== null && Math.abs(value) > 0.65 ? '#FFFFFF' : '#0F172A' }}
                        title={`n = ${formatCount(n[i][j])}${p !== null ? ` · p = ${formatP(p)}` : ''}`}
                      >
                        {value === null ? '—' : `${formatDecimal(Math.abs(value) < 0.005 ? 0 : value, 2)}${p !== null && p < 0.05 ? '*' : ''}`}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-600">
        <span>−1</span>
        <span className="h-2.5 w-32 rounded-sm" style={{ background: `linear-gradient(90deg, ${[-1, -0.5, 0, 0.5, 1].map(rhoColor).join(', ')})` }} />
        <span>+1</span>
        <span className="ml-2">ρ de Spearman entre puntajes de dimensión · * p &lt; 0,05</span>
      </div>
    </div>
  )
}
