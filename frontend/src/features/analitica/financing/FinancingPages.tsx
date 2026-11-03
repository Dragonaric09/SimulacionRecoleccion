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

/**
 * Qué se analiza. Lo habitual es el financiamiento previsto para un posgrado; si el archivo no trae esa pregunta
 * (formulario de MS Forms del docente) pero sí la fuente con que financiaron la formación ya cursada, la sección
 * muestra esa otra, rotulada como tal, en lugar de quedar vacía.
 */
const FINANCING_MODES = {
  estimated: {
    row: 'financiamiento_posgrado_estimado',
    rowLabel: 'Fuente de financiamiento estimada',
    title: 'Fuente de financiamiento estimada para posgrado',
    columns: FINANCING_COLUMNS,
  },
  completed: {
    row: 'financiamiento_posgrado_cursado',
    rowLabel: 'Financiamiento de la formación cursada',
    title: 'Fuente de financiamiento de la formación complementaria cursada',
    columns: [{ key: 'formacion_complementaria_nivel', label: 'Nivel de formación cursada' }],
  },
} as const

type FinancingMode = keyof typeof FINANCING_MODES

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
  const [mode, setMode] = useState<FinancingMode>('estimated')

  useEffect(() => {
    if (!datasetId) {
      setSummary(null)
      setAnalysis(null)
      return
    }
    setLoading(true)
    setError(null)
    const controller = new AbortController()
    apiRequest<AnalyticsSummary>(
      `/analytics/titulados/financing?datasetId=${encodeURIComponent(datasetId)}${filterQuery}`,
      { signal: controller.signal },
    )
      .then((nextSummary) => {
        const count = (key: string) => nextSummary.distributions[key]?.validCount ?? 0
        // Sin filtros que reduzcan la muestra, la ausencia del estimado es del archivo, no del filtro.
        const nextMode: FinancingMode =
          count('financiamiento_posgrado_estimado') === 0 && count('financiamiento_posgrado_cursado') > 0
            ? 'completed'
            : 'estimated'
        const config = FINANCING_MODES[nextMode]
        const column = config.columns.some((item) => item.key === columnField) ? columnField : config.columns[0].key
        return apiRequest<TituladosCross>(
          `/analytics/titulados/cross?datasetId=${encodeURIComponent(datasetId)}&rowField=${config.row}&columnField=${encodeURIComponent(column)}${filterQuery}`,
          { signal: controller.signal },
        ).then((nextAnalysis) => ({ nextSummary, nextAnalysis, nextMode, column }))
      })
      .then(({ nextSummary, nextAnalysis, nextMode, column }) => {
        if (controller.signal.aborted) return
        setSummary(nextSummary)
        setAnalysis(nextAnalysis)
        setMode(nextMode)
        if (column !== columnField) setColumnField(column)
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : String(cause))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [datasetId, columnField, filterQuery])

  const config = FINANCING_MODES[mode]
  const columns: readonly { key: string; label: string }[] = config.columns
  const columnLabel = columns.find((field) => field.key === columnField)?.label ?? columns[0].label
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
      {summary && mode === 'completed' && (
        <StatusPanel
          kind="info"
          title="Se muestra el financiamiento de la formación ya cursada"
          description="El archivo no trae la pregunta sobre cómo financiaría un posgrado. En su lugar, la sección analiza con qué recursos financiaron las personas tituladas la formación complementaria que ya realizaron."
        />
      )}
      {summary && (
        <DistributionCard
          title={config.title}
          distribution={
            summary.distributions[config.row] ?? {
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
            FILAS: <strong className="text-ink-900">{config.rowLabel}</strong>
          </span>
          <label className="label-default flex items-center gap-2">
            COLUMNAS:
            <Select value={columnField} onValueChange={setColumnField}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {columns.map((field) => (
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
            rowLabel={config.rowLabel}
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
