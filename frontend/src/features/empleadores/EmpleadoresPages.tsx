import type { NavigationItem } from '@/app/navigation'
import { CrossExportPage } from '@/features/analitica/shared'
import { EmpleadoresBrechasPage } from './EmpleadoresBrechasPage'
import { EmpleadoresDashboardPage } from './EmpleadoresDashboardPage'
import { EmpleadoresValoracionPage } from './EmpleadoresValoracionPage'

export function EmpleadoresPage({ route }: { route: NavigationItem }) {
  switch (route.path) {
    case '/empleadores/resumen-contratacion':
      return <EmpleadoresDashboardPage />
    case '/empleadores/valoracion-carrera':
      return <EmpleadoresValoracionPage />
    case '/empleadores/brechas-competencias':
      return <EmpleadoresBrechasPage />
    case '/empleadores/cruces-exportacion':
      return <CrossExportPage domain="EMPLEADORES" />
    default:
      return null
  }
}

export function EmpleadoresPrintBundle() {
  return (
    <>
      <section className="print-page"><EmpleadoresValoracionPage /></section>
      <section className="print-page"><EmpleadoresBrechasPage /></section>
    </>
  )
}
