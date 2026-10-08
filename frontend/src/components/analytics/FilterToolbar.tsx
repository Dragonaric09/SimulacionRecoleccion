import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function FilterToolbar({ count, onReset }: { count?: string; onReset?: () => void }) {
  return (
    <div className="filter-toolbar">
      <div className="flex items-center gap-2"><SlidersHorizontal className="size-4 text-ink-600" /><span className="label-default text-ink-600">Filtros</span></div>
      <select className="control" defaultValue="todos" aria-label="Periodo"><option value="todos">Todos los periodos</option><option value="2024">2024</option><option value="2023">2023</option></select>
      <select className="control" defaultValue="todos" aria-label="Estado"><option value="todos">Todas las respuestas</option><option value="validas">Válidas</option></select>
      {count && <span className="ml-auto rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-ink-900">{count}</span>}
      {onReset && <Button variant="ghost" size="sm" onClick={onReset}><RotateCcw />Limpiar</Button>}
    </div>
  )
}

