import type { ReactNode } from 'react'
import { TapTooltip } from '../TapTooltip'

export type SegmentScoreDimension = { key: string; label: string }
export type SegmentScoreGroup = {
  category: string
  n: number
  score: number | null
  dimensions: Record<string, number | null>
}
export type SegmentScoreSection = { label: string; groups: SegmentScoreGroup[]; test?: ReactNode }

export function SegmentScoreMatrix({
  sections,
  dimensions,
  scoreColor,
  formatScore = (value) => String(value),
  smallSampleLabel = 'registros',
}: {
  sections: SegmentScoreSection[]
  dimensions: SegmentScoreDimension[]
  scoreColor: (score: number | null) => string
  formatScore?: (value: number) => string
  smallSampleLabel?: string
}) {
  return (
    <div className="overflow-x-auto">
      <table className="segment-heatmap w-full min-w-[760px] border-separate border-spacing-[3px] text-xs">
        <thead>
          <tr className="text-[11px] text-ink-600">
            <th className="text-left font-semibold">Grupo</th>
            <th className="w-12 text-right font-semibold">n</th>
            <th className="w-16 text-center font-semibold">Global</th>
            {dimensions.map((dimension) => (
              <th key={dimension.key} className="w-20 text-center font-semibold leading-tight">
                {dimension.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sections.map((section) => (
            <SegmentScoreSectionRows
              key={section.label}
              section={section}
              dimensions={dimensions}
              scoreColor={scoreColor}
              formatScore={formatScore}
              smallSampleLabel={smallSampleLabel}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SegmentScoreSectionRows({
  section,
  dimensions,
  scoreColor,
  formatScore,
  smallSampleLabel,
}: {
  section: SegmentScoreSection
  dimensions: SegmentScoreDimension[]
  scoreColor: (score: number | null) => string
  formatScore: (value: number) => string
  smallSampleLabel: string
}) {
  const columnCount = 3 + dimensions.length
  return (
    <>
      <tr>
        <td colSpan={columnCount} className="pt-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border-line pb-1">
            <span className="caption-bold text-ink-900">{section.label}</span>
            {section.test}
          </div>
        </td>
      </tr>
      {section.groups.length === 0 && (
        <tr>
          <td colSpan={columnCount} className="caption-meta py-1 text-ink-500">
            Sin respuestas en este segmento.
          </td>
        </tr>
      )}
      {section.groups.map((group) => {
        const small = group.n < 5
        return (
          <tr
            key={group.category}
            style={{ opacity: small ? 0.55 : 1 }}
            title={small ? `Menos de 5 ${smallSampleLabel}: interprete con cautela` : undefined}
          >
            <td className="max-w-[240px] truncate pr-2 text-ink-900">
              {group.category}
              {small ? ' *' : ''}
            </td>
            <td className="text-right tabular-nums text-ink-600">{group.n}</td>
            <ScoreCell
              score={group.score}
              scoreColor={scoreColor}
              formatScore={formatScore}
              strong
            />
            {dimensions.map((dimension) => (
              <TapTooltip key={dimension.key} content={<div className="grid gap-0.5"><strong>{dimension.label} · {group.category}</strong><span>{group.dimensions[dimension.key] == null ? 'Sin respuestas válidas' : `Puntaje: ${formatScore(group.dimensions[dimension.key] as number)} de 100`}</span><span>Grupo: n = {group.n}</span><span className="text-muted-foreground">Acuerdo total = 100, parcial = 50, desacuerdo = 0; «No sabe» no se incluye.</span></div>}>
                <ScoreCell
                  score={group.dimensions[dimension.key] ?? null}
                  scoreColor={scoreColor}
                  formatScore={formatScore}
                />
              </TapTooltip>
            ))}
          </tr>
        )
      })}
    </>
  )
}

function ScoreCell({
  score,
  scoreColor,
  formatScore,
  strong = false,
}: {
  score: number | null
  scoreColor: (score: number | null) => string
  formatScore: (value: number) => string
  strong?: boolean
}) {
  return (
    <td
      className={`h-7 rounded-sm text-center tabular-nums ${strong ? 'font-semibold' : ''}`}
      style={{ background: scoreColor(score), color: readableText(score) }}
    >
      {score === null ? '—' : formatScore(score)}
    </td>
  )
}

function readableText(score: number | null) {
  return score !== null && (score < 18 || score > 82) ? '#FFFFFF' : '#0F172A'
}
