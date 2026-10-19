import type { ReactNode } from 'react'

export type AssociationMatrixRow = {
  label: string
  cells: { count: number; percent: number }[]
  total: number
}

export function AssociationMatrix({
  rowHeader,
  columns,
  rows,
  total,
  excluded,
  excludedLabel = 'excluidas',
  excludedDescription = 'por «No sabe» o sin respuesta',
  unitLabel = 'organizaciones',
  test,
  footer,
  cellColor = (percent) => `rgba(20, 163, 154, ${0.08 + (percent / 100) * 0.8})`,
}: {
  rowHeader: ReactNode
  columns: string[]
  rows: AssociationMatrixRow[]
  total: number
  excluded?: number
  excludedLabel?: string
  excludedDescription?: string
  unitLabel?: string
  test?: ReactNode
  /** Reemplaza la nota estándar cuando la matriz no es una contingencia (p. ej. preguntas multirrespuesta). */
  footer?: ReactNode
  cellColor?: (percent: number, columnIndex: number) => string
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="knowledge-matrix w-full min-w-[520px] border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th className="w-[34%] text-left align-bottom text-[11px] font-semibold text-ink-600">
                {rowHeader}
              </th>
              {columns.map((column) => (
                <th key={column} className="text-center text-[11px] font-semibold text-ink-600">
                  {column}
                </th>
              ))}
              <th className="w-14 text-right text-[11px] font-semibold text-ink-600">n</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td className="font-medium text-ink-900">{row.label}</td>
                {row.cells.map((cell, index) => (
                  <td
                    key={`${row.label}-${index}`}
                    className="h-12 rounded-sm text-center tabular-nums"
                    style={{
                      background: cellColor(cell.percent, index),
                      color: cell.percent > 55 ? '#FFFFFF' : '#0F172A',
                    }}
                  >
                    <div className="font-semibold">{cell.count}</div>
                    <div className="text-[10px] opacity-80">
                      {cell.percent.toFixed(0).replace('.', ',')} %
                    </div>
                  </td>
                ))}
                <td className="text-right tabular-nums text-ink-600">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer ?? (
        <p className="caption-meta text-ink-500">
          Porcentaje por fila. n = {total} {unitLabel} con ambas respuestas
          {excluded !== undefined ? `; ${excluded} ${excludedLabel} ${excludedDescription}.` : '.'}
        </p>
      )}
      {test}
    </div>
  )
}
