import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Check, FilePlus2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { addReportModule, isReportModuleSelected, reportModuleForTitle, REPORT_SELECTION_EVENT } from '@/features/reporting/reportSelection'
import { useEffect, useState } from 'react'
import { cn } from 'cn'

export function KpiCard({ label, value, detail, note, icon: Icon, tone = 'neutral' }: { label: string; value: string; detail?: string; note?: string; icon?: LucideIcon; tone?: 'neutral' | 'titulados' | 'empleadores' }) {
  const reportModule = reportModuleForTitle(label)
  const [inReport, setInReport] = useState(() => reportModule ? isReportModuleSelected(reportModule.id) : false)
  useEffect(() => {
    if (!reportModule) return
    const refresh = () => setInReport(isReportModuleSelected(reportModule.id))
    window.addEventListener(REPORT_SELECTION_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => { window.removeEventListener(REPORT_SELECTION_EVENT, refresh); window.removeEventListener('storage', refresh) }
  }, [reportModule])
  return (
    <Card className="kpi-card h-full gap-0 py-0">
      <CardContent className="flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="caption-bold min-h-10 text-ink-600">{label}</p>
          <div className="flex items-center gap-1">{reportModule && <Button variant="ghost" size="icon-sm" aria-label={inReport ? `Incluida en el reporte: ${label}` : `Añadir al reporte: ${label}`} onClick={() => { addReportModule(reportModule.id); setInReport(true) }} title={inReport ? 'Incluida en el reporte dinámico' : 'Añadir al reporte dinámico'}>{inReport ? <Check /> : <FilePlus2 />}</Button>}{Icon && <Icon className={cn('size-5', tone === 'titulados' ? 'text-titulados' : tone === 'empleadores' ? 'text-empleadores' : 'text-slate-400')} />}</div>
        </div>
        <p className="display-kpi min-h-10 tabular-nums text-ink-900">{value}</p>
        {detail && <p className="body-medium min-h-10 text-ink-600">{detail}</p>}
        {note && <p className="caption-meta mt-auto min-h-4 text-ink-500">{note}</p>}
      </CardContent>
    </Card>
  )
}
