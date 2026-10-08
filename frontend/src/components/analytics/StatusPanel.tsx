import { AlertTriangle, CheckCircle2, Info, LoaderCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

const icons: Record<'info' | 'warning' | 'success' | 'loading', LucideIcon> = { info: Info, warning: AlertTriangle, success: CheckCircle2, loading: LoaderCircle }

export function StatusPanel({ title, description, kind = 'info', children }: { title: string; description?: string; kind?: 'info' | 'warning' | 'success' | 'loading'; children?: ReactNode }) {
  const Icon = icons[kind]
  return (
    <div role={kind === 'warning' ? 'alert' : undefined} className={`status-panel status-${kind}`}>
      <Icon className={`mt-0.5 size-5 shrink-0 ${kind === 'loading' ? 'animate-spin' : ''}`} />
      <div className="min-w-0 space-y-1"><p className="body-medium">{title}</p>{description && <p className="body-default">{description}</p>}{children}</div>
    </div>
  )
}

