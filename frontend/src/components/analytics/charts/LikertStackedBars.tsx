export type LikertSegment = { key: string; label: string; value: number; count?: number }
export type LikertRow = { label: string; segments: LikertSegment[] }

export function LikertStackedBars({
  rows,
  colors,
  height = 22,
  showValues = false,
}: {
  rows: LikertRow[]
  colors: readonly string[]
  height?: number
  showValues?: boolean
}) {
  if (rows.length === 0)
    return (
      <p className="flex h-20 items-center justify-center text-sm text-ink-600">
        Sin respuestas disponibles.
      </p>
    )
  return (
    <div
      className="flex w-full flex-col justify-center gap-2"
      style={{ minHeight: Math.max(40, rows.length * (height + 18)) }}
    >
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          {row.label && <div className="mb-1 truncate text-xs text-ink-700">{row.label}</div>}
          <div className="flex overflow-hidden rounded-md" style={{ height }}>
            {row.segments.map((segment, index) => (
              <TapTooltip key={segment.key} content={<div className="grid gap-0.5"><strong>{segment.label}</strong><span>{segment.count ?? '—'} respuestas · {segment.value.toFixed(1).replace('.', ',')} %</span></div>}>
                <div
                  tabIndex={0}
                  aria-label={`${segment.label}: ${segment.count ?? 'sin dato'} respuestas, ${segment.value.toFixed(1).replace('.', ',')} %`}
                  className="flex min-w-0 cursor-help items-center justify-center px-1 text-[11px] font-semibold"
                  style={{
                    width: `${segment.value}%`,
                    backgroundColor: colors[index % colors.length],
                    color: segment.value >= 8 ? '#fff' : 'transparent',
                  }}
                >
                  {showValues && segment.value >= 8
                    ? `${segment.count ?? ''} (${segment.value.toFixed(1).replace('.', ',')} %)`
                    : ''}
                </div>
              </TapTooltip>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
import { TapTooltip } from '../TapTooltip'
