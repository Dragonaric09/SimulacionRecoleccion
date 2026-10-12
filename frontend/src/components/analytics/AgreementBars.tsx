import { contrastTextColor } from '@/lib/utils'
import { AGREEMENT_SCALE, NEUTRAL_GRAY, NO_KNOW_LABEL } from '@/features/empleadores/instrumento'

export type AgreementRowData = {
  key: string
  label: string
  counts: Record<string, number>
  validCount: number
}

/**
 * Barras apiladas horizontales de una escala de acuerdo, con el conteo dentro de cada segmento.
 * «No sabe» va aparte, en gris, después de un hueco: no es un nivel de la escala.
 */
export function AgreementBars({ rows }: { rows: AgreementRowData[] }) {
  return (
    <div className="space-y-5">
      <AgreementLegend />
      {rows.map((row) => <AgreementRow key={row.key} row={row} />)}
    </div>
  )
}

function AgreementLegend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600" aria-label="Leyenda de la escala">
      {AGREEMENT_SCALE.map((level) => (
        <li key={level.value} className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm" style={{ backgroundColor: level.color }} aria-hidden="true" />
          {level.value}
        </li>
      ))}
      <li className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm" style={{ backgroundColor: NEUTRAL_GRAY }} aria-hidden="true" />
        {NO_KNOW_LABEL} (aparte)
      </li>
    </ul>
  )
}

function AgreementRow({ row }: { row: AgreementRowData }) {
  const total = Math.max(row.validCount, 1)
  const noKnow = row.counts[NO_KNOW_LABEL] ?? 0
  const summary = AGREEMENT_SCALE.map((level) => `${level.value}: ${row.counts[level.value] ?? 0}`)
    .concat(`${NO_KNOW_LABEL}: ${noKnow}`)
    .join('; ')
  return (
    <div className="grid gap-2 border-b border-slate-100 pb-5 last:border-b-0 last:pb-0">
      <div className="flex items-start justify-between gap-3">
        <p className="line-clamp-2 text-sm leading-5 text-ink-900" title={row.label}>{row.label}</p>
        <span className="caption-meta shrink-0 text-ink-600">n = {row.validCount}</span>
      </div>
      <div className="flex h-8 w-full items-stretch gap-1 overflow-hidden" role="img" aria-label={summary}>
        {AGREEMENT_SCALE.map((level) => {
          const count = row.counts[level.value] ?? 0
          return count > 0 ? (
            <Segment key={level.value} width={(count * 100) / total} color={level.color} count={count} />
          ) : null
        })}
        {noKnow > 0 && (
          <>
            <span className="w-2 shrink-0" aria-hidden="true" />
            <Segment width={(noKnow * 100) / total} color={NEUTRAL_GRAY} count={noKnow} />
          </>
        )}
      </div>
    </div>
  )
}

function Segment({ width, color, count }: { width: number; color: string; count: number }) {
  return (
    <span
      className="flex items-center justify-center text-xs font-semibold tabular-nums"
      style={{ width: `${width}%`, backgroundColor: color, color: contrastTextColor(color) }}
    >
      {width >= 6 ? count : null}
    </span>
  )
}
