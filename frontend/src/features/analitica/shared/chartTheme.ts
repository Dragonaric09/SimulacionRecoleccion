/**
 * Colores explícitos compartidos por los gráficos de la web y los SVG del PDF.
 * No usar variables CSS aquí: estos valores también se incrustan fuera del DOM.
 */
export const reportChartPalette = [
  '#1f6fb5',
  '#14a39a',
  '#f2a33a',
  '#8b5bd1',
  '#ed552f',
  '#64748b',
] as const

export const employmentChartPalette = [
  '#1f6fb5',
  '#14a39a',
  '#94a3b8',
  '#f2a33a',
] as const

export function chartColor(index: number, palette: readonly string[] = reportChartPalette) {
  return palette[index % palette.length]
}
