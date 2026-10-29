import { useState, type ComponentProps, type ReactNode } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from 'cn'

export type DownloadOption = {
  label: string
  /** Qué contiene el archivo; se muestra bajo la etiqueta en el menú. */
  help?: string
  onSelect: () => void | Promise<void>
  disabled?: boolean
}

/**
 * Único control de descarga de la aplicación: siempre el mismo ícono, en tarjetas de gráficos, tablas, cruces y
 * simulación. Con una opción descarga directamente; con varias abre un menú con los formatos.
 */
export function DownloadMenu({
  title,
  options,
  disabled = false,
  className,
  triggerText,
  triggerVariant = 'ghost',
  triggerSize = 'icon-sm',
}: {
  /** Qué se descarga, para el nombre accesible del botón. */
  title: string
  options: DownloadOption[]
  disabled?: boolean
  className?: string
  /** Etiqueta visible opcional para aclarar qué acción ofrece el menú. */
  triggerText?: ReactNode
  triggerVariant?: ComponentProps<typeof Button>['variant']
  triggerSize?: ComponentProps<typeof Button>['size']
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const available = options.filter((option) => !option.disabled)
  const run = async (option: DownloadOption) => {
    setOpen(false)
    setBusy(true)
    try {
      await option.onSelect()
    } finally {
      setBusy(false)
    }
  }
  const icon = busy ? <Loader2 className="animate-spin" /> : <Download />
  const triggerLabel =
    available.length === 1 ? `${available[0].label}: ${title}` : `Descargar: ${title}`

  if (options.length <= 1) {
    const only = options[0]
    return (
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        className={cn('download-action', className)}
        aria-label={only ? triggerLabel : `Descargar: ${title}`}
        title={only?.help ?? only?.label}
        disabled={disabled || busy || !only || only.disabled}
        onClick={() => only && void run(only)}
        data-chart-export-exclude
      >
        {icon}
        {triggerText && <span>{triggerText}</span>}
      </Button>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={triggerVariant}
          size={triggerSize}
          className={cn('download-action', className)}
          aria-label={triggerLabel}
          disabled={disabled || busy || available.length === 0}
          data-chart-export-exclude
        >
          {icon}
          {triggerText && <span>{triggerText}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 gap-0 p-1.5" data-chart-export-exclude>
        <p className="px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-ink-600">
          Descargar
        </p>
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            disabled={option.disabled}
            onClick={() => void run(option)}
            className="flex w-full flex-col items-start rounded-md px-2.5 py-2 text-left hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-45"
          >
            <span className="text-sm font-medium text-ink-900">{option.label}</span>
            {option.help && <span className="text-xs text-ink-600">{option.help}</span>}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
