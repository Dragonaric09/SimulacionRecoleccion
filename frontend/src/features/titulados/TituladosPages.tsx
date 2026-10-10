import type { NavigationItem } from '@/app/navigation'
import { CompetencePage, CrossExportPage, FinancingCompletePage, SimulationPage } from '@/features/analitica/RestAnalyticPages'
import { EmploymentProfilePage } from '@/features/analitica/employment/EmploymentProfilePage'
import { EducationProfilePage } from '@/features/analitica/education/EducationProfilePage'
import { TituladosSummaryPage } from '@/features/analitica/TituladosSummaryPage'

export function TituladosPage({ route }: { route: NavigationItem }) {
  switch (route.path) {
    case '/titulados/resumen':
      return <TituladosSummaryPage />
    case '/titulados/perfil-empleabilidad':
      return <EmploymentProfilePage />
    case '/titulados/formacion-continua':
      return <EducationProfilePage />
    case '/titulados/financiamiento':
      return <FinancingCompletePage />
    case '/titulados/brechas-competencias':
      return <CompetencePage domain="TITULADOS" />
    case '/titulados/cruces-exportacion':
      return <CrossExportPage domain="TITULADOS" />
    case '/titulados/simulacion-escenarios':
      return <SimulationPage />
    default:
      return null
  }
}

export function TituladosPrintBundle() {
  return (
    <>
      <section className="print-page"><TituladosSummaryPage printAll /></section>
      <section className="print-page"><EmploymentProfilePage printAll /></section>
      <section className="print-page"><EducationProfilePage printAll /></section>
      <section className="print-page"><FinancingCompletePage printAll /></section>
      <section className="print-page"><CompetencePage domain="TITULADOS" printAll /></section>
    </>
  )
}
