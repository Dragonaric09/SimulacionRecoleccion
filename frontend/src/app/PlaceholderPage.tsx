import { Clock3, Construction, Database } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChiCuadradoDemo } from '@/features/analitica/ChiCuadradoDemo'
import type { NavigationItem } from './navigation'

export function PlaceholderPage({ route }: { route: NavigationItem }) {
  if (route.path === '/cargar-datos') {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <PageIntro title="Cargar datos" description="Importa un CSV para habilitar los análisis del sistema." />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Database className="size-5" /> Importación de datasets</CardTitle>
            <CardDescription>La pantalla de carga se conectará a los endpoints de validación e importación en la fase 7.</CardDescription>
          </CardHeader>
          <CardContent><div className="rounded-lg border border-dashed p-10 text-center text-sm text-slate-500">Zona de carga preparada para la siguiente fase</div></CardContent>
        </Card>
        <ChiCuadradoDemo />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageIntro title={route.label} description={route.description} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Construction className="size-5" /> Vista preparada</CardTitle>
          <CardDescription>La ruta y el layout están disponibles. La vista se conectará a sus datos en la fase correspondiente.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 rounded-lg border bg-slate-50 p-4 text-sm text-slate-600">
            <Clock3 className="mt-0.5 size-4 shrink-0" />
            <p>Esta pantalla conserva su lugar en la navegación para permitir una migración progresiva sin enlaces rotos.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PageIntro({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">SimulacionEM</p>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <p className="max-w-2xl text-sm text-slate-600">{description}</p>
    </div>
  )
}

