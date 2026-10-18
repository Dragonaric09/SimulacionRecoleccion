import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from 'cn'

/** Contenedor común para tablas analíticas; la tabla interna conserva su estructura específica. */
export function AnalyticsTableCard({
  title,
  description,
  actions,
  children,
  className = '',
  contentClassName = '',
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <Card className={cn('print-card rounded-xl border-0 shadow-sm', className)}>
      <CardHeader>
        {
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="title-card">{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
            {actions}
          </div>
        }
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  )
}
