import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from 'cn'

export function KpiCard({ label, value, detail, note, icon: Icon, tone = 'neutral' }: { label: string; value: string; detail?: string; note?: string; icon?: LucideIcon; tone?: 'neutral' | 'titulados' | 'empleadores' }) {
  return (
    <Card className="kpi-card h-full gap-0 py-0">
      <CardContent className="flex h-full flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="caption-bold min-h-10 text-ink-600">{label}</p>
          {Icon && <Icon className={cn('size-5', tone === 'titulados' ? 'text-titulados' : tone === 'empleadores' ? 'text-empleadores' : 'text-slate-400')} />}
        </div>
        <p className="display-kpi min-h-10 tabular-nums text-ink-900">{value}</p>
        {detail && <p className="body-medium min-h-10 text-ink-600">{detail}</p>}
        {note && <p className="caption-meta mt-auto min-h-4 text-ink-500">{note}</p>}
      </CardContent>
    </Card>
  )
}
