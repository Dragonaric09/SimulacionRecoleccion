import type { AnalyticsSummary } from '../api'
import type { Competence, Tone } from '../shared/analyticsTypes'
import { formatDecimal } from '../shared/analyticsFormatters'
import { KpiCard } from '@/components/analytics/KpiCard'
import { StatusPanel } from '@/components/analytics/StatusPanel'
import { ChartCardActions } from '@/components/analytics/ChartCard'
import { AssociationMatrix } from '@/components/analytics/charts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, ListChecks, TrendingDown, TrendingUp } from 'lucide-react'
import { CompetenceMatrix as CompetenceHeatmap } from './CompetenceMatrix'
import { CompetenceStatsTable as CompetenceStatsTableView } from './CompetenceStatsTable'
import { CurriculumCard as CurriculumCardView } from './CurriculumCard'
import { CompetenceRadar as CompetenceRadarView } from './CompetenceRadar'
import { groupDisplayName } from './competenceHelpers'

export function CurriculumPanel({ summary }: { summary: AnalyticsSummary | null }) {
  if (!summary) {
    return (
      <StatusPanel
        kind="loading"
        title="Cargando malla y asignaturas"
        description="Consultando las respuestas de selección múltiple."
      />
    )
  }
  return <CurriculumAnalysis summary={summary} />
}

/**
 * En estas cuatro preguntas una persona puede seleccionar varias opciones. Por eso la vista principal compara
 * incidencias en matriz y no inventa una prueba χ² ni cuatro gráficos de barras independientes.
 */
function CurriculumAnalysis({ summary }: { summary: AnalyticsSummary }) {
  const useful = summary.distributions.aspectos_utiles
  const improve = summary.distributions.aspectos_mejorables
  const advantage = summary.distributions.asignaturas_ventaja
  const outdated = summary.distributions.asignaturas_poco_utiles
  const subjects = [
    ...new Set([...Object.keys(advantage?.counts ?? {}), ...Object.keys(outdated?.counts ?? {})]),
  ].sort(
    (left, right) =>
      Math.max(outdated?.percentages[right] ?? 0, advantage?.percentages[right] ?? 0) -
      Math.max(outdated?.percentages[left] ?? 0, advantage?.percentages[left] ?? 0),
  )
  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-2">
        <CurriculumSignal
          title="Señales de utilidad de la Carrera"
          distribution={useful}
          tone="positive"
        />
        <CurriculumSignal
          title="Prioridades de mejora de la Carrera"
          distribution={improve}
          tone="attention"
        />
      </div>
      <Card className="rounded-xl border border-border-line shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <CardTitle className="title-card">
                Asignaturas: ventaja competitiva y actualización
              </CardTitle>
              <CardDescription>
                La matriz reemplaza dos listados de barras: permite contrastar cada asignatura en ambas
                preguntas sin interpretar las selecciones como categorías excluyentes.
              </CardDescription>
            </div>
            <ChartCardActions
              title="Asignaturas: ventaja competitiva y actualización"
              help="Cada fila es una asignatura. Las dos columnas muestran el porcentaje de titulados que la marcó como ventaja competitiva o como poco útil/desactualizada; como son preguntas multirrespuesta, los porcentajes se calculan por separado y no suman 100 %."
            />
          </div>
        </CardHeader>
        <CardContent>
          <AssociationMatrix
            rowHeader="Asignatura ↓ · señal reportada →"
            columns={['Ventaja competitiva', 'Poco útil o desactualizada']}
            rows={subjects.map((subject) => ({
              label: subject,
              total: Math.max(advantage?.counts[subject] ?? 0, outdated?.counts[subject] ?? 0),
              cells: [
                {
                  count: advantage?.counts[subject] ?? 0,
                  percent: advantage?.percentages[subject] ?? 0,
                },
                {
                  count: outdated?.counts[subject] ?? 0,
                  percent: outdated?.percentages[subject] ?? 0,
                },
              ],
            }))}
            total={Math.max(advantage?.validCount ?? 0, outdated?.validCount ?? 0)}
            cellColor={(percent, columnIndex) =>
              `rgba(${columnIndex === 0 ? '20,163,154' : '237,85,47'}, ${0.08 + (percent / 100) * 0.8})`
            }
            footer={
              <p className="caption-meta text-ink-500">
                Porcentaje sobre el n válido de cada pregunta (ventaja: {advantage?.validCount ?? 0}
                ; actualización: {outdated?.validCount ?? 0}). Son preguntas multirrespuesta: no se
                aplica una prueba de asociación.
              </p>
            }
          />
        </CardContent>
      </Card>
      <details className="rounded-xl border border-border-line bg-white">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-ink-900">
          Ver el detalle por pregunta
        </summary>
        <div className="grid gap-5 border-t border-border-line p-4 lg:grid-cols-2">
          <CurriculumCardView
            title="Aspectos de la Carrera que resultaron útiles"
            field="aspectos_utiles"
            summary={summary}
            tone="blue"
          />
          <CurriculumCardView
            title="Aspectos de la Carrera que pueden mejorarse"
            field="aspectos_mejorables"
            summary={summary}
            tone="orange"
          />
          <CurriculumCardView
            title="Asignaturas que dieron ventaja competitiva"
            field="asignaturas_ventaja"
            summary={summary}
            tone="teal"
          />
          <CurriculumCardView
            title="Asignaturas percibidas poco útiles o desactualizadas"
            field="asignaturas_poco_utiles"
            summary={summary}
            tone="orange"
          />
        </div>
      </details>
    </div>
  )
}

function CurriculumSignal({
  title,
  distribution,
  tone,
}: {
  title: string
  distribution?: AnalyticsSummary['distributions'][string]
  tone: 'positive' | 'attention'
}) {
  const entries = Object.entries(distribution?.counts ?? {})
    .sort(([, left], [, right]) => right - left)
    .slice(0, 3)
  return (
    <Card className="rounded-xl border border-border-line shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="title-card">{title}</CardTitle>
            <CardDescription>
              Top 3 menciones · opción múltiple · n = {distribution?.validCount ?? 0}
            </CardDescription>
          </div>
          <ChartCardActions
            title={title}
            help="Tres opciones más mencionadas. Es una pregunta multirrespuesta: cada porcentaje se calcula sobre las respuestas válidas y las opciones no son excluyentes."
          />
        </div>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {entries.map(([label, count], index) => (
            <li
              key={label}
              className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-2 text-sm"
            >
              <span
                className={
                  tone === 'attention'
                    ? 'font-semibold text-[#c44b2d]'
                    : 'font-semibold text-titulados'
                }
              >
                {index + 1}
              </span>
              <span className="font-medium text-ink-900">{label}</span>
              <span className="tabular-nums text-ink-600">
                {count} ({(distribution?.percentages[label] ?? 0).toFixed(1).replace('.', ',')} %)
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

export function CompetencePrintGroup({
  items,
  group,
  tone,
}: {
  items: Competence[]
  group: string
  tone: Tone
}) {
  const average = items.length
    ? items.reduce((sum, item) => sum + item.average, 0) / items.length
    : 0
  const lowest = items.length
    ? items.reduce((current, item) => (item.average < current.average ? item : current))
    : undefined
  const highest = items.length
    ? items.reduce((current, item) => (item.average > current.average ? item : current))
    : undefined
  return (
    <>
      <div className="competence-kpi-grid grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="h-full">
          <KpiCard
            label="Competencias evaluadas"
            value={String(items.length)}
            detail={`${groupDisplayName(group)} evaluadas`}
            icon={ListChecks}
            tone={tone}
          />
        </div>
        <div className="h-full">
          <KpiCard
            label={`Promedio de ${groupDisplayName(group)}`}
            value={average ? `${formatDecimal(average)} de 5` : '—'}
            detail={`Promedio de las ${items.length} competencias`}
            icon={BarChart3}
            tone={tone}
          />
        </div>
        <div className="h-full">
          <KpiCard
            label="Competencia más baja"
            value={lowest ? formatDecimal(lowest.average) : '—'}
            detail={lowest?.name ?? 'Sin datos'}
            icon={TrendingDown}
            tone={tone}
          />
        </div>
        <div className="h-full">
          <KpiCard
            label="Competencia más alta"
            value={highest ? formatDecimal(highest.average) : '—'}
            detail={highest?.name ?? 'Sin datos'}
            icon={TrendingUp}
            tone={tone}
          />
        </div>
      </div>
      <div className="print-competence-matrix">
        <CompetenceHeatmap items={items} />
      </div>
      <div className="print-competence-radar">
        <CompetenceRadarView items={items} />
      </div>
      <CompetenceStatsTableView items={items} group={group} />
    </>
  )
}
