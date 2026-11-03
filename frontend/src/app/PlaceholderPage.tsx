import { lazy, Suspense, type ReactNode } from 'react'
import { Construction, FileChartColumn, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/analytics/Badge'
import { FilterToolbar } from '@/components/analytics/FilterToolbar'
import { KpiCard } from '@/components/analytics/KpiCard'
import { StatusPanel } from '@/components/analytics/StatusPanel'
import { isEmpleadoresPath } from '@/features/empleadores/routePaths'
import { isTituladosPath } from '@/features/titulados/routePaths'
import { isDomainSection, type NavigationItem } from './navigation'

/*
 * Cada sección se descarga al abrirla: antes todas las pantallas y librerías de gráficos viajaban en el archivo
 * principal (1,95 MB) aunque el usuario solo abriera «Cargar datos».
 */
const CargarDatosPage = lazy(() =>
  import('@/features/encuesta/CargarDatosPage').then((m) => ({ default: m.CargarDatosPage })),
)
const ComparacionPage = lazy(() =>
  import('@/features/comparacion/ComparacionPage').then((m) => ({ default: m.ComparacionPage })),
)
const EmpleadoresPage = lazy(() =>
  import('@/features/empleadores/EmpleadoresPages').then((m) => ({ default: m.EmpleadoresPage })),
)
const TituladosPage = lazy(() =>
  import('@/features/titulados/TituladosPages').then((m) => ({ default: m.TituladosPage })),
)

function Section({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <StatusPanel
          kind="loading"
          title="Cargando sección"
          description="Preparando la pantalla y sus gráficos."
        />
      }
    >
      {children}
    </Suspense>
  )
}

export function PlaceholderPage({ route }: { route: NavigationItem }) {
  if (route.path === '/cargar-datos') {
    return (
      <Section>
        <CargarDatosPage />
      </Section>
    )
  }
  if (route.path === '/comparacion/titulados-empleadores') {
    return (
      <Section>
        <ComparacionPage />
      </Section>
    )
  }
  if (isTituladosPath(route.path))
    return (
      <Section>
        <TituladosPage route={route} />
      </Section>
    )
  if (isEmpleadoresPath(route.path))
    return (
      <Section>
        <EmpleadoresPage route={route} />
      </Section>
    )

  const tone = isDomainSection(route.section) ? route.section : 'neutral'
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageIntro title={route.label} description={route.description} section={route.section} />
      <FilterToolbar count="Sin dataset seleccionado" onReset={() => undefined} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Respuestas válidas"
          value="—"
          detail="Sin datos disponibles"
          note="n no disponible"
          icon={Users}
          tone={tone}
        />
        <KpiCard
          label="Indicador principal"
          value="—"
          detail="Se mostrará al importar"
          note="Pendiente de dataset"
          icon={FileChartColumn}
          tone={tone}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Construction className="size-5" /> Vista preparada
          </CardTitle>
          <CardDescription>
            La ruta y el layout están disponibles. La vista se conectará a sus datos en la fase
            correspondiente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StatusPanel
            kind="info"
            title="Estado provisional"
            description="Esta pantalla conserva su lugar en la navegación para permitir una migración progresiva sin enlaces rotos."
          />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <Badge tone={tone}>{route.section === 'titulados' ? 'Titulados' : 'Empleadores'}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PageIntro({
  title,
  description,
  section,
}: {
  title: string
  description: string
  section: NavigationItem['section']
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <p className="caption-bold uppercase tracking-wider text-ink-600">SimulacionEM</p>
        {isDomainSection(section) && (
          <Badge tone={section}>{section === 'titulados' ? 'Titulados' : 'Empleadores'}</Badge>
        )}
      </div>
      <h1 className="headline-page">{title}</h1>
      <p className="max-w-2xl text-sm text-ink-600">{description}</p>
    </div>
  )
}
