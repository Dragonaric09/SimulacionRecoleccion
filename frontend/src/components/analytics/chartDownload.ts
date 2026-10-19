export type ChartDownloadFormat = 'csv' | 'png'

/**
 * Formato que usan los botones de descarga ya existentes en las tarjetas de gráficos.
 *
 * CSV es el comportamiento actual. Para pasar gradualmente a imágenes no se cambian
 * componentes ni botones: basta definir `VITE_ANALYTICS_CHART_DOWNLOAD_FORMAT=png`
 * durante la compilación del frontend.
 */
export const chartDownloadFormat: ChartDownloadFormat =
  import.meta.env.VITE_ANALYTICS_CHART_DOWNLOAD_FORMAT?.toLowerCase() === 'png' ? 'png' : 'csv'

/** Convierte la tarjeta que contiene una gráfica en una imagen PNG descargable. */
export async function downloadChartPng(element: HTMLElement, title: string) {
  await document.fonts?.ready
  const { toPng } = await import('html-to-image')
  const dataUrl = await toPng(element, {
    backgroundColor: '#ffffff',
    cacheBust: true,
    pixelRatio: Math.min(2, Math.max(1, window.devicePixelRatio || 1)),
    // Los popovers y las acciones no forman parte de la visualización descargable.
    filter: (node) =>
      !(node instanceof HTMLElement) ||
      (!node.hasAttribute('data-chart-export-exclude') && node.getAttribute('role') !== 'tooltip'),
  })
  downloadDataUrl(dataUrl, `${slugify(title)}.png`)
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const anchor = document.createElement('a')
  anchor.href = dataUrl
  anchor.download = fileName
  anchor.click()
}

function slugify(value: string) {
  return (
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'grafica'
  )
}
