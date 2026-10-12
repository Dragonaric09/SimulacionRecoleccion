import { useState } from 'react'
import { ChartCard, SmallSampleNotice } from '@/components/analytics/ChartCard'
import { StatusPanel } from '@/components/analytics/StatusPanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { CompetenceRadar } from '@/features/analitica/competence/CompetenceRadar'
import type { Competence } from '@/features/analitica/shared/analyticsTypes'
import { useDatasets } from '@/features/analitica/shared/AnalyticsPrimitives'
import { formatDecimal } from '@/features/analitica/shared/analyticsFormatters'
import { contrastTextColor } from '@/lib/utils'
import { COMPETENCE_ORDER, NOT_OBSERVED_LABEL, SUFFICIENCY_SCALE } from './instrumento'
import { EmployerFilterToolbar } from './EmployerFilterToolbar'
import { EmployerPageHeader, NoEmployerDataPanel } from './EmployerPageHeader'
import { downloadCsv, useEmployerFilters } from './employerData'
import { useEmployerApi } from './useEmployerApi'
import type { DashboardCompetence, EmployerDashboard } from './dashboard/dashboardTypes'
import { likertColor } from './dashboard/chartTheme'

const EMPLOYER_GREEN = '#14A39A'

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
        <EmployerPageHeader title="Brechas de competencias" description="Suficiencia de las competencias de los titulados según las organizaciones." />
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
      {error && <StatusPanel kind="warning" title="No se pudo cargar la pantalla" description={error} />}
      {loading && !data && <StatusPanel kind="loading" title="Cargando competencias" description="Consultando las valoraciones del dataset." />}
      {data && respondents === 0 && <StatusPanel kind="info" title="Ningún registro coincide" description="Cambia o limpia los filtros para ver resultados." />}
      {data && respondents > 0 && respondents < 5 && <SmallSampleNotice count={respondents} />}

      {data && respondents > 0 && (
        <Tabs value={tab} onValueChange={(value) => setTab(value as GroupKey)}>
          <TabsList className="w-full justify-start">
            {GROUP_TABS.map((group) => <TabsTrigger key={group.key} value={group.key}>{group.label}</TabsTrigger>)}
          </TabsList>
          {GROUP_TABS.map((group) => {
            const rows = orderedRows(all, group.match)
            const groupN = Math.max(0, ...rows.map((item) => item.answered))
            return (
              <TabsContent key={group.key} value={group.key} className="mt-4 space-y-6">
                <ChartCard
                  title={`Suficiencia percibida: ${group.label.toLowerCase()}`}
                  n={groupN}
                  help="Número de respuestas por nivel de la escala (1 Muy insuficiente a 5 Muy suficiente). La última columna cuenta los «No observado», que se excluyen de la media."
                  onExportCsv={() => exportHeatmap(group.key, rows)}
                >
                  <SufficiencyHeatmap rows={rows} />
                </ChartCard>
                <div className="grid gap-6 lg:grid-cols-2">
                  <ChartCard
                    title={`Estadísticos por competencia: ${group.label.toLowerCase()}`}
                    help="Media, desviación estándar (muestral) y mediana de la escala 1 a 5. No incluye los «No observado»."
                    onExportCsv={() => exportStats(group.key, rows)}
                  >
                    <StatsTable rows={rows} />
                  </ChartCard>
                  <ChartCard title={`Perfil de medias: ${group.label.toLowerCase()}`} n={groupN} help="Media de cada competencia en la escala 1 a 5.">
                    <CompetenceRadar items={rows.filter((item) => item.average !== null).map(asCompetence)} color={EMPLOYER_GREEN} />
                  </ChartCard>
                </div>
              </TabsContent>
            )
          })}
        </Tabs>
      )}
    </div>
  )
}

function SufficiencyHeatmap({ rows }: { rows: DashboardCompetence[] }) {
  if (rows.length === 0) return <p className="text-sm text-ink-600">Sin valoraciones en este grupo.</p>
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[720px] text-sm">
        <TableHeader>
          <TableRow className="text-xs text-ink-600">
            <TableHead className="w-64 p-2 text-left">Competencia</TableHead>
            {SUFFICIENCY_SCALE.map((level) => (
              <TableHead key={level.level} className="p-2 text-center">
                <span className="block font-semibold text-ink-900">{level.level}</span>
                <span className="font-normal">{level.label}</span>
              </TableHead>
            ))}
            <TableHead className="p-2 text-center">
              <span className="block font-semibold text-ink-900">—</span>
              <span className="font-normal">{NOT_OBSERVED_LABEL}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((item) => (
            <TableRow key={item.code} className="border-t border-slate-100">
              <TableCell className="whitespace-normal break-words p-2 font-medium text-ink-900">{item.name}</TableCell>
              {SUFFICIENCY_SCALE.map((level) => {
                const count = item.levels[String(level.level)] ?? 0
                return (
                  <TableCell key={level.level} className="p-0.5 text-center">
                    <span
                      className="flex h-10 items-center justify-center rounded text-sm font-semibold tabular-nums"
                      style={{ backgroundColor: level.color, color: contrastTextColor(level.color) }}
                    >
                      {count}
                    </span>
                  </TableCell>
                )
              })}
              <TableCell className="p-0.5 text-center">
                <span className="flex h-10 items-center justify-center rounded bg-slate-200 text-sm font-semibold tabular-nums text-ink-900">
                  {item.notObserved}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function StatsTable({ rows }: { rows: DashboardCompetence[] }) {
  if (rows.length === 0) return <p className="text-sm text-ink-600">Sin valoraciones en este grupo.</p>
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[520px] text-sm">
        <TableHeader>
          <TableRow className="text-xs text-ink-600">
            <TableHead className="p-2 text-left">Competencia</TableHead>
            <TableHead className="p-2 text-right">n válido</TableHead>
            <TableHead className="p-2 text-right">Media</TableHead>
            <TableHead className="p-2 text-right">Desv. estándar</TableHead>
            <TableHead className="p-2 text-right">Mediana</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[...rows].sort((a, b) => (b.average ?? 0) - (a.average ?? 0)).map((item) => (
            <TableRow key={item.code} className="border-t border-slate-100">
              <TableCell className="p-2 font-medium text-ink-900">{item.name}</TableCell>
              <TableCell className="p-2 text-right tabular-nums">{item.answered}</TableCell>
              <TableCell className="p-2 text-right font-semibold tabular-nums" style={{ color: item.average === null ? undefined : likertColor(item.average) }}>
                {item.average === null ? 'n/d' : formatDecimal(item.average, 2)}
              </TableCell>
              <TableCell className="p-2 text-right tabular-nums">{item.standardDeviation === null || item.answered < 2 ? 'n/d' : formatDecimal(item.standardDeviation, 2)}</TableCell>
              <TableCell className="p-2 text-right tabular-nums">{item.median === null ? 'n/d' : formatDecimal(item.median, 1)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function exportHeatmap(group: GroupKey, rows: DashboardCompetence[]) {
  const levels = SUFFICIENCY_SCALE.map((level) => String(level.level))
  downloadCsv(`empleadores-brechas-${group}-conteos.csv`, [
    ['Competencia', ...levels.map((level) => `Nivel ${level}`), NOT_OBSERVED_LABEL],
    ...rows.map((item) => [item.name, ...levels.map((level) => item.levels[level] ?? 0), item.notObserved]),
  ])
}

function exportStats(group: GroupKey, rows: DashboardCompetence[]) {
  downloadCsv(`empleadores-brechas-${group}-estadisticos.csv`, [
    ['Competencia', 'n válido', 'Media', 'Desviación estándar', 'Mediana', NOT_OBSERVED_LABEL],
    ...rows.map((item) => [
      item.name,
      item.answered,
      item.average === null ? 'n/d' : formatDecimal(item.average, 2),
      item.standardDeviation === null ? 'n/d' : formatDecimal(item.standardDeviation, 2),
      item.median === null ? 'n/d' : formatDecimal(item.median, 1),
      item.notObserved,
    ]),
  ])
}
