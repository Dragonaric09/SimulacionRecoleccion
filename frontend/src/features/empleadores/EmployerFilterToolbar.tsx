import { useState } from 'react'
import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilterMenu } from '@/components/analytics/FilterToolbar'
import { EMPLOYER_FILTERS, type EmployerFilterKey, type EmployerFilters } from './employerData'

/** Barra de filtros única de la sección Empleadores: perfil de la organización y situación de contratación. */
export function EmployerFilterToolbar({ filters, onToggle, onClear, active, validCount, totalCount }: {
  filters: EmployerFilters
  onToggle: (key: EmployerFilterKey, value: string) => void
  onClear: (key?: EmployerFilterKey) => void
  active: boolean
  validCount?: number
  totalCount?: number
}) {
  const [open, setOpen] = useState<string | null>(null)
  const selectionLabel = (values: string[]) => (values.length === 0 ? 'Todos' : values.length === 1 ? values[0] : `${values.length} seleccionados`)
  const reduced = validCount !== undefined && totalCount !== undefined && validCount < totalCount

  return (
    <div className="filter-toolbar flex flex-wrap items-end gap-x-3 gap-y-2 rounded-lg border border-border-line bg-white p-3 shadow-sm">
      <div className="flex h-10 items-center gap-1.5 text-sm font-medium text-ink-900">
        <SlidersHorizontal className="h-4 w-4 text-empleadores" />
        Filtros
      </div>
      {EMPLOYER_FILTERS.map(({ key, label, options }) => (
        <FilterMenu
          key={key}
          label={label}
          value={selectionLabel(filters[key])}
          open={open === key}
          onOpen={() => setOpen(open === key ? null : key)}
          options={options}
          selected={filters[key]}
          onToggle={(value) => onToggle(key, value)}
          onClear={() => onClear(key)}
        />
      ))}
      <div className="min-w-0 flex-1" />
      {totalCount !== undefined && (
        <span className={`shrink-0 whitespace-nowrap text-xs ${reduced ? 'font-semibold text-empleadores' : 'text-ink-600'}`}>
          Mostrando <strong>{validCount === undefined ? '—' : validCount.toLocaleString('es-BO')}</strong> de {totalCount.toLocaleString('es-BO')} respuestas
        </span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={!active}
        onClick={() => onClear()}
        className="shrink-0 whitespace-nowrap text-xs text-empleadores hover:text-empleadores disabled:text-ink-400"
      >
        <RotateCcw className="mr-1 h-3.5 w-3.5" />
        Limpiar filtros
      </Button>
    </div>
  )
}
