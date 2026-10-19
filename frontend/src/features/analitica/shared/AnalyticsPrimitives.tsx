import { useDatasetContext } from '@/app/DatasetContext'
import type { DatasetSummary } from '@/features/encuesta/api'
import { FilterToolbar } from '@/components/analytics/FilterToolbar'
import { KpiCard } from '@/components/analytics/KpiCard'
import { ChartCardActions } from '@/components/analytics/ChartCard'
import { StatusPanel } from '@/components/analytics/StatusPanel'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AnalyticsSummary, CategoryDistribution } from '../api'
import { apiRequest } from '@/api/client'
import type { Domain, Tone } from './analyticsTypes'
import { useEffect, useState } from 'react'
import { sentenceCaseLabel } from './analyticsFormatters'
import { downloadDistributionCsv } from './analyticsExport'
import {
  CategoricalQuestionChart,
  ChartVariantSelector,
  useChartVariant,
  type CategoricalChartVariant,
} from '@/components/analytics/charts'

/* Este módulo agrupa primitives y su hook para mantener una única implementación compartida. */
/* eslint-disable react-refresh/only-export-components */

export function useDatasets(domain: Domain) {
  const { datasets: datasetGroups, activeIds, setActiveDataset } = useDatasetContext()
  return {
    datasets: datasetGroups[domain],
    datasetId: activeIds[domain],
    setDatasetId: (id?: string) => setActiveDataset(domain, id),
    loading: false,
  }
}

export function PageHeading({
  title,
  description,
  tone: _tone,
}: {
  title: string
  description: string
  tone: Tone
}) {
  void _tone
  return (
    <div className="space-y-2">
      <h1 className="headline-page">{title}</h1>
      <p className="max-w-2xl text-sm text-ink-600">{description}</p>
    </div>
  )
}

export function DatasetSelect({
  datasets: _datasets,
  value: _value,
  onChange: _onChange,
  loading: _loading,
}: {
  datasets: DatasetSummary[]
  value?: string
  onChange: (id?: string) => void
  loading: boolean
}) {
  void _datasets
  void _value
  void _onChange
  void _loading
  return null
}

export function DistributionCard({
  title,
  distribution,
  tone,
  showVariantSelector = true,
}: {
  title: string
  distribution: CategoryDistribution
  tone: Tone
  showVariantSelector?: boolean
}) {
  const variants: readonly CategoricalChartVariant[] = ['ranked', 'table']
  const [variant, setVariant] = useChartVariant(
    `simulacionem.chartVariant.${tone}.distribution.${title}`,
    'ranked',
    variants,
  )
  const labels: Record<CategoricalChartVariant, string> = {
    ranked: 'Barras',
    columns: 'Columnas',
    donut: 'Donut',
    table: 'Tabla',
  }
  const items = Object.entries(distribution.counts).map(([label, count]) => ({
    label: sentenceCaseLabel(label),
    count,
    total: distribution.validCount,
    percent: distribution.percentages[label] ?? 0,
  }))
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="title-card">{title}</CardTitle>
            <CardDescription>Conteo y porcentaje · n = {distribution.validCount}</CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {showVariantSelector && (
              <ChartVariantSelector
                value={variant}
                options={variants}
                labels={labels}
                onChange={setVariant}
              />
            )}
            <ChartCardActions
              title={title}
              help="Cada barra horizontal representa una categoría. Su longitud corresponde al porcentaje sobre las respuestas válidas (n) y el extremo muestra el conteo exacto."
              onExportCsv={() => downloadDistributionCsv(title, items, distribution.validCount)}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <CategoricalQuestionChart
          items={items}
          total={distribution.validCount}
          color={tone === 'titulados' ? '#1F6FB5' : '#14A39A'}
          defaultVariant="ranked"
          storageKey={`simulacionem.chartVariant.${tone}.distribution.${title}`}
          variant={variant}
          onVariantChange={setVariant}
          showSelector={false}
        />
      </CardContent>
    </Card>
  )
}

export function DatasetAnalyticsPage({
  title,
  description,
  domain,
  endpoint,
  fields,
  cards,
}: {
  title: string
  description: string
  domain: Domain
  endpoint: string
  fields?: string
  cards: { key: string; label: string }[]
}) {
  const tone: Tone = domain === 'TITULADOS' ? 'titulados' : 'empleadores'
  const { datasets, datasetId, setDatasetId, loading: datasetsLoading } = useDatasets(domain)
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [filterQuery, setFilterQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!datasetId) {
      setSummary(null)
      setLoading(false)
      return
    }
      setLoading(true)
      setError(null)
      const controller = new AbortController()
      const suffix = fields ? `&fields=${encodeURIComponent(fields)}` : ''
      apiRequest<AnalyticsSummary>(
        `${endpoint}?datasetId=${encodeURIComponent(datasetId)}${suffix}${domain === 'TITULADOS' ? filterQuery : ''}`,
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
    }, [datasetId, endpoint, fields, domain, filterQuery])

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeading title={title} description={description} tone={tone} />
      <DatasetSelect
        datasets={datasets}
        value={datasetId}
        onChange={setDatasetId}
        loading={datasetsLoading}
      />
      {loading && (
        <StatusPanel
          kind="loading"
          title="Cargando datos"
          description="Consultando el dataset seleccionado."
        />
      )}
      {error && (
        <StatusPanel kind="warning" title="No se pudo cargar la pantalla" description={error} />
      )}
      {!loading && !error && !summary && (
        <StatusPanel
          kind="info"
          title={`Sin dataset de ${domain.toLowerCase()}`}
          description="Importa un dataset compatible para habilitar esta vista."
        />
      )}
      {summary && (
        <>
          {domain === 'TITULADOS' && (
            <FilterToolbar summary={summary} onQueryChange={setFilterQuery} />
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <KpiCard
                key={card.key}
                label={card.label}
                value={formatMetric(summary, card.key)}
                detail={
                  summary.distributions[card.key]
                    ? `${summary.distributions[card.key].validCount} respuestas`
                    : 'Dato numérico'
                }
                note={`n = ${summary.distributions[card.key]?.validCount ?? summary.validResponses}`}
                tone={tone}
              />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {Object.entries(summary.distributions).map(([key, distribution]) => (
              <DistributionCard key={key} title={key} distribution={distribution} tone={tone} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function formatMetric(summary: AnalyticsSummary, key: string) {
  const distribution = summary.distributions[key]
  if (distribution) return `${distribution.validCount}`
  return summary.numericAverages[key] === undefined ? '—' : String(summary.numericAverages[key])
}

export function labelFor(key: string) {
  return key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}
