import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, CheckCircle2, FileUp, RefreshCw, Trash2, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusPanel } from '@/components/analytics/StatusPanel'
import { Badge } from '@/components/analytics/Badge'
import { deleteDataset, importDataset, listDatasets, validateDataset, type DatasetSummary, type ImportReport } from './api'

type SurveyType = 'TITULADOS' | 'EMPLEADORES'

export function CargarDatosPage() {
  const [surveyType, setSurveyType] = useState<SurveyType>('TITULADOS')
  const [file, setFile] = useState<File | null>(null)
  const [report, setReport] = useState<ImportReport | null>(null)
  const [datasets, setDatasets] = useState<DatasetSummary[]>([])
  const [loading, setLoading] = useState<'validate' | 'import' | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { listDatasets().then(setDatasets).catch(() => undefined) }, [])

  function chooseFile(next: File | null) {
    setFile(next)
    setReport(null)
    setError(null)
  }

  async function validate() {
    if (!file) return
    setLoading('validate'); setError(null)
    try {
      const next = await validateDataset(file)
      setReport(next)
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
    finally { setLoading(null) }
  }

  async function process() {
    if (!file || !report || report.errors > 0 || report.rowsValid === 0) return
    setLoading('import'); setError(null)
    try {
      const imported = await importDataset(file)
      setReport(imported)
      const nextDatasets = await listDatasets()
      setDatasets(nextDatasets)
      if (imported.datasetId) localStorage.setItem('simulacionem.activeDatasetId', imported.datasetId)
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
    finally { setLoading(null) }
  }

  async function removeDataset(dataset: DatasetSummary) {
    if (!window.confirm(`¿Eliminar el dataset "${dataset.sourceFileName}"? También se eliminarán sus respuestas e incidencias.`)) return
    setDeletingId(dataset.id); setError(null)
    try {
      await deleteDataset(dataset.id)
      setDatasets((current) => current.filter((item) => item.id !== dataset.id))
      if (localStorage.getItem('simulacionem.activeDatasetId') === dataset.id) localStorage.removeItem('simulacionem.activeDatasetId')
      if (report?.datasetId === dataset.id) setReport(null)
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)) }
    finally { setDeletingId(null) }
  }

  const surveyLabel = surveyType === 'TITULADOS' ? 'Titulados' : 'Empleadores'
  const canProcess = Boolean(file && report && report.errors === 0 && report.rowsValid > 0 && report.surveyType === surveyType)

  return <div className="mx-auto max-w-5xl space-y-6">
    <div className="space-y-2"><div className="flex items-center gap-3"><p className="caption-bold uppercase tracking-wider text-ink-600">SimulacionEM</p><Badge tone="neutral">Importación</Badge></div><h1 className="headline-page">Cargar datos</h1><p className="max-w-2xl text-sm text-ink-600">Valida el archivo antes de procesarlo y conserva el reporte de calidad asociado al dataset.</p></div>

    <div className="grid gap-4 md:grid-cols-2">
      {(['TITULADOS', 'EMPLEADORES'] as SurveyType[]).map((type) => <button key={type} type="button" onClick={() => setSurveyType(type)} className={`rounded-lg border p-5 text-left transition-colors ${surveyType === type ? type === 'TITULADOS' ? 'border-titulados bg-titulados/10' : 'border-empleadores bg-empleadores/10' : 'border-border-line bg-white hover:bg-slate-50'}`}>
        <p className="title-card">{type === 'TITULADOS' ? 'Encuesta de titulados' : 'Encuesta de empleadores'}</p><p className="mt-1 text-sm text-ink-600">{type === 'TITULADOS' ? 'Perfil, empleabilidad y formación continua.' : 'Contratación, valoración y competencias.'}</p><span className="mt-3 inline-block text-xs font-medium text-ink-600">Tipo esperado: {type}</span>
      </button>)}
    </div>

    <Card><CardHeader><CardTitle className="flex items-center gap-2"><UploadCloud className="size-5" />Archivo de respuestas</CardTitle><CardDescription>Formato disponible en esta fase: CSV UTF-8. El backend detecta la estructura y valida sus encabezados.</CardDescription></CardHeader><CardContent className="space-y-4">
      <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} />
      <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-line bg-slate-50 p-10 text-center transition-colors hover:border-titulados hover:bg-titulados/5"><FileUp className="size-8 text-titulados" /><span className="font-medium">Seleccionar CSV de {surveyLabel.toLowerCase()}</span><span className="text-xs text-ink-600">{file ? file.name : 'Haz clic para buscar un archivo'}</span></button>
      {file && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border-line bg-white p-3 text-sm"><span><strong>{file.name}</strong> · {(file.size / 1024).toFixed(1)} KB</span><Button variant="outline" size="sm" onClick={() => chooseFile(null)}>Quitar archivo</Button></div>}
      <div className="flex flex-wrap gap-2"><Button onClick={validate} disabled={!file || loading !== null}>{loading === 'validate' ? <><RefreshCw className="animate-spin" />Validando…</> : 'Validar archivo'}</Button><Button variant="secondary" onClick={process} disabled={!canProcess || loading !== null}>{loading === 'import' ? <><RefreshCw className="animate-spin" />Procesando…</> : 'Procesar dataset'}</Button></div>
    </CardContent></Card>

    {error && <StatusPanel kind="warning" title="No se pudo completar la operación" description={error} />}
    {report && <ImportReportView report={report} expectedType={surveyType} />}
    <DatasetList datasets={datasets} deletingId={deletingId} onDelete={removeDataset} />
  </div>
}

function ImportReportView({ report, expectedType }: { report: ImportReport; expectedType: SurveyType }) {
  const typeMismatch = report.surveyType !== expectedType
  return <Card><CardHeader><CardTitle className="flex items-center gap-2">{report.errors === 0 ? <CheckCircle2 className="text-status-success" /> : <AlertTriangle className="text-status-warning" />}Resultado de validación</CardTitle><CardDescription>{typeMismatch ? `El archivo fue detectado como ${report.surveyType}, pero se esperaba ${expectedType}.` : `Tipo detectado: ${report.surveyType}`}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[['Leídas', report.rowsRead], ['Válidas', report.rowsValid], ['Rechazadas', report.rowsRejected], ['Avisos', report.warnings]].map(([label, value]) => <div key={String(label)} className="rounded-lg bg-slate-50 p-3"><p className="caption-meta text-ink-600">{label}</p><p className="display-kpi tabular-nums text-ink-900">{value}</p></div>)}</div>{report.issues.length > 0 && <div className="space-y-2"><p className="label-default text-ink-600">Incidencias detectadas</p><div className="max-h-64 space-y-2 overflow-y-auto">{report.issues.map((issue, index) => <div key={`${issue.code}-${index}`} className={`rounded-lg border p-3 text-sm ${issue.severity === 'ERROR' ? 'border-red-200 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}><p className="font-medium">{issue.severity} · {issue.code}</p><p>{issue.message}{issue.row ? ` (fila ${issue.row})` : ''}</p></div>)}</div></div>}{report.datasetId && <StatusPanel kind="success" title="Dataset disponible" description={`Identificador: ${report.datasetId}`} />}</CardContent></Card>
}

function DatasetList({ datasets, deletingId, onDelete }: { datasets: DatasetSummary[]; deletingId: string | null; onDelete: (dataset: DatasetSummary) => void }) {
  return <Card><CardHeader><CardTitle>Datasets disponibles</CardTitle><CardDescription>{datasets.length ? 'Selecciona el identificador activo o elimina un dataset que ya no necesites.' : 'Todavía no hay datasets importados en el backend.'}</CardDescription></CardHeader><CardContent>{datasets.length > 0 && <div className="space-y-2">{datasets.slice().reverse().map((dataset) => <div key={dataset.id} className="flex items-center gap-3 rounded-lg border border-border-line p-3 hover:bg-slate-50"><label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"><input type="radio" name="activeDataset" defaultChecked={localStorage.getItem('simulacionem.activeDatasetId') === dataset.id} onChange={() => localStorage.setItem('simulacionem.activeDatasetId', dataset.id)} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{dataset.sourceFileName}</span><span className="block text-xs text-ink-600">{dataset.surveyType} · {dataset.rowsValid} válidas · {dataset.status}</span></span><span className="hidden text-xs text-ink-600 md:block">{dataset.id}</span></label><Button variant="destructive" size="sm" onClick={() => onDelete(dataset)} disabled={deletingId !== null} aria-label={`Eliminar ${dataset.sourceFileName}`}><Trash2 />{deletingId === dataset.id ? 'Eliminando…' : 'Eliminar'}</Button></div>)}</div>}</CardContent></Card>
}

