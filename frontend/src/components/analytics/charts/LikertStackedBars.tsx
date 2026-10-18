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
              <div
                key={segment.key}
                className="flex min-w-0 items-center justify-center px-1 text-[11px] font-semibold"
                style={{
                  width: `${segment.value}%`,
                  backgroundColor: colors[index % colors.length],
                  color: segment.value >= 8 ? '#fff' : 'transparent',
                }}
                title={`${segment.label}: ${segment.count ?? ''} (${segment.value.toFixed(1).replace('.', ',')} %)`}
              >
                {showValues && segment.value >= 8
                  ? `${segment.count ?? ''} (${segment.value.toFixed(1).replace('.', ',')} %)`
                  : ''}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
