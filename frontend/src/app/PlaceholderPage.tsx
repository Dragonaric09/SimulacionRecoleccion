import { Construction, FileChartColumn, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/analytics/Badge'
import { ExportActions } from '@/components/analytics/ExportActions'
import { FilterToolbar } from '@/components/analytics/FilterToolbar'
import { KpiCard } from '@/components/analytics/KpiCard'
import { StatusPanel } from '@/components/analytics/StatusPanel'
import { CargarDatosPage } from '@/features/encuesta/CargarDatosPage'
import type { NavigationItem } from './navigation'

export function PlaceholderPage({ route }: { route: NavigationItem }) {
  if (route.path === '/cargar-datos') {
    return <CargarDatosPage />
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageIntro title={route.label} description={route.description} section={route.section} />
      <FilterToolbar count="Sin dataset seleccionado" onReset={() => undefined} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Respuestas válidas" value="—" detail="Sin datos disponibles" note="n no disponible" icon={Users} tone={route.section === 'general' ? 'neutral' : route.section} />
        <KpiCard label="Indicador principal" value="—" detail="Se mostrará al importar" note="Pendiente de dataset" icon={FileChartColumn} tone={route.section === 'general' ? 'neutral' : route.section} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Construction className="size-5" /> Vista preparada</CardTitle>
          <CardDescription>La ruta y el layout están disponibles. La vista se conectará a sus datos en la fase correspondiente.</CardDescription>
        </CardHeader>
        <CardContent>
          <StatusPanel kind="info" title="Estado provisional" description="Esta pantalla conserva su lugar en la navegación para permitir una migración progresiva sin enlaces rotos." />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><Badge tone={route.section === 'general' ? 'neutral' : route.section}>{route.section === 'titulados' ? 'Titulados' : 'Empleadores'}</Badge><ExportActions /></div>
        </CardContent>
      </Card>
    </div>
  )
}

function PageIntro({ title, description, section }: { title: string; description: string; section: NavigationItem['section'] }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3"><p className="caption-bold uppercase tracking-wider text-ink-600">SimulacionEM</p>{section !== 'general' && <Badge tone={section}>{section === 'titulados' ? 'Titulados' : 'Empleadores'}</Badge>}</div>
      <h1 className="headline-page">{title}</h1>
      <p className="max-w-2xl text-sm text-ink-600">{description}</p>
    </div>
  )
}

