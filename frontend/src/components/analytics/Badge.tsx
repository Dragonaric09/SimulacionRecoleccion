import type { ReactNode } from 'react'
import { cn } from 'cn'

export function Badge({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'titulados' | 'empleadores' | 'warning' | 'success'; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold', `badge-${tone}`, className)}>{children}</span>
}

