import { useEffect, useState } from 'react'
import { apiRequest } from '@/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AssociationTestCard } from '@/features/empleadores/valuation/AssociationTest'
import type {
  AssociationResult,
  EmployerVariable,
} from '@/features/empleadores/valuation/valuationTypes'
import type { Cross } from './analyticsTypes'

type TituladosAssociation = {
  cross: Cross
  row: EmployerVariable
  column: EmployerVariable
  excluded: number
  chart: string
  test: AssociationResult
}

/** Resultado inferencial contextualizado: cada sección propone solo relaciones que su instrumento puede sostener. */
export function TituladosAssociationCard({
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
  const [result, setResult] = useState<TituladosAssociation | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!datasetId) {
      setResult(null)
      return
    }
    let active = true
    const controller = new AbortController()
    setError(null)
    setResult(null)
    apiRequest<TituladosAssociation>(
      `/analytics/titulados/cross?datasetId=${encodeURIComponent(datasetId)}&rowField=${encodeURIComponent(rowField)}&columnField=${encodeURIComponent(columnField)}${filterQuery}`,
      { signal: controller.signal },
    )
      .then((next) => active && setResult(next))
      .catch((cause) => active && setError(cause instanceof Error ? cause.message : String(cause)))
    return () => {
      active = false
      controller.abort()
    }
  }, [datasetId, filterQuery, rowField, columnField])

  if (!datasetId) return null
  return (
    <Card className="h-full rounded-xl border border-border-line shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="title-card">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-ink-600">
            No se pudo calcular este análisis para el filtro actual.
          </p>
        ) : result ? (
          <AssociationTestCard
            result={result.test}
            rowLabel={`Grupos: ${result.row.label}`}
            columnLabel={`Resultado: ${result.column.label}`}
          />
        ) : (
          <p className="text-sm text-ink-600">Calculando prueba estadística…</p>
        )}
      </CardContent>
    </Card>
  )
}
