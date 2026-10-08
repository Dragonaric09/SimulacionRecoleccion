import { Construction, FileChartColumn, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/analytics/Badge'
import { ExportActions } from '@/components/analytics/ExportActions'
import { FilterToolbar } from '@/components/analytics/FilterToolbar'
import { KpiCard } from '@/components/analytics/KpiCard'
import { StatusPanel } from '@/components/analytics/StatusPanel'
import { CargarDatosPage } from '@/features/encuesta/CargarDatosPage'
import { TituladosSummaryPage } from '@/features/analitica/TituladosSummaryPage'
import { CompetencePage, CrossExportPage, DatasetAnalyticsPage, UnavailableAnalyticPage } from '@/features/analitica/RestAnalyticPages'
import type { NavigationItem } from './navigation'

export function PlaceholderPage({ route }: { route: NavigationItem }) {
  if (route.path === '/cargar-datos') {
    return <CargarDatosPage />
  }
  if (route.path === '/titulados/resumen') {
    return <TituladosSummaryPage />
  }
  if (route.path === '/titulados/perfil-empleabilidad') return <DatasetAnalyticsPage title="Perfil de empleabilidad" description="Distribuciones de situación laboral y sector de trabajo." domain="TITULADOS" endpoint="/analytics/titulados/employment" cards={[{ key: 'situacion_laboral_actual', label: 'Situación laboral' }, { key: 'sector_trabajo', label: 'Sector de trabajo' }]} />
  if (route.path === '/titulados/formacion-continua') return <DatasetAnalyticsPage title="Formación continua" description="Formación complementaria e interés en posgrado." domain="TITULADOS" endpoint="/analytics/titulados/education" cards={[{ key: 'tiene_formacion_complementaria', label: 'Formación complementaria' }, { key: 'interes_posgrado', label: 'Interés en posgrado' }]} />
  if (route.path === '/titulados/brechas-competencias') return <CompetencePage domain="TITULADOS" />
  if (route.path === '/titulados/cruces-exportacion') return <CrossExportPage domain="TITULADOS" />
  if (route.path === '/titulados/financiamiento') return <UnavailableAnalyticPage title="Financiamiento" description="Cruces entre fuente de financiamiento e interés en posgrado." domain="TITULADOS" items={['Selectores de filas y columnas: no disponible hasta contar con el endpoint de financiamiento.', 'Tabla de contingencia y mapa de calor: pendientes de contrato.', 'Chi-cuadrada y aviso de frecuencias esperadas: pendiente de integración.']} />
  if (route.path === '/titulados/simulacion-escenarios') return <UnavailableAnalyticPage title="Simulación de escenarios" description="Escenarios descriptivos sobre las frecuencias observadas." domain="TITULADOS" items={['Variable, N, repeticiones y semilla: pendientes de API.', 'Probabilidades ajustables y rango del 95 %: requieren regla matemática documentada.', 'No se muestran resultados hasta implementar el modelo en la fase 11.']} />
  if (route.path === '/empleadores/resumen-contratacion') return <DatasetAnalyticsPage title="Resumen de contratación" description="Indicadores descriptivos de tipo, tamaño y contratación." domain="EMPLEADORES" endpoint="/analytics/employers/summary" fields="tipo_organizacion,tamano_organizacion,contrato_titulados_ultimos_5_anios" cards={[{ key: 'tipo_organizacion', label: 'Tipo de organización' }, { key: 'contrato_titulados_ultimos_5_anios', label: 'Contratación reciente' }]} />
  if (route.path === '/empleadores/valoracion-carrera') return <DatasetAnalyticsPage title="Valoración de la carrera" description="Distribuciones categóricas por afirmación de la encuesta." domain="EMPLEADORES" endpoint="/analytics/employers/valuation" cards={[{ key: 'valoracion_formacion_1', label: 'Valoración de formación' }, { key: 'valoracion_relacion_1', label: 'Relación con la carrera' }]} />
  if (route.path === '/empleadores/brechas-competencias') return <CompetencePage domain="EMPLEADORES" />
  if (route.path === '/empleadores/cruces-exportacion') return <CrossExportPage domain="EMPLEADORES" />

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

