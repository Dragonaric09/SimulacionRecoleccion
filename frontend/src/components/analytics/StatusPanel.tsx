import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'

const icons: Record<'info' | 'warning' | 'success', LucideIcon> = { info: Info, warning: AlertTriangle, success: CheckCircle2 }

export function StatusPanel({ title, description, kind = 'info', children }: { title: string; description?: string; kind?: 'info' | 'warning' | 'success' | 'loading'; children?: ReactNode }) {
  const Icon = kind === 'loading' ? Spinner : icons[kind]
  return (
    <Alert className={`status-panel status-${kind} flex gap-3`}>
      <Icon className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 space-y-1">
        <AlertTitle className="body-medium">{title}</AlertTitle>
        {description && <AlertDescription className="body-default">{description}</AlertDescription>}
        {kind === 'loading' && (
          <div className="space-y-2 pt-2" aria-hidden="true">
            <Skeleton className="h-2.5 w-40" />
            <Skeleton className="h-2.5 w-64 max-w-full" />
          </div>
        )}
        {children}
      </div>
    </Alert>
  )
}

