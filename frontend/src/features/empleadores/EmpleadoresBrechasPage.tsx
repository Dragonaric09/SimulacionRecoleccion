import { useState } from 'react'
import { SmallSampleNotice } from '@/components/analytics/ChartCard'
import { KpiCard } from '@/components/analytics/KpiCard'
import { StatusPanel } from '@/components/analytics/StatusPanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CompetenceQuestionChart } from '@/features/analitica/competence/CompetenceQuestionChart'
import type { Competence } from '@/features/analitica/shared/analyticsTypes'
import { useDatasets } from '@/features/analitica/shared/AnalyticsPrimitives'
import { COMPETENCE_ORDER, NOT_OBSERVED_LABEL, SUFFICIENCY_SCALE } from './instrumento'
import { EmployerFilterToolbar } from './EmployerFilterToolbar'
import { EmployerPageHeader, NoEmployerDataPanel } from './EmployerPageHeader'
import { downloadCsv, useEmployerFilters } from './employerData'
import { useEmployerApi } from './useEmployerApi'
import type { DashboardCompetence, EmployerDashboard } from './dashboard/dashboardTypes'
import { BarChart3, ListChecks, TrendingDown, TrendingUp } from 'lucide-react'
import { formatDecimal } from '@/features/analitica/shared/analyticsFormatters'

type GroupKey = 'hard' | 'soft'

const GROUP_TABS: { key: GroupKey; label: string; match: string }[] = [
  { key: 'hard', label: 'Hard skills', match: 'HARD' },
  { key: 'soft', label: 'Soft skills', match: 'SOFT' },
]

function orderedRows(items: DashboardCompetence[], match: string) {
  const position = (name: string) => {
    const index = COMPETENCE_ORDER.indexOf(name as (typeof COMPETENCE_ORDER)[number])
    return index === -1 ? Number.MAX_SAFE_INTEGER : index
  }
  return items
    .filter((item) => item.group.toUpperCase().includes(match))
    .sort((a, b) => position(a.name) - position(b.name))
}

/** Forma que consumen el radar: media, desviación y niveles de la competencia. */
function asCompetence(item: DashboardCompetence): Competence {
  return {
    code: item.code,
    name: item.name,
    group: item.group,
    validCount: item.answered,
    average: item.average ?? 0,
    standardDeviation: item.standardDeviation,
    median: item.median ?? item.average ?? 0,
    modalLevel: 0,
    levelCounts: item.levels,
    notObservedCount: item.notObserved,
  }
}

export function EmpleadoresBrechasPage() {
  const { datasetId } = useDatasets('EMPLEADORES')
  const filters = useEmployerFilters(datasetId)
  const [tab, setTab] = useState<GroupKey>('hard')
  const url = datasetId
    ? `/analytics/employers/dashboard?datasetId=${encodeURIComponent(datasetId)}${filters.query}`
    : null
  const { data, loading, error } = useEmployerApi<EmployerDashboard>(url)

  if (!datasetId) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <EmployerPageHeader
          title="Brechas de competencias"
          description="Suficiencia de las competencias de los titulados según las organizaciones."
        />
        <NoEmployerDataPanel />
      </div>
    )
  }

  const all = data?.competences ?? []
  const respondents = data?.filteredResponses ?? 0

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <EmployerPageHeader
        title="Brechas de competencias"
        description="Nivel de suficiencia que las organizaciones perciben en los titulados. Los «No observado» no entran en la media."
      />
      <EmployerFilterToolbar
        filters={filters.filters}
        onToggle={filters.toggle}
        onClear={filters.clear}
        active={filters.active}
        validCount={data?.filteredResponses}
        totalCount={data?.totalResponses}
      />
      {error && (
        <StatusPanel kind="warning" title="No se pudo cargar la pantalla" description={error} />
      )}
      {loading && !data && (
        <StatusPanel
          kind="loading"
          title="Cargando competencias"
          description="Consultando las valoraciones del dataset."
        />
      )}
      {data && respondents === 0 && (
        <StatusPanel
          kind="info"
          title="Ningún registro coincide"
          description="Cambia o limpia los filtros para ver resultados."
        />
      )}
      {data && respondents > 0 && respondents < 5 && <SmallSampleNotice count={respondents} />}

      {data && respondents > 0 && (
        <Tabs value={tab} onValueChange={(value) => setTab(value as GroupKey)}>
          <TabsList className="w-full justify-start">
            {GROUP_TABS.map((group) => (
              <TabsTrigger key={group.key} value={group.key}>
                {group.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {GROUP_TABS.map((group) => {
            const rows = orderedRows(all, group.match)
            const scoredRows = rows.filter((item) => item.average !== null)
            const average = scoredRows.length
              ? scoredRows.reduce((sum, item) => sum + (item.average ?? 0), 0) / scoredRows.length
              : 0
            const lowest = scoredRows.reduce<DashboardCompetence | undefined>(
              (current, item) =>
                !current || (item.average ?? 0) < (current.average ?? 0) ? item : current,
              undefined,
            )
            const highest = scoredRows.reduce<DashboardCompetence | undefined>(
              (current, item) =>
                !current || (item.average ?? 0) > (current.average ?? 0) ? item : current,
              undefined,
            )
            return (
              <TabsContent key={group.key} value={group.key} className="mt-4 space-y-6">
                <div className="competence-kpi-grid grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="h-full">
                    <KpiCard
                      label="Competencias evaluadas"
                      value={String(scoredRows.length)}
                      detail={`${group.label.toLowerCase()} evaluadas`}
                      icon={ListChecks}
                      tone="empleadores"
                    />
                  </div>
                  <div className="h-full">
                    <KpiCard
                      label={`Promedio de ${group.label.toLowerCase()}`}
                      value={scoredRows.length ? `${formatDecimal(average)} de 5` : '—'}
                      detail={`Promedio de las ${scoredRows.length} competencias`}
                      icon={BarChart3}
                      tone="empleadores"
                    />
                  </div>
                  <div className="h-full">
                    <KpiCard
                      label="Competencia más baja"
                      value={lowest ? formatDecimal(lowest.average ?? 0) : '—'}
                      detail={lowest?.name ?? 'Sin datos'}
                      icon={TrendingDown}
                      tone="empleadores"
                    />
                  </div>
                  <div className="h-full">
                    <KpiCard
                      label="Competencia más alta"
                      value={highest ? formatDecimal(highest.average ?? 0) : '—'}
                      detail={highest?.name ?? 'Sin datos'}
                      icon={TrendingUp}
                      tone="empleadores"
                    />
                  </div>
                </div>
                <CompetenceQuestionChart
                  items={rows.filter((item) => item.average !== null).map(asCompetence)}
                  group={group.label}
                  storageKey={`simulacionem.chartVariant.empleadores.competence.${group.key}`}
                  theme="empleadores"
                  layout="dashboard"
                  variants={['heatmap', 'radar', 'table']}
                  onExportCsv={() => exportHeatmap(group.key, rows)}
                  help="Muestra la distribución de suficiencia, el perfil de medias o los estadísticos por competencia. La opción «No observado» se cuenta aparte y no entra en los cálculos de media."
                />
              </TabsContent>
            )
          })}
        </Tabs>
      )}
    </div>
  )
}

function exportHeatmap(group: GroupKey, rows: DashboardCompetence[]) {
  const levels = SUFFICIENCY_SCALE.map((level) => String(level.level))
  downloadCsv(`empleadores-brechas-${group}-conteos.csv`, [
    ['Competencia', ...levels.map((level) => `Nivel ${level}`), NOT_OBSERVED_LABEL],
    ...rows.map((item) => [
      item.name,
      ...levels.map((level) => item.levels[level] ?? 0),
      item.notObserved,
    ]),
  ])
}
