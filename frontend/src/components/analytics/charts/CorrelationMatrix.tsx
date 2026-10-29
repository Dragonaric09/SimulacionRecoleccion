type CorrelationMatrixProps = {
  labels: string[]
  rho: (number | null)[][]
  pValues: (number | null)[][]
  sampleSizes: number[][]
  colorScale?: (value: number | null) => string
  formatPValue?: (value: number) => string
  correlationLabel?: string
  significanceLabel?: string
}

export function CorrelationMatrix({
  labels,
  rho,
  pValues,
  sampleSizes,
  colorScale = defaultCorrelationColor,
  formatPValue = (value) => value.toFixed(3).replace('.', ','),
  correlationLabel = 'ρ de Spearman',
  significanceLabel = '* p < 0,05',
}: CorrelationMatrixProps) {
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto">
        <table className="correlation-matrix w-full min-w-[620px] border-separate border-spacing-[3px] text-xs">
          <thead>
            <tr>
              <th />
              {labels.slice(0, -1).map((label) => (
                <th
                  key={label}
                  className="w-24 text-center text-[11px] font-semibold leading-tight text-ink-600"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.slice(1).map((rowLabel, rowOffset) => {
              const rowIndex = rowOffset + 1

              return (
                <tr key={rowLabel}>
                  <th className="pr-2 text-left text-[11px] font-semibold text-ink-700">
                    {rowLabel}
                  </th>
                  {labels.slice(0, -1).map((_, columnIndex) => {
                    if (columnIndex >= rowIndex) return <td key={columnIndex} />

                    const value = rho[rowIndex]?.[columnIndex] ?? null
                    const pValue = pValues[rowIndex]?.[columnIndex] ?? null
                    const sampleSize = sampleSizes[rowIndex]?.[columnIndex] ?? 0
                    const formattedValue =
                      value === null
                        ? '—'
                        : `${Math.abs(value) < 0.005 ? 0 : value.toFixed(2)}${
                            pValue !== null && pValue < 0.05 ? '*' : ''
                          }`

                    return (
                      <TapTooltip key={columnIndex} content={<div className="grid gap-0.5"><strong>{rowLabel} × {labels[columnIndex]}</strong><span>{correlationLabel}: {value === null ? 'no disponible' : value.toFixed(2).replace('.', ',')}</span><span>n = {sampleSize}{pValue !== null ? ` · p = ${formatPValue(pValue)}` : ''}</span><span className="text-muted-foreground">El color indica la dirección e intensidad de la relación.</span></div>}>
                        <td tabIndex={0} className="h-9 cursor-help rounded-sm text-center tabular-nums" style={{ background: colorScale(value), color: value !== null && Math.abs(value) > 0.65 ? '#FFFFFF' : '#0F172A' }}>
                          {formattedValue}
                        </td>
                      </TapTooltip>
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
        <span
          className="h-2.5 w-32 rounded-sm"
          style={{
            background: `linear-gradient(90deg, ${[-1, -0.5, 0, 0.5, 1]
              .map(colorScale)
              .join(', ')})`,
          }}
        />
        <span>+1</span>
        <span className="ml-2">
          {correlationLabel} · {significanceLabel}
        </span>
      </div>
    </div>
  )
}

function defaultCorrelationColor(value: number | null) {
  if (value === null) return '#F8FAFC'

  const normalized = Math.max(-1, Math.min(1, value))
  return normalized >= 0
    ? `rgba(31, 111, 181, ${0.12 + normalized * 0.7})`
    : `rgba(228, 87, 46, ${0.12 + Math.abs(normalized) * 0.7})`
}
import { TapTooltip } from '../TapTooltip'
