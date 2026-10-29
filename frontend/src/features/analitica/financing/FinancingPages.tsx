import { useEffect, useState } from 'react'
import { apiRequest } from '@/api/client'
import { FilterToolbar } from '@/components/analytics/FilterToolbar'
import { StatusPanel } from '@/components/analytics/StatusPanel'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AssociationTestCard } from '@/features/empleadores/valuation/AssociationTest'
import type {
  AssociationResult,
  EmployerVariable,
} from '@/features/empleadores/valuation/valuationTypes'
import type { AnalyticsSummary } from '../api'
import { CrossTable } from '../cross/CrossVisualizations'
import type { Cross } from '../shared/analyticsTypes'
import {
  DatasetSelect,
  DistributionCard,
  PageHeading,
  useDatasets,
} from '../shared/AnalyticsPrimitives'
import { useTituladosFilterQuery } from '../shared/tituladosFilterStorage'

type TituladosCross = {
  cross: Cross
  row: EmployerVariable
  column: EmployerVariable
  excluded: number
  chart: string
  test: AssociationResult
}

const FINANCING_COLUMNS = [
  { key: 'nivel_posgrado_interes', label: 'Nivel de posgrado de interés' },
  { key: 'modalidad_posgrado', label: 'Modalidad preferida' },
]

/** La sección conserva la tabla, pero ahora selecciona la prueba por el nivel de medición de cada variable. */
export function FinancingCompletePage({ printAll = false }: { printAll?: boolean } = {}) {
  const { datasets, datasetId, setDatasetId, loading: datasetsLoading } = useDatasets('TITULADOS')
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [filterQuery, setFilterQuery] = useTituladosFilterQuery(datasetId)
  const [analysis, setAnalysis] = useState<TituladosCross | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [includeTotals, setIncludeTotals] = useState(true)
  const [colorHeatmap, setColorHeatmap] = useState(false)
  const [columnField, setColumnField] = useState('nivel_posgrado_interes')

  useEffect(() => {
    if (!datasetId) {
      setSummary(null)
      setAnalysis(null)
      return
    }
    setLoading(true)
    setError(null)
    const controller = new AbortController()
    Promise.all([
      apiRequest<AnalyticsSummary>(
        `/analytics/titulados/financing?datasetId=${encodeURIComponent(datasetId)}${filterQuery}`,
        { signal: controller.signal },
      ),
      apiRequest<TituladosCross>(
        `/analytics/titulados/cross?datasetId=${encodeURIComponent(datasetId)}&rowField=financiamiento_posgrado_estimado&columnField=${encodeURIComponent(columnField)}${filterQuery}`,
        { signal: controller.signal },
      ),
    ])
      .then(([nextSummary, nextAnalysis]) => {
        if (controller.signal.aborted) return
        setSummary(nextSummary)
        setAnalysis(nextAnalysis)
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [datasetId, columnField, filterQuery])

  const columnLabel =
    FINANCING_COLUMNS.find((field) => field.key === columnField)?.label ??
    'Nivel de posgrado de interés'
  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <PageHeading
        title="Financiamiento"
        description="Fuente estimada para financiar estudios de posgrado y análisis de su relación con la preferencia académica."
        tone="titulados"
      />
      <DatasetSelect
        datasets={datasets}
        value={datasetId}
        onChange={setDatasetId}
        loading={datasetsLoading}
      />
      {loading && (
        <StatusPanel
          kind="loading"
          title="Cargando financiamiento"
          description="Consultando las respuestas del dataset."
        />
      )}
      {error && (
        <StatusPanel kind="warning" title="No se pudo cargar financiamiento" description={error} />
      )}
      {!datasetsLoading && !datasetId && !loading && !error && !summary && (
        <StatusPanel
          kind="info"
          title="Sin dataset de titulados"
          description="Importa un CSV de titulados desde Cargar datos para ver esta sección."
        />
      )}
      {summary && !printAll && <FilterToolbar summary={summary} onQueryChange={setFilterQuery} />}
      {summary && (
        <DistributionCard
          title="Fuente de financiamiento estimada para posgrado"
          distribution={
            summary.distributions.financiamiento_posgrado_estimado ?? {
              validCount: 0,
              counts: {},
              percentages: {},
            }
          }
          tone="titulados"
        />
      )}
      <Card className={`${printAll ? 'print-hide ' : ''}rounded-xl border-0 shadow-sm`}>
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <span className="label-default text-ink-600">
            FILAS: <strong className="text-ink-900">Fuente de financiamiento estimada</strong>
          </span>
          <label className="label-default flex items-center gap-2">
            COLUMNAS:
            <Select value={columnField} onValueChange={setColumnField}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FINANCING_COLUMNS.map((field) => (
                  <SelectItem key={field.key} value={field.key}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-600">
            <Checkbox
              checked={includeTotals}
              onCheckedChange={(checked) => setIncludeTotals(checked === true)}
            />{' '}
            Totales
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-600">
            <Checkbox
              checked={colorHeatmap}
              onCheckedChange={(checked) => setColorHeatmap(checked === true)}
            />{' '}
            Aplicar mapa de calor
          </label>
        </CardContent>
      </Card>
      {analysis && (
        <>
          <CrossTable
            cross={analysis.cross}
            includeTotals={includeTotals}
            colorHeatmap={colorHeatmap}
            metric="count"
            rowLabel="Fuente de financiamiento estimada"
            columnLabel={columnLabel}
            swapAxes={false}
          />
          <AssociationTestCard
            result={analysis.test}
            rowLabel={`Filas: ${analysis.row.label}`}
            columnLabel={`Columnas: ${analysis.column.label}`}
          />
        </>
      )}
    </div>
  )
}

export function FinancingPage() {
  return <FinancingCompletePage />
}
