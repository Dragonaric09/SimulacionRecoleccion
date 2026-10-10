import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from 'cn'

export function KpiCard({ label, value, detail, note, icon: Icon, tone = 'neutral' }: { label: string; value: string; detail?: string; note?: string; icon?: LucideIcon; tone?: 'neutral' | 'titulados' | 'empleadores' }) {
  return (
    <Card className="kpi-card h-fit gap-0 py-0">
      <CardContent className="space-y-2 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="caption-bold text-ink-600">{label}</p>
          {Icon && <Icon className={cn('size-5', tone === 'titulados' ? 'text-titulados' : tone === 'empleadores' ? 'text-empleadores' : 'text-slate-400')} />}
        </div>
        <p className="display-kpi tabular-nums text-ink-900">{value}</p>
        {detail && <p className="body-medium text-ink-600">{detail}</p>}
        {note && <p className="caption-meta text-ink-500">{note}</p>}
      </CardContent>
    </Card>
  )
}
