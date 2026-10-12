import type { ReactNode } from 'react'
import { Download, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from 'cn'

/**
 * Tarjeta de gráfico: título descriptivo, «n = X» (personas que respondieron esa pregunta),
 * tooltip (i) con la definición de lo que mide y exportación CSV. No lleva texto narrativo.
 */
export function ChartCard({ title, n, help, onExportCsv, children, className }: {
  title: string
  n?: number
  help?: string
  onExportCsv?: () => void
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('chart-card h-full gap-0 border border-border-line py-0 shadow-sm', className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0 space-y-1">
          <CardTitle className="title-card">{title}</CardTitle>
          {n !== undefined && <CardDescription className="caption-meta">n = {n}</CardDescription>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {help && (
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
          {onExportCsv && (
            <Button variant="ghost" size="icon-sm" aria-label={`Exportar CSV: ${title}`} onClick={onExportCsv}>
              <Download />
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
    <div role="status" className="rounded-lg border border-[#F2A33A] bg-[#FEF3C7] px-4 py-3.5 text-sm text-[#78350F]">
      Quedan pocos registros ({count}), interprete con cautela.
    </div>
  )
}
