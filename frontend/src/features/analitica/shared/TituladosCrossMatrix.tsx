import { useEffect, useState } from 'react'
import { apiRequest } from '@/api/client'
import { AssociationMatrix } from '@/components/analytics/charts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AssociationBadge } from '@/features/empleadores/valuation/AssociationTest'
import type {
  AssociationResult,
  EmployerVariable,
} from '@/features/empleadores/valuation/valuationTypes'
import type { Cross } from './analyticsTypes'

type TituladosCross = {
  cross: Cross
  row: EmployerVariable
  column: EmployerVariable
  excluded: number
  chart: string
  test: AssociationResult
}

/** Matriz reutilizable para convertir un cruce de Titulados en una lectura visual + prueba estadística. */
export function TituladosCrossMatrix({
  datasetId,
  filterQuery = '',
  rowField,
  columnField,
  title,
  description,
}: {
  datasetId?: string
  filterQuery?: string
  rowField: string
  columnField: string
  title: string
  description: string
}) {
  const [result, setResult] = useState<TituladosCross | null>(null)

  useEffect(() => {
    if (!datasetId) {
      setResult(null)
      return
    }
    let active = true
    const controller = new AbortController()
    apiRequest<TituladosCross>(
      `/analytics/titulados/cross?datasetId=${encodeURIComponent(datasetId)}&rowField=${encodeURIComponent(rowField)}&columnField=${encodeURIComponent(columnField)}${filterQuery}`,
      { signal: controller.signal },
    )
      .then((next) => active && setResult(next))
      .catch(() => active && setResult(null))
    return () => {
      active = false
      controller.abort()
    }
  }, [datasetId, filterQuery, rowField, columnField])

  return (
    <Card className="rounded-xl border border-border-line shadow-sm">
      <CardHeader>
        <CardTitle className="title-card">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {result ? (
          <AssociationMatrix
            rowHeader={`${result.row.label} ↓ · ${result.column.label} →`}
            columns={result.cross.columnCategories}
            rows={result.cross.rowCategories.map((row) => ({
              label: row,
              total: rowTotal(result.cross, row),
              cells: result.cross.columnCategories.map((column) => ({
                count: result.cross.counts[row]?.[column] ?? 0,
                percent: result.cross.percentages[row]?.[column] ?? 0,
              })),
            }))}
            total={result.cross.validCount}
            excluded={result.excluded}
            unitLabel="titulados"
            test={<AssociationBadge result={result.test} />}
          />
        ) : (
          <p className="text-sm text-ink-600">Calculando matriz analítica…</p>
        )}
      </CardContent>
    </Card>
  )
}

function rowTotal(cross: Cross, row: string) {
  return Object.values(cross.counts[row] ?? {}).reduce((sum, value) => sum + value, 0)
}
