import type { ComponentProps, ReactNode } from 'react'
import { cn } from 'cn'

type BadgeTone = 'neutral' | 'titulados' | 'empleadores' | 'warning' | 'success';

type BadgeProps = Omit<ComponentProps<'span'>, 'children'> & {
  children: ReactNode;
  tone?: BadgeTone;
};

export function Badge({ children, tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      data-tone={tone}
      className={cn(
        'inline-flex h-6 w-fit shrink-0 items-center justify-center gap-1 rounded-full border border-transparent px-2.5 text-xs font-semibold leading-4 whitespace-nowrap transition-colors [&>svg]:size-3 [&>svg]:shrink-0',
        `badge-${tone}`,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
