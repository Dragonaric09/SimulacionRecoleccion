import { useEffect, useState } from 'react'
import { apiRequest } from '@/api/client'
import { FilterToolbar } from '@/components/analytics/FilterToolbar'
import { StatusPanel } from '@/components/analytics/StatusPanel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { AnalyticsSummary, CategoryDistribution } from '../api'
import { DatasetSelect, useDatasets } from '../shared/AnalyticsPrimitives'
import { TituladosAssociationCard } from '../shared/TituladosAssociationCard'
import {
  DivergingAgreementCard,
  FormationActiveCard,
  NominalListCard,
  OrdinalColumnsCard,
  StackedFundingCard,
} from './EducationCharts'
import { ChartVariantSelector, useChartVariant } from '@/components/analytics/charts'
import { ChartCardActions } from '@/components/analytics/ChartCard'
import { downloadDistributionCsv } from '../shared/analyticsExport'
import { useTituladosFilterQuery } from '../shared/tituladosFilterStorage'

export function EducationProfilePage({ printAll = false }: { printAll?: boolean } = {}) {
  const { datasets, datasetId, setDatasetId, loading: datasetsLoading } = useDatasets('TITULADOS')
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [filterQuery, setFilterQuery] = useTituladosFilterQuery(datasetId)
  const [activeTab, setActiveTab] = useState('cursado')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!datasetId) {
      setSummary(null)
      return
    }
    setLoading(true)
    setError(null)
    const controller = new AbortController()
    apiRequest<AnalyticsSummary>(
        `/analytics/titulados/education?datasetId=${encodeURIComponent(datasetId)}${filterQuery}`,
        { signal: controller.signal },
      )
        .then((next) => !controller.signal.aborted && setSummary(next))
        .catch((cause) => {
          if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : String(cause))
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    return () => controller.abort()
  }, [datasetId, filterQuery])

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <DatasetSelect
        datasets={datasets}
        value={datasetId}
        onChange={setDatasetId}
        loading={datasetsLoading}
      />
      {summary && !printAll && <FilterToolbar summary={summary} onQueryChange={setFilterQuery} />}
      {loading && (
        <StatusPanel
          kind="loading"
          title="Cargando formación"
          description="Consultando las respuestas académicas del dataset."
        />
      )}
      {error && (
        <StatusPanel kind="warning" title="No se pudo cargar formación" description={error} />
      )}
      {!datasetsLoading && !datasetId && !loading && !error && !summary && (
        <StatusPanel
          kind="info"
          title="Sin dataset de titulados"
          description="Importa un CSV de titulados desde Cargar datos para ver esta sección."
        />
      )}
      {summary && (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList variant="line" className="w-full justify-start">
              <TabsTrigger value="cursado">Posgrado cursado</TabsTrigger>
              <TabsTrigger value="interes">Interés en posgrado</TabsTrigger>
              <TabsTrigger value="opinion">Opinión sobre el posgrado</TabsTrigger>
            </TabsList>
          </Tabs>
          {printAll ? (
            <>
              <section className="print-tab-section">
                <h2 className="title-card mb-3">Posgrado cursado</h2>
                <EducationCompletedPanel summary={summary} />
              </section>
              <section className="print-tab-section">
                <h2 className="title-card mb-3">Interés en posgrado</h2>
                <EducationInterestPanel
                  summary={summary}
                  datasetId={datasetId}
                  filterQuery={filterQuery}
                />
              </section>
              <section className="print-tab-section">
                <h2 className="title-card mb-3">Opinión sobre el posgrado</h2>
                <EducationOpinionPanel summary={summary} />
              </section>
            </>
          ) : (
            <>
              {activeTab === 'cursado' && <EducationCompletedPanel summary={summary} />}
              {activeTab === 'interes' && (
                <EducationInterestPanel
                  summary={summary}
                  datasetId={datasetId}
                  filterQuery={filterQuery}
                />
              )}
              {activeTab === 'opinion' && <EducationOpinionPanel summary={summary} />}
            </>
          )}
        </>
      )}
    </div>
  )
}

function EducationCompletedPanel({ summary }: { summary: AnalyticsSummary }) {
  const active = summary.distributions.tiene_formacion_complementaria
  const level = summary.distributions.formacion_complementaria_nivel
  const yes = active ? booleanCount(active, true) : 0
  return (
    <div className="grid items-stretch gap-4 lg:grid-cols-2">
      <FormationActiveCard yes={yes} total={summary.validResponses} />
      <OrdinalColumnsCard
        title="Nivel más alto cursado"
        description={`Orden natural · n = ${level?.validCount ?? 0}`}
        distribution={level}
        levels={['Diplomado', 'Especialidad', 'Maestría', 'Doctorado', 'Posdoctorado']}
      />
      <NominalListCard
        title="Institución donde lo cursó"
        description="Distribución de instituciones"
        distribution={summary.distributions.institucion_formacion_complementaria}
        forceBars
      />
      <StackedFundingCard
        title="Fuente principal de financiamiento"
        description="Financiamiento del posgrado cursado"
        distribution={summary.distributions.financiamiento_posgrado_cursado}
      />
    </div>
  )
}

function EducationInterestPanel({
  summary,
  datasetId,
  filterQuery,
}: {
  summary: AnalyticsSummary
  datasetId?: string
  filterQuery: string
}) {
  const interest = summary.distributions.interes_posgrado
  const interested = interest ? booleanCount(interest, true) : 0
  const level = summary.distributions.nivel_posgrado_interes
  const area = summary.distributions.area_posgrado_interes
  const modality = summary.distributions.modalidad_posgrado
  const institution = summary.distributions.institucion_posgrado_interes
  return (
    <div className="space-y-6">
      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <FormationActiveCard
          yes={interested}
          total={summary.validResponses}
          title="Interés en posgrado"
        />
        <OrdinalColumnsCard
          title="Nivel de posgrado de interés"
          description={`Orden natural · n = ${level?.validCount ?? 0}`}
          distribution={level}
          levels={['Diplomado', 'Especialidad', 'Maestría', 'Doctorado', 'Posdoctorado']}
        />
        <NominalListCard
          title="Áreas de interés"
          description="Varias respuestas posibles"
          distribution={area}
          forceBars
        />
        <StackedFundingCard
          title="Fuente de financiamiento estimada"
          description="Financiamiento previsto"
          distribution={summary.distributions.financiamiento_posgrado_estimado}
        />
        <NominalListCard
          title="Modalidad preferida"
          description="Preferencias de cursado"
          distribution={modality}
        />
        <NominalListCard
          title="Organización preferida"
          description="Institución donde realizaría el posgrado"
          distribution={institution}
        />
      </div>
      <section className="space-y-3" aria-label="Análisis de formación continua">
        <div>
          <h2 className="title-card">Análisis de demanda de posgrado</h2>
          <p className="text-sm text-ink-600">
            Relaciones inferenciales aplicables a intención y nivel de posgrado; las áreas
            multirrespuesta se mantienen como lectura descriptiva.
          </p>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          <TituladosAssociationCard
            datasetId={datasetId}
            filterQuery={filterQuery}
            rowField="edad_rango"
            columnField="nivel_posgrado_interes"
            title="Edad y nivel de posgrado"
            description="Evalúa si los rangos de edad y el nivel académico deseado tienden a subir o bajar conjuntamente."
          />
          <TituladosAssociationCard
            datasetId={datasetId}
            filterQuery={filterQuery}
            rowField="tiene_formacion_complementaria"
            columnField="interes_posgrado"
            title="Formación complementaria e interés en posgrado"
            description="Evalúa si ambas decisiones están asociadas, sin imponer un orden entre sus categorías."
          />
        </div>
      </section>
    </div>
  )
}

function EducationOpinionPanel({ summary }: { summary: AnalyticsSummary }) {
  const opinion = summary.distributions.valoracion_formacion_1
  const variants = ['diverging', 'table'] as const
  const [variant, setVariant] = useChartVariant(
    'simulacionem.chartVariant.titulados.education.opinion',
    'diverging',
    variants,
  )
  const labels = { diverging: 'Divergente', table: 'Tabla' } as const
  return (
    <Card className="rounded-xl border border-border-line shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="title-card">
              Opinión sobre el posgrado de la FCyT (n = {opinion?.validCount ?? 0})
            </CardTitle>
            <CardDescription>
              “¿Considera que existen programas de formación de posgrado ofertados en la Dirección
              de Posgrado de la FCyT que son afines a las áreas de especialidad de un Ingeniero en
              Sistemas?”
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ChartVariantSelector
              value={variant}
              options={variants}
              labels={labels}
              onChange={setVariant}
            />
            <ChartCardActions
              title="Opinión sobre el posgrado de la FCyT"
              help="La mitad izquierda contiene las respuestas de desacuerdo y la derecha las de acuerdo. Dentro de cada mitad, el ancho de color es proporcional a su subtotal; los conteos y porcentajes se muestran al pasar el cursor."
              onExportCsv={() =>
                downloadDistributionCsv(
                  'opinion-posgrado-fcyt',
                  Object.entries(opinion?.counts ?? {}).map(([label, count]) => ({
                    label,
                    count,
                    percent: opinion?.percentages[label],
                  })),
                  opinion?.validCount ?? 0,
                )
              }
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <DivergingAgreementCard distribution={opinion} variant={variant} />
      </CardContent>
    </Card>
  )
}

function booleanCount(distribution: CategoryDistribution, expected: boolean) {
  const target = expected ? ['true', 'sí', 'si'] : ['false', 'no']
  const key = Object.keys(distribution.counts).find((label) =>
    target.includes(label.toLocaleLowerCase('es-BO')),
  )
  return key ? distribution.counts[key] : 0
}
