import { useRef, useState, type ReactNode } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from 'cn'

/**
 * Información contextual que funciona con mouse y con pantalla táctil.
 *
 * Un tooltip de Radix solo se abre con el puntero encima: en un celular el ícono (i) no mostraba nada.
 * Aquí, con mouse se abre al pasar el cursor; al tocar (o con teclado) el disparador se comporta como un
 * botón que abre y cierra el contenido, y un toque fuera lo cierra.
 */
export function TapTooltip({
  content,
  children,
  side = 'top',
  className,
}: {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<number | undefined>(undefined)
  const pointer = useRef<string>('mouse')

  const openFromMouse = (pointerType: string) => {
    pointer.current = pointerType
    if (pointerType !== 'mouse') return
    window.clearTimeout(closeTimer.current)
    setOpen(true)
  }
  const closeFromMouse = (pointerType: string) => {
    if (pointerType !== 'mouse') return
    closeTimer.current = window.setTimeout(() => setOpen(false), 120)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        asChild
        onPointerEnter={(event) => openFromMouse(event.pointerType)}
        onPointerLeave={(event) => closeFromMouse(event.pointerType)}
        onPointerDown={(event) => {
          pointer.current = event.pointerType
        }}
        onClick={(event) => {
          // Con mouse el contenido ya está abierto por el hover: el clic no debe cerrarlo.
          if (pointer.current === 'mouse' && open) event.preventDefault()
        }}
      >
        {children}
      </PopoverTrigger>
      <PopoverContent
        side={side}
        sideOffset={6}
        collisionPadding={12}
        role="tooltip"
        className={cn('w-auto max-w-xs gap-1 px-3 py-2 text-left text-xs leading-relaxed', className)}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onPointerEnter={(event) => openFromMouse(event.pointerType)}
        onPointerLeave={(event) => closeFromMouse(event.pointerType)}
      >
        {content}
      </PopoverContent>
    </Popover>
  )
}
