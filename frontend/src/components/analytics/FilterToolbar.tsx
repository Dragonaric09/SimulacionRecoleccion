import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function FilterToolbar({ count, onReset }: { count?: string; onReset?: () => void }) {
  return (
    <div className="filter-toolbar">
      <div className="flex items-center gap-2"><SlidersHorizontal className="size-4 text-ink-600" /><span className="label-default text-ink-600">Filtros</span></div>
      <Select defaultValue="todos"><SelectTrigger className="control" aria-label="Periodo"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos los periodos</SelectItem><SelectItem value="2024">2024</SelectItem><SelectItem value="2023">2023</SelectItem></SelectContent></Select>
      <Select defaultValue="todos"><SelectTrigger className="control" aria-label="Estado"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todas las respuestas</SelectItem><SelectItem value="validas">Válidas</SelectItem></SelectContent></Select>
      {count && <span className="ml-auto rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-ink-900">{count}</span>}
      {onReset && <Button variant="ghost" size="sm" onClick={onReset}><RotateCcw />Limpiar</Button>}
    </div>
  )
}

