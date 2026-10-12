import { useState } from 'react'
import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilterMenu } from '@/components/analytics/FilterToolbar'
import { ORGANIZATION_SIZE_ORDER, ORGANIZATION_TYPE_OPTIONS } from './instrumento'
import type { EmployerFilters } from './employerData'

/** Barra de filtros única de la sección Empleadores: tipo y tamaño de la organización. */
export function EmployerFilterToolbar({ filters, onToggle, onClear, active, validCount, totalCount }: {
  filters: EmployerFilters
  onToggle: (key: keyof EmployerFilters, value: string) => void
  onClear: (key?: keyof EmployerFilters) => void
  active: boolean
  validCount?: number
  totalCount?: number
}) {
  const [open, setOpen] = useState<string | null>(null)
  const selectionLabel = (values: string[]) => (values.length === 0 ? 'Todos' : `${values.length} seleccionados`)
  const reduced = validCount !== undefined && totalCount !== undefined && validCount < totalCount

  return (
    <div className="filter-toolbar flex flex-wrap items-end gap-x-3 gap-y-2 rounded-lg border border-border-line bg-white p-3 shadow-sm">
      <div className="flex h-10 items-center gap-1.5 text-sm font-medium text-ink-900">
        <SlidersHorizontal className="h-4 w-4 text-empleadores" />
        Filtros
      </div>
      <FilterMenu
        label="Tipo de organización"
        value={selectionLabel(filters.organizationTypes)}
        open={open === 'type'}
        onOpen={() => setOpen(open === 'type' ? null : 'type')}
        options={[...ORGANIZATION_TYPE_OPTIONS]}
        selected={filters.organizationTypes}
        onToggle={(value) => onToggle('organizationTypes', value)}
        onClear={() => onClear('organizationTypes')}
      />
      <FilterMenu
        label="Tamaño de la organización"
        value={selectionLabel(filters.organizationSizes)}
        open={open === 'size'}
        onOpen={() => setOpen(open === 'size' ? null : 'size')}
        options={[...ORGANIZATION_SIZE_ORDER]}
        selected={filters.organizationSizes}
        onToggle={(value) => onToggle('organizationSizes', value)}
        onClear={() => onClear('organizationSizes')}
      />
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
