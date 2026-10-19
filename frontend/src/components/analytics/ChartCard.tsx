import type { ReactNode } from 'react'
import { Check, Download, FilePlus2, ImageDown, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from 'cn'
import { addReportModule, isReportModuleSelected, reportModuleForTitle, REPORT_SELECTION_EVENT } from '@/features/reporting/reportSelection'
import { useEffect, useState } from 'react'

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
  const reportModule = reportModuleForTitle(title)
  const [inReport, setInReport] = useState(() => reportModule ? isReportModuleSelected(reportModule.id) : false)

  useEffect(() => {
    if (!reportModule) return
    const refresh = () => setInReport(isReportModuleSelected(reportModule.id))
    window.addEventListener(REPORT_SELECTION_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(REPORT_SELECTION_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [reportModule])

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
          {reportModule && (
            <Button
              variant={inReport ? 'ghost' : 'outline'}
              size="sm"
              aria-label={inReport ? `Incluida en el reporte: ${title}` : `Añadir al reporte: ${title}`}
              onClick={() => { addReportModule(reportModule.id); setInReport(true) }}
              title={inReport ? 'Incluida en el reporte dinámico' : 'Añadir esta gráfica al reporte dinámico'}
            >
              {inReport ? <Check /> : <FilePlus2 />}
              <span className="hidden xl:inline">{inReport ? 'En reporte' : 'Añadir al reporte'}</span>
            </Button>
          )}
          {showHelp && help && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`Qué mide: ${title}`}>
                    <Info />
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-left">{help}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {showExportCsv && onExportCsv && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Exportar CSV: ${title}`}
              onClick={onExportCsv}
            >
              <Download />
            </Button>
          )}
          {showExportChart && onExportChart && (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Descargar gráfica: ${title}`}
              onClick={onExportChart}
            >
              <ImageDown />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-4">{children}</CardContent>
    </Card>
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
