export type CsvCell = string | number | null | undefined

/** Descarga datos tabulares con BOM UTF-8 para que Excel conserve los acentos. */
export function downloadAnalyticsCsv(
  fileName: string,
  headers: string[],
  rows: CsvCell[][],
) {
  const escape = (value: CsvCell) => {
    const text = value == null ? '' : String(value)
    return `"${text.replaceAll('"', '""')}"`
  }
  const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = `${slugify(fileName)}.csv`
  anchor.click()
  URL.revokeObjectURL(href)
}

export function downloadDistributionCsv(
  title: string,
  entries: readonly { label: string; count: number; percent?: number }[],
  total: number,
) {
  downloadAnalyticsCsv(
    title,
    ['Categoría', 'Conteo', 'Porcentaje', 'Base válida (n)'],
    entries.map((entry) => [
      entry.label,
      entry.count,
      `${(entry.percent ?? (total ? (entry.count * 100) / total : 0)).toFixed(1).replace('.', ',')} %`,
      total,
    ]),
  )
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'datos-analiticos'
}
