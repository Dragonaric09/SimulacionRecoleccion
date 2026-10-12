import { useState } from 'react'
import { ChartCard, SmallSampleNotice } from '@/components/analytics/ChartCard'
import { AgreementBars, type AgreementRowData } from '@/components/analytics/AgreementBars'
import { StatusPanel } from '@/components/analytics/StatusPanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDatasets } from '@/features/analitica/shared/AnalyticsPrimitives'
import { AGREEMENT_SCALE, NO_KNOW_LABEL, VALUATION_GROUP_LABELS, VALUATION_ITEMS, type ValuationGroup } from './instrumento'
import { EmployerFilterToolbar } from './EmployerFilterToolbar'
import { EmployerPageHeader, NoEmployerDataPanel } from './EmployerPageHeader'
import { downloadCsv, useEmployerFilters } from './employerData'
import { useEmployerApi } from './useEmployerApi'
import type { EmployerDashboard } from './dashboard/dashboardTypes'

/**
 * Valoración por afirmación. Usa los conteos del dashboard (una sola agregación en la base de datos),
 * así que funciona igual con 20 respuestas que con 50 000.
 */
export function EmpleadoresValoracionPage() {
  const { datasetId } = useDatasets('EMPLEADORES')
  const filters = useEmployerFilters(datasetId)
  const [group, setGroup] = useState<ValuationGroup>('formacion')
  const url = datasetId
    ? `/analytics/employers/dashboard?datasetId=${encodeURIComponent(datasetId)}${filters.query}`
    : null
  const { data, loading, error } = useEmployerApi<EmployerDashboard>(url)

  if (!datasetId) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <EmployerPageHeader title="Valoración de la Carrera" description="Distribución de las respuestas de empleadores por afirmación." />
        <NoEmployerDataPanel />
      </div>
    )
  }

  const respondents = data?.filteredResponses ?? 0
  const rowsFor = (valuationGroup: ValuationGroup): AgreementRowData[] =>
    VALUATION_ITEMS.filter((item) => item.group === valuationGroup).map((item) => {
      const stat = data?.valuations.find((valuation) => valuation.key === item.key)
      return {
        key: item.key,
        label: item.statement,
        counts: {
          [AGREEMENT_SCALE[0].value]: stat?.disagree ?? 0,
          [AGREEMENT_SCALE[1].value]: stat?.partly ?? 0,
          [AGREEMENT_SCALE[2].value]: stat?.agree ?? 0,
          [NO_KNOW_LABEL]: stat?.noKnow ?? 0,
        },
        validCount: stat?.answered ?? 0,
      }
    })

  const exportGroup = (valuationGroup: ValuationGroup) => {
    const rows = rowsFor(valuationGroup)
    const categories = [...AGREEMENT_SCALE.map((level) => level.value), NO_KNOW_LABEL]
    downloadCsv(`empleadores-valoracion-${valuationGroup}.csv`, [
      ['Afirmación', 'n', ...categories],
      ...rows.map((row) => [row.label, row.validCount, ...categories.map((category) => row.counts[category] ?? 0)]),
    ])
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <EmployerPageHeader title="Valoración de la Carrera" description="Distribución de las respuestas de empleadores por afirmación, en escala de acuerdo." />
      <EmployerFilterToolbar
        filters={filters.filters}
        onToggle={filters.toggle}
        onClear={filters.clear}
        active={filters.active}
        validCount={data?.filteredResponses}
        totalCount={data?.totalResponses}
      />
      {error && <StatusPanel kind="warning" title="No se pudo cargar la pantalla" description={error} />}
      {loading && !data && <StatusPanel kind="loading" title="Cargando datos" description="Consultando el dataset seleccionado." />}
      {data && respondents > 0 && respondents < 5 && <SmallSampleNotice count={respondents} />}
      {data && respondents === 0 && <StatusPanel kind="info" title="Ningún registro coincide" description="Cambia o limpia los filtros para ver resultados." />}

      {data && respondents > 0 && (
        <Tabs value={group} onValueChange={(value) => setGroup(value as ValuationGroup)}>
          <TabsList className="w-full justify-start">
            {(Object.keys(VALUATION_GROUP_LABELS) as ValuationGroup[]).map((key) => (
              <TabsTrigger key={key} value={key}>{VALUATION_GROUP_LABELS[key]}</TabsTrigger>
            ))}
          </TabsList>
          {(Object.keys(VALUATION_GROUP_LABELS) as ValuationGroup[]).map((key) => (
            <TabsContent key={key} value={key} className="mt-4">
              <ChartCard
                title={`Afirmaciones: ${VALUATION_GROUP_LABELS[key].toLowerCase()}`}
                n={respondents}
                help="Por afirmación, la distribución de la escala de acuerdo. «No sabe» se muestra aparte y no forma parte de la escala."
                onExportCsv={() => exportGroup(key)}
              >
                <AgreementBars rows={rowsFor(key)} />
              </ChartCard>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}
