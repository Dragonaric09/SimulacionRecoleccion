import type { NavigationItem } from '@/app/navigation'
import { CompetencePage, CrossExportPage, DatasetAnalyticsPage } from '@/features/analitica/RestAnalyticPages'

const employerSummaryProps = {
  title: 'Resumen de contratación',
  description: 'Indicadores descriptivos de tipo, tamaño y contratación.',
  domain: 'EMPLEADORES' as const,
  endpoint: '/analytics/employers/summary',
  fields: 'tipo_organizacion,tamano_organizacion,contrato_titulados_ultimos_5_anios',
  cards: [
    { key: 'tipo_organizacion', label: 'Tipo de organización' },
    { key: 'contrato_titulados_ultimos_5_anios', label: 'Contratación reciente' },
  ],
}

const employerValuationProps = {
  title: 'Valoración de la carrera',
  description: 'Distribuciones categóricas por afirmación de la encuesta.',
  domain: 'EMPLEADORES' as const,
  endpoint: '/analytics/employers/valuation',
  cards: [
    { key: 'valoracion_formacion_1', label: 'Valoración de formación' },
    { key: 'valoracion_relacion_1', label: 'Relación con la carrera' },
  ],
}

export function EmpleadoresPage({ route }: { route: NavigationItem }) {
  switch (route.path) {
    case '/empleadores/resumen-contratacion':
      return <DatasetAnalyticsPage {...employerSummaryProps} />
    case '/empleadores/valoracion-carrera':
      return <DatasetAnalyticsPage {...employerValuationProps} />
    case '/empleadores/brechas-competencias':
      return <CompetencePage domain="EMPLEADORES" />
    case '/empleadores/cruces-exportacion':
      return <CrossExportPage domain="EMPLEADORES" />
    default:
      return null
  }
}

export function EmpleadoresPrintBundle() {
  return (
    <>
      <section className="print-page"><DatasetAnalyticsPage {...employerSummaryProps} /></section>
      <section className="print-page"><DatasetAnalyticsPage {...employerValuationProps} /></section>
      <section className="print-page"><CompetencePage domain="EMPLEADORES" /></section>
    </>
  )
}
