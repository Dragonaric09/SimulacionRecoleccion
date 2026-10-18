import { AgreementStackedBar, type ScoreAgreementSegment, ScoreBadge } from './ScoreVisuals'

export type ScoreDimensionData = {
  key: string
  label: string
  description?: string
  itemCount: number
  respondents: number
  score: number | null
  disagreementShare: number
  partialShare: number
  fullAgreementShare: number
  unknownShare: number
}

export function ScoreDimensionCard({
  dimension,
  scoreColor,
  agreementColors,
  formatScore = (value) => String(value),
}: {
  dimension: ScoreDimensionData
  scoreColor: (score: number | null) => string
  agreementColors: { disagree: string; partial: string; full: string }
  formatScore?: (value: number) => string
}) {
  const segments: ScoreAgreementSegment[] = [
    {
      key: 'disagree',
      label: 'Totalmente desacuerdo',
      value: dimension.disagreementShare,
      color: agreementColors.disagree,
    },
    {
      key: 'partial',
      label: 'Parcialmente de acuerdo',
      value: dimension.partialShare,
      color: agreementColors.partial,
    },
    {
      key: 'full',
      label: 'Totalmente de acuerdo',
      value: dimension.fullAgreementShare,
      color: agreementColors.full,
    },
  ]
  return (
    <article
      className="dimension-card flex flex-col gap-3 rounded-lg border border-border-line bg-white p-4"
      title={dimension.description}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="body-medium text-ink-900">{dimension.label}</h3>
          <p className="caption-meta text-ink-500">
            {dimension.itemCount} {dimension.itemCount === 1 ? 'afirmación' : 'afirmaciones'} · n ={' '}
            {formatCount(dimension.respondents)}
          </p>
        </div>
        <ScoreBadge
          score={dimension.score}
          color={scoreColor(dimension.score)}
          format={formatScore}
        />
      </div>
      <AgreementStackedBar segments={segments} />
      <div className="flex flex-wrap justify-between gap-x-3 text-xs tabular-nums text-ink-600">
        <span>Acuerdo total {formatPercent(dimension.fullAgreementShare)}</span>
        <span>Desacuerdo {formatPercent(dimension.disagreementShare)}</span>
        <span style={{ color: dimension.unknownShare >= 20 ? '#B45309' : undefined }}>
          No sabe {formatPercent(dimension.unknownShare)}
        </span>
      </div>
    </article>
  )
}

function formatCount(value: number) {
  return new Intl.NumberFormat('es-BO').format(value)
}
function formatPercent(value: number) {
  return `${value.toFixed(0).replace('.', ',')} %`
}
