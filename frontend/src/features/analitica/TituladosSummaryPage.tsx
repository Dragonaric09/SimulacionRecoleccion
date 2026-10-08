import { useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, GraduationCap, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/analytics/Badge'
import { FilterToolbar } from '@/components/analytics/FilterToolbar'
import { KpiCard } from '@/components/analytics/KpiCard'
import { StatusPanel } from '@/components/analytics/StatusPanel'
import { apiRequest } from '@/api/client'
import type { DatasetSummary } from '@/features/encuesta/api'
import type { AnalyticsSummary, CategoryDistribution } from './api'

const fields = 'situacion_laboral_actual,interes_posgrado,sector_trabajo,anio_titulacion'

export function TituladosSummaryPage() {
  const [datasets, setDatasets] = useState<DatasetSummary[]>([])
  const [datasetId, setDatasetId] = useState<string | undefined>(() => localStorage.getItem('simulacionem.activeDatasetId') ?? undefined)
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiRequest<DatasetSummary[]>('/datasets').then((items) => {
      const titulados = items.filter((item) => item.surveyType === 'TITULADOS')
      setDatasets(titulados)
      if (!datasetId || !titulados.some((item) => item.id === datasetId)) setDatasetId(titulados.at(-1)?.id)
    }).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)))
  }, [datasetId])

  useEffect(() => {
    if (!datasetId) { setLoading(false); return }
    setLoading(true); setError(null)
    apiRequest<AnalyticsSummary>(`/analytics/titulados/summary?datasetId=${encodeURIComponent(datasetId)}&fields=${encodeURIComponent(fields)}`)
      .then(setSummary).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause))).finally(() => setLoading(false))
  }, [datasetId])

  const laboral = summary?.distributions.situacion_laboral_actual
  const posgrado = summary?.distributions.interes_posgrado
  const trabajo = laboral ? firstCount(laboral, ['Trabaja en una organización', 'Trabaja']) : null
  const interes = posgrado ? firstCount(posgrado, ['Sí', 'SI', 'Si']) : null
  const medianYear = summary?.numericMedians.anio_titulacion
  const yearsSince = medianYear ? new Date().getFullYear() - medianYear : null

  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div className="space-y-2"><div className="flex items-center gap-3"><p className="caption-bold uppercase tracking-wider text-ink-600">SimulacionEM</p><Badge tone="titulados">Titulados</Badge></div><h1 className="headline-page">Resumen general</h1><p className="max-w-2xl text-sm text-ink-600">Indicadores descriptivos de las respuestas de titulados.</p></div><select className="control" value={datasetId ?? ''} onChange={(event) => { setDatasetId(event.target.value || undefined); if (event.target.value) localStorage.setItem('simulacionem.activeDatasetId', event.target.value) }} aria-label="Dataset de titulados"><option value="">Seleccionar dataset</option>{datasets.map((dataset) => <option key={dataset.id} value={dataset.id}>{dataset.sourceFileName} · {dataset.rowsValid} válidas</option>)}</select></div>
    {summary && <FilterToolbar count={`${summary.validResponses} respuestas válidas`} />}
    {loading && <StatusPanel kind="loading" title="Cargando resumen" description="Consultando los indicadores del dataset seleccionado." />}
    {!loading && error && <StatusPanel kind="warning" title="No se pudo cargar el resumen" description={error} />}
    {!loading && !error && !summary && <StatusPanel kind="info" title="Sin dataset de titulados" description="Importa un CSV de titulados desde Cargar datos para ver este resumen." />}
    {summary && <>
      {summary.smallSample && <StatusPanel kind="warning" title="Muestra reducida" description={`Los resultados corresponden a ${summary.validResponses} respuestas válidas y deben leerse junto con sus conteos.`} />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><KpiCard label="Titulados encuestados" value={String(summary.validResponses)} detail={`${summary.validResponses} de ${summary.totalResponses}`} note={`n = ${summary.validResponses}`} icon={Users} tone="titulados" /><KpiCard label="Con trabajo" value={formatCount(workValue(trabajo), laboral?.validCount ?? 0)} detail={formatPercent(workValue(trabajo), laboral?.validCount ?? 0)} note={`n = ${laboral?.validCount ?? 0}`} icon={BriefcaseBusiness} tone="titulados" /><KpiCard label="Mediana desde titulación" value={yearsSince === null ? '—' : `${yearsSince} años`} detail={medianYear === undefined ? 'No disponible' : `Año mediano: ${medianYear}`} note={`n = ${medianYear === undefined ? 0 : summary.validResponses}`} icon={GraduationCap} tone="titulados" /><KpiCard label="Interesados en posgrado" value={formatCount(workValue(interes), posgrado?.validCount ?? 0)} detail={formatPercent(workValue(interes), posgrado?.validCount ?? 0)} note={`n = ${posgrado?.validCount ?? 0}`} icon={GraduationCap} tone="titulados" /></div>
      <div className="grid gap-6 lg:grid-cols-2"><DistributionCard title="Estado laboral" distribution={laboral} /><DistributionCard title="Áreas de posgrado de interés" distribution={posgrado} /></div>
    </>}
  </div>
}

function DistributionCard({ title, distribution }: { title: string; distribution?: CategoryDistribution }) {
  const entries = useMemo(() => Object.entries(distribution?.counts ?? {}), [distribution])
  return <Card><CardHeader><CardTitle className="title-card">{title}</CardTitle><CardDescription>Conteo y porcentaje · n = {distribution?.validCount ?? 0}</CardDescription></CardHeader><CardContent>{entries.length ? <div className="space-y-3">{entries.map(([label, count]) => { const percent = distribution?.percentages[label] ?? 0; return <div key={label} className="space-y-1"><div className="flex justify-between gap-4 text-sm"><span className="truncate">{label}</span><span className="tabular-nums font-medium">{count} · {percent}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-titulados" style={{ width: `${percent}%` }} /></div></div>})}</div> : <p className="text-sm text-ink-600">Sin respuestas disponibles para esta variable.</p>}</CardContent></Card>
}

function firstCount(distribution: CategoryDistribution, candidates: string[]) { const key = Object.keys(distribution.counts).find((item) => candidates.some((candidate) => item.toLowerCase() === candidate.toLowerCase())); return key ? { count: distribution.counts[key], percentage: distribution.percentages[key] ?? 0 } : null }
function workValue(value: { count: number; percentage: number } | null) { return value?.count ?? null }
function formatCount(value: number | null, total: number) { return value === null ? '—' : `${value} de ${total}` }
function formatPercent(value: number | null, total: number) { return value === null ? 'No disponible' : `${total ? ((value / total) * 100).toFixed(2) : 0}%` }

