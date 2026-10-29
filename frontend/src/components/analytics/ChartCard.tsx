import { useRef, type ReactNode } from 'react'
import { Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from 'cn'
import {
  formatDistributionTooltip,
  formatMeanValue,
  formatTooltipPercent,
  type VisualizationTooltipDatum,
} from './visualizationTooltip'
import { chartDownloadFormat, downloadChartPng } from './chartDownload'
import { DownloadMenu, type DownloadOption } from './DownloadMenu'
import { TapTooltip } from './TapTooltip'

/**
 * Tarjeta de gráfico: título descriptivo, «n = X» (personas que respondieron esa pregunta),
 * tooltip (i) con la definición de lo que mide y exportación CSV. No lleva texto narrativo.
 */
export function ChartCard({
  title,
  n,
  help,
  onExportCsv,
  onExportChart,
  showHelp = true,
  showExportCsv = true,
  showExportChart = true,
  headerActions,
  children,
  className,
}: {
  title: string
  n?: number
  help?: string
  onExportCsv?: () => void
  onExportChart?: () => void
  showHelp?: boolean
  showExportCsv?: boolean
  showExportChart?: boolean
  headerActions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Card
      className={cn('chart-card h-full gap-0 border border-border-line py-0 shadow-sm', className)}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0 space-y-1">
          <CardTitle className="title-card">{title}</CardTitle>
          {n !== undefined && <CardDescription className="caption-meta">n = {n}</CardDescription>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {headerActions}
          <ChartCardActions
            title={title}
            help={showHelp ? help : undefined}
            onExportCsv={showExportCsv ? onExportCsv : undefined}
            onExportChart={showExportChart ? onExportChart : undefined}
          />
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-4">{children}</CardContent>
    </Card>
  )
}

/** Acciones consistentes: contexto metodológico y datos de la visualización. */
export function ChartCardActions({
  title,
  help,
  onExportCsv,
  onExportChart,
}: {
  title: string
  help?: string
  onExportCsv?: () => void
  onExportChart?: () => void
}) {
  if (!help && !onExportCsv && !onExportChart) return null
  const exportCardPng = async (trigger: HTMLElement | null) => {
    const card = trigger?.closest<HTMLElement>('[data-slot="card"]')
    if (!card) return
    try {
      await downloadChartPng(card, title)
    } catch (cause) {
      console.error(`No se pudo descargar el PNG de «${title}».`, cause)
      window.alert('No se pudo preparar el PNG. Revise la consola del navegador para más detalles.')
    }
  }
  return (
    <div className="flex shrink-0 items-center gap-0.5" data-chart-export-exclude>
      {help && <HelpHint title={title} help={help} />}
      <ChartDownload
        title={title}
        onExportCsv={onExportCsv}
        onExportChart={onExportChart}
        onExportCardPng={exportCardPng}
      />
    </div>
  )
}

/** Ícono (i) con la definición de lo que mide la visualización; se abre con el cursor o al tocarlo. */
export function HelpHint({ title, help }: { title: string; help: ReactNode }) {
  return (
    <TapTooltip content={help}>
      <Button variant="ghost" size="icon-sm" aria-label={`Cómo interpretar: ${title}`}>
        <Info />
      </Button>
    </TapTooltip>
  )
}

/**
 * Descarga de una tarjeta con el mismo ícono que el resto del sistema. Ofrece los datos (CSV) y la imagen (PNG)
 * cuando ambos existen; el formato preferido por la compilación (VITE_ANALYTICS_CHART_DOWNLOAD_FORMAT) va primero.
 */
function ChartDownload({
  title,
  onExportCsv,
  onExportChart,
  onExportCardPng,
}: {
  title: string
  onExportCsv?: () => void
  onExportChart?: () => void
  onExportCardPng: (trigger: HTMLElement | null) => Promise<void>
}) {
  const anchor = useRef<HTMLSpanElement>(null)
  const csv: DownloadOption | null = onExportCsv
    ? { label: 'Datos CSV', help: 'Los datos de esta visualización', onSelect: onExportCsv }
    : null
  const png: DownloadOption | null =
    onExportChart || chartDownloadFormat === 'png'
      ? {
          label: 'Imagen PNG',
          help: 'La visualización tal como se ve',
          onSelect: () => (onExportChart ? onExportChart() : onExportCardPng(anchor.current)),
        }
      : null
  const options = (chartDownloadFormat === 'png' ? [png, csv] : [csv, png]).filter(
    (option): option is DownloadOption => option !== null,
  )
  if (options.length === 0) return null
  return (
    <span ref={anchor} className="inline-flex">
      <DownloadMenu title={title} options={options} />
    </span>
  )
}

/** Detalle de una marca concreta (barra, segmento o celda): con el cursor o al tocarla. */
export function DataPointTooltip({
  content,
  children,
}: {
  content: ReactNode
  children: ReactNode
}) {
  return <TapTooltip content={content}>{children}</TapTooltip>
}

/**
 * Variante única para marcas interactivas. Cada tipo de gráfico declara qué dato
 * codifica su marca y este componente presenta el detalle de forma consistente.
 */
export function VisualizationDataTooltip({
  datum,
  children,
}: {
  datum: VisualizationTooltipDatum
  children: ReactNode
}) {
  return (
    <DataPointTooltip content={<VisualizationTooltipContent datum={datum} />}>
      {children}
    </DataPointTooltip>
  )
}

export function VisualizationTooltipContent({ datum }: { datum: VisualizationTooltipDatum }) {
  if (datum.kind === 'heatmap') {
    return (
      <div className="grid gap-0.5">
        <strong>{datum.row}</strong>
        <span>
          Nivel {datum.column}: {datum.count} de {datum.total} respuestas válidas
        </span>
        <span className="text-muted-foreground">
          El color expresa la intensidad de esta frecuencia.
        </span>
      </div>
    )
  }
  if (datum.kind === 'scatter') {
    return (
      <div className="grid gap-0.5">
        <strong>{datum.label}</strong>
        <span>
          {datum.xLabel}: {datum.xValue}
        </span>
        <span>
          {datum.yLabel}: {datum.yValue}
        </span>
        {datum.note && <span className="text-muted-foreground">{datum.note}</span>}
      </div>
    )
  }
  if (datum.kind === 'mean') {
    return (
      <div className="grid gap-0.5">
        <strong>{datum.label}</strong>
        <span>
          Media: {formatMeanValue(datum.value)} de 5
          {datum.sampleSize === undefined ? '' : ` · n = ${datum.sampleSize}`}
        </span>
        <span className="text-muted-foreground">
          Longitud de la barra: valor medio en la escala de 1 a 5.
        </span>
      </div>
    )
  }
  const percent = datum.percent ?? (datum.total ? (datum.count * 100) / datum.total : 0)
  const representation = {
    bar: 'Longitud de la barra',
    column: 'Altura de la columna',
    stacked: 'Ancho del segmento',
    donut: 'Arco de la dona',
  }[datum.kind]
  return (
    <div className="grid gap-0.5">
      <strong>{datum.label}</strong>
      <span>{formatDistributionTooltip(datum, percent)}</span>
      <span className="text-muted-foreground">
        {representation}: {formatTooltipPercent(percent)} de n.
      </span>
    </div>
  )
}

/** Aviso ámbar para muestras pequeñas (menos de 5 registros). */
export function SmallSampleNotice({ count }: { count: number }) {
  return (
    <div
      role="status"
      className="rounded-lg border border-[#F2A33A] bg-[#FEF3C7] px-4 py-3.5 text-sm text-[#78350F]"
    >
      Quedan pocos registros ({count}), interprete con cautela.
    </div>
  )
}
