import { Badge } from '@/components/analytics/Badge'
import { StatusPanel } from '@/components/analytics/StatusPanel'
import { Button } from '@/components/ui/button'
import { navigate } from '@/app/navigation'

/** Título de pantalla con el chip de sección «Empleadores» (verde azulado). */
export function EmployerPageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="headline-page">{title}</h1>
        <Badge tone="empleadores">Empleadores</Badge>
      </div>
      <p className="max-w-3xl text-sm text-ink-600">{description}</p>
    </div>
  )
}

/** Estado «sin datos cargados» de la sección. */
export function NoEmployerDataPanel() {
  return (
    <StatusPanel kind="info" title="Aún no hay encuestas de empleadores cargadas" description="Carga el archivo de respuestas de empleadores para habilitar esta pantalla.">
      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => navigate('/cargar-datos')}>
        Cargar datos
      </Button>
    </StatusPanel>
  )
}
