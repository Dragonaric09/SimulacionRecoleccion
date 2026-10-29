/* eslint-disable react-refresh/only-export-components */
import { TapTooltip } from '../TapTooltip'
export type ScoreAgreementSegment = { key: string; label: string; value: number; color: string }

export function AgreementStackedBar({
  segments,
  height = 10,
}: {
  segments: ScoreAgreementSegment[]
  height?: number
}) {
  return (
    <div className="flex w-full overflow-hidden rounded-sm bg-[#F1F5F9]" style={{ height }}>
      {segments.map(
        (segment) =>
          segment.value > 0 && (
            <TapTooltip
              key={segment.key}
              content={
                <div className="grid gap-0.5">
                  <strong>{segment.label}</strong>
                  <span>{formatPercent(segment.value)} de las respuestas válidas</span>
                  <span className="text-muted-foreground">Proporción de organizaciones que eligió esta opción.</span>
                </div>
              }
            >
              <div
                aria-label={`${segment.label}: ${formatPercent(segment.value)}`}
                style={{ width: `${segment.value}%`, background: segment.color }}
              />
            </TapTooltip>
          ),
      )}
    </div>
  )
}

export function AgreementLegend({
  entries,
  unknownLabel,
}: {
  entries: ScoreAgreementSegment[]
  unknownLabel?: string
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
      {entries.map((entry) => (
        <span key={entry.key} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: entry.color }} />
          {entry.label}
        </span>
      ))}
      {unknownLabel && (
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-slate-400" />
          {unknownLabel}
        </span>
      )}
    </div>
  )
}

export function ScoreLegend({
  scoreColor,
  description = 'Puntaje: Totalmente de acuerdo = 100 · Parcialmente = 50 · Desacuerdo = 0',
}: {
  scoreColor: (score: number) => string
  description?: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-600">
      <span>0</span>
      <span
        className="h-2.5 w-40 rounded-sm"
        style={{
          background: `linear-gradient(90deg, ${[0, 25, 50, 75, 100].map(scoreColor).join(', ')})`,
        }}
      />
      <span>100</span>
      <span className="ml-2">{description}</span>
    </div>
  )
}

export function ScoreBadge({
  score,
  color,
  format = (value) => String(value),
}: {
  score: number | null
  color: string
  format?: (value: number) => string
}) {
  return (
    <TapTooltip
      content={
        <div className="grid gap-0.5">
          <strong>Puntaje de la dimensión</strong>
          <span>{score === null ? 'Sin datos suficientes' : `${format(score)} de 100`}</span>
          <span className="text-muted-foreground">Promedio de las afirmaciones: acuerdo total = 100, parcial = 50, desacuerdo = 0. «No sabe» no se incluye.</span>
        </div>
      }
    >
      <span
        tabIndex={0}
        className="flex h-11 min-w-14 shrink-0 cursor-help items-center justify-center rounded-md px-2 text-lg font-semibold tabular-nums"
        style={{
          background: color,
          color: score !== null && (score < 18 || score > 82) ? '#FFFFFF' : '#0F172A',
        }}
      >
        {score === null ? '—' : format(score)}
      </span>
    </TapTooltip>
  )
}

export function formatPercent(value: number, digits = 0) {
  return `${value.toFixed(digits).replace('.', ',')} %`
}
