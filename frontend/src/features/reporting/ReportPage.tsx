import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FileText, ListFilter, LockKeyhole, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/analytics/Badge'
import { FilterMenu } from '@/components/analytics/FilterToolbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useDatasetContext, type DatasetDomain } from '@/app/DatasetContext'
import { groupedModules, reportCatalog } from './reportCatalog'
import type { ReportModuleDefinition } from './reportTypes'
import type { ReportModuleAvailability } from './reportTypes'
import type { ReportFilters } from './reportTypes'
import { loadReportSummaries } from './reportData'
import { createReportPdf } from './reportPdf'
import { fieldsForModule } from './reportData'
import { ORGANIZATION_SIZE_ORDER, ORGANIZATION_TYPE_OPTIONS } from '@/features/empleadores/instrumento'

const domains: DatasetDomain[] = ['TITULADOS', 'EMPLEADORES']
const emptyFilters = (): ReportFilters => ({ laborStatus: [], sector: [], gender: [], organizationType: [], organizationSize: [] })
type ReportTiming = { run: number; backendMs: number; definitionMs: number; blobMs: number; totalMs: number; bytes: number }

async function withTimeout<T>(promise: Promise<T>, milliseconds: number) {
  let timer: number | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(() => reject(new Error('La generación del reporte tardó más de 20 segundos.')), milliseconds)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    if (timer !== undefined) window.clearTimeout(timer)
  }
}

export function ReportPage() {
  const { datasets, activeIds, setActiveDataset } = useDatasetContext()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>(reportCatalog.filter((module) => module.domain === 'TITULADOS').map((module) => module.id))
  const [showCover, setShowCover] = useState(true)
  const [showDataTables, setShowDataTables] = useState(false)
  const [hideEmptyOptions, setHideEmptyOptions] = useState(false)
  const [reportTitle, setReportTitle] = useState('Informe de autoevaluación')
  const [paper, setPaper] = useState<'A4' | 'LETTER'>('A4')
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null)
  const [availability, setAvailability] = useState<Record<string, ReportModuleAvailability>>({})
  const [timing, setTiming] = useState<ReportTiming | null>(null)
  const generationCount = useRef(0)
  const [filters, setFilters] = useState<Partial<Record<DatasetDomain, ReportFilters>>>({ TITULADOS: emptyFilters(), EMPLEADORES: emptyFilters() })
  const [preset, setPreset] = useState('Titulados completo')
  const [contentOpen, setContentOpen] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('simulacionem.report.selection')
      if (!saved) return
      const parsed = JSON.parse(saved) as { selected?: string[]; preset?: string }
      if (Array.isArray(parsed.selected)) setSelected(parsed.selected)
      if (parsed.preset) setPreset(parsed.preset)
    } catch { /* almacenamiento opcional */ }
  }, [])

  useEffect(() => {
    try { localStorage.setItem('simulacionem.report.selection', JSON.stringify({ selected, preset })) } catch { /* almacenamiento opcional */ }
  }, [selected, preset])

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase()
    return domains.map((domain) => {
      const groups = groupedModules(domain)
      return {
        domain,
        groups: Object.fromEntries(Object.entries(groups).map(([section, modules]) => [section, modules.filter((module) => !normalized || `${module.title} ${module.description} ${section}`.toLocaleLowerCase().includes(normalized))]).filter(([, modules]) => modules.length > 0)),
      }
    })
  }, [query])

  const selectedCount = selected.length
  const toggle = (id: string, checked: boolean) => setSelected((current) => checked ? [...new Set([...current, id])] : current.filter((value) => value !== id))
  const selectAll = () => { setSelected(reportCatalog.map((module) => module.id)); setPreset('Reporte personalizado') }
  const clearAll = () => { setSelected([]); setPreset('Reporte personalizado') }
  const applyPreset = (name: string) => {
    const ids = name === 'Titulados completo'
      ? reportCatalog.filter((module) => module.domain === 'TITULADOS').map((module) => module.id)
      : name === 'Empleadores completo'
        ? reportCatalog.filter((module) => module.domain === 'EMPLEADORES').map((module) => module.id)
        : name === 'Resumen general'
          ? reportCatalog.filter((module) => module.id.endsWith('.resumen.general') || module.id.endsWith('.resumen.contratacion')).map((module) => module.id)
          : reportCatalog.map((module) => module.id)
    setSelected(ids)
    setPreset(name)
  }

  const reportFilename = () => {
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
    const prefix = preset === 'Titulados completo' ? 'titulados_completo' : preset === 'Empleadores completo' ? 'empleadores_completo' : preset === 'Ambos completos' ? 'titulados_empleadores_completo' : 'reporte_personalizado'
    return `${prefix}_${date}.pdf`
  }

  const generatePdf = useCallback(async () => {
    if (selected.length === 0) return
    const totalStarted = performance.now()
    const run = generationCount.current + 1
    setLoading(true)
    setError(null)
    try {
      const modules = reportCatalog.filter((module) => selected.includes(module.id))
      const datasetIds = { TITULADOS: activeIds.TITULADOS, EMPLEADORES: activeIds.EMPLEADORES }
      const backendStarted = performance.now()
      const summaries = await withTimeout(loadReportSummaries(modules, datasetIds, filters), 20_000)
      const backendMs = performance.now() - backendStarted
      const nextAvailability: Record<string, ReportModuleAvailability> = {}
      modules.forEach((module) => {
        const summary = summaries.get(module.domain)
        if (!datasetIds[module.domain] || !summary) nextAvailability[module.id] = 'NO_DISPONIBLE'
        else if (fieldsForModule(module).some((field) => !summary.availableFields.includes(field))) nextAvailability[module.id] = 'NO_DISPONIBLE'
        else if (summary.validResponses === 0) nextAvailability[module.id] = 'SIN_DATOS_CON_FILTRO'
        else if (fieldsForModule(module).every((field) => {
          const distribution = summary.distributions[field]
          return (distribution != null && distribution.validCount === 0) || (distribution == null && summary.numericAverages[field] == null)
        })) nextAvailability[module.id] = 'SIN_RESPUESTAS'
        else if (summary.validResponses < 5) nextAvailability[module.id] = 'MUESTRA_PEQUENA'
        else nextAvailability[module.id] = 'DISPONIBLE'
      })
      setAvailability(nextAvailability)
      const printableStatuses: ReportModuleAvailability[] = ['DISPONIBLE', 'MUESTRA_PEQUENA']
      const printableModules = modules.filter((module) => printableStatuses.includes(nextAvailability[module.id]))
      const omitted = modules.filter((module) => !printableStatuses.includes(nextAvailability[module.id])).map((module) => ({ module, status: nextAvailability[module.id] }))
      const datasetNames = { TITULADOS: datasets.TITULADOS.find((dataset) => dataset.id === activeIds.TITULADOS)?.displayName, EMPLEADORES: datasets.EMPLEADORES.find((dataset) => dataset.id === activeIds.EMPLEADORES)?.displayName }
      const definitionStarted = performance.now()
      const document = await createReportPdf(printableModules, summaries, { title: reportTitle.trim() || 'Informe de autoevaluación', showCover, showDataTables, hideEmptyOptions, paper, filters, omitted, datasetNames })
      const definitionMs = performance.now() - definitionStarted
      const blobStarted = performance.now()
      const blob = await withTimeout(document.getBlob(), 20_000)
      const blobMs = performance.now() - blobStarted
      const nextTiming = { run, backendMs, definitionMs, blobMs, totalMs: performance.now() - totalStarted, bytes: blob.size }
      generationCount.current = run
      setTiming(nextTiming)
      console.info('[Reporte] generación', nextTiming)
      setPdfBlob(blob)
      setPdfUrl((previous) => { if (previous) URL.revokeObjectURL(previous); return URL.createObjectURL(blob) })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo generar el PDF.')
    } finally {
      setLoading(false)
    }
  }, [activeIds.EMPLEADORES, activeIds.TITULADOS, datasets.EMPLEADORES, datasets.TITULADOS, filters, hideEmptyOptions, paper, reportTitle, selected, showCover, showDataTables])

  useEffect(() => {
    if (selected.length === 0) return
    const timer = window.setTimeout(() => { void generatePdf() }, 650)
    return () => window.clearTimeout(timer)
  }, [generatePdf, selected.length])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3"><p className="caption-bold uppercase tracking-wider text-ink-600">SimulacionEM</p><Badge tone="neutral">Fase 1</Badge></div>
          <h1 className="headline-page">Reporte</h1>
          <p className="max-w-3xl text-sm text-ink-600">Selecciona módulos existentes de una o ambas encuestas para generar el reporte base. La vista previa usa el mismo PDF que se puede descargar.</p>
        </div>
        <Button disabled={selectedCount === 0 || loading} onClick={() => void generatePdf()}><FileText /> {loading ? 'Generando…' : 'Generar PDF'}</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex flex-wrap items-center gap-2">Configuración del reporte <Badge tone="neutral">{preset}</Badge></CardTitle><CardDescription>{preset === 'Reporte personalizado' ? 'Selección personalizada de módulos.' : 'Informe completo según el preajuste seleccionado.'} Los datasets y filtros son independientes por encuesta. En esta primera integración se conserva la orientación horizontal.</CardDescription></CardHeader>
          <CardContent className="grid gap-4 lg:grid-cols-2">
           <label className="grid gap-1 text-sm lg:col-span-2"><span className="font-medium text-ink-900">Título</span><Input value={reportTitle} onChange={(event) => setReportTitle(event.target.value)} placeholder="Informe de autoevaluación" /></label>
          {domains.map((domain) => <DatasetPicker key={domain} domain={domain} datasets={datasets[domain]} activeId={activeIds[domain]} onChange={(id) => setActiveDataset(domain, id)} />)}
          <label className="flex items-center gap-3 text-sm"><Checkbox checked={showCover} onCheckedChange={(value) => setShowCover(value === true)} /> Portada del informe</label>
          <label className="flex items-center gap-3 text-sm"><Checkbox checked={showDataTables} onCheckedChange={(value) => setShowDataTables(value === true)} /> Tabla de datos bajo cada gráfico</label>
          <label className="flex items-center gap-3 text-sm"><Checkbox checked={hideEmptyOptions} onCheckedChange={(value) => setHideEmptyOptions(value === true)} /> Ocultar opciones sin respuestas</label>
           <label className="grid gap-1 text-sm"><span className="font-medium text-ink-900">Papel</span><Select value={paper} onValueChange={(value) => setPaper(value as 'A4' | 'LETTER')}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="A4">A4</SelectItem><SelectItem value="LETTER">Carta</SelectItem></SelectContent></Select></label>
          <div className="rounded-lg border border-border-line bg-surface-container-low p-3 text-sm text-ink-600"><LockKeyhole className="mr-2 inline size-4" />El reporte recibirá agregados permitidos; no se imprimen datos personales ni texto libre.</div>
        </CardContent>
      </Card>

      <Card><CardHeader><CardTitle>Preajustes</CardTitle><CardDescription>Seleccionan módulos existentes sin cambiar los filtros de cada encuesta.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-2">{['Titulados completo', 'Empleadores completo', 'Ambos completos', 'Resumen general'].map((name) => <Button key={name} variant={preset === name ? 'default' : 'outline'} size="sm" onClick={() => applyPreset(name)}>{name}</Button>)}</CardContent></Card>

      <ReportFiltersPanel filters={filters} onChange={setFilters} />

      <Sheet open={contentOpen} onOpenChange={setContentOpen}>
        <Card className="h-fit"><CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Vista previa del PDF</CardTitle><CardDescription>El documento real ocupa el panel principal y es el mismo Blob que se descarga.</CardDescription>{timing && <p className="mt-1 text-xs text-ink-600">Generación {timing.run === 1 ? 'inicial' : `#${timing.run}`} · datos {Math.round(timing.backendMs)} ms · documento {Math.round(timing.definitionMs)} ms · Blob {Math.round(timing.blobMs)} ms · {Math.round(timing.totalMs)} ms · {(timing.bytes / 1024).toFixed(1)} KB</p>}</div><div className="flex flex-wrap items-center justify-end gap-2"><SheetTrigger asChild><Button variant="outline" size="sm"><ListFilter /> <span>Editar contenido</span><span className="rounded-full bg-surface-container-high px-2 py-0.5 text-xs text-ink-700">{selectedCount}/{reportCatalog.length}</span></Button></SheetTrigger>{pdfBlob && <Button variant="outline" size="sm" onClick={() => { const url = URL.createObjectURL(pdfBlob); const link = document.createElement('a'); link.href = url; link.download = reportFilename(); link.click(); URL.revokeObjectURL(url) }}>Descargar PDF</Button>}</div></div></CardHeader><CardContent>{error && <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-800"><p>{error}</p><Button className="mt-2" variant="outline" size="sm" onClick={() => void generatePdf()}>Reintentar</Button></div>}{pdfUrl ? <iframe title="Vista previa del reporte" src={pdfUrl} className="h-[calc(100vh-11rem)] min-h-[720px] w-full rounded-lg border border-border-line bg-slate-100" /> : <div className="flex min-h-[720px] flex-col items-center justify-center rounded-lg border border-dashed border-border-line bg-surface-container-low p-6 text-center text-sm text-ink-600"><FileText className="mb-3 size-10 text-primary" /><p className="font-medium text-ink-900">{selectedCount === 0 ? 'Selecciona al menos un módulo' : 'Vista previa pendiente de generación'}</p><p className="mt-2">{selectedCount === 0 ? 'El botón de generación se activará cuando haya contenido.' : 'Pulsa “Generar PDF” para consultar el informe real.'}</p><Button className="mt-4" variant="ghost" size="sm" onClick={() => { setSelected(reportCatalog.map((module) => module.id)); setQuery('') }}><RotateCcw /> Restablecer selección</Button></div>}</CardContent></Card>
        <SheetContent side="right" className="w-[min(100vw,520px)] overflow-y-auto p-0 sm:max-w-[520px]"><SheetHeader className="border-b border-border-line"><SheetTitle>Editar contenido del reporte</SheetTitle><SheetDescription>{selectedCount} de {reportCatalog.length} módulos seleccionados. Los cambios actualizan la vista previa automáticamente.</SheetDescription></SheetHeader><div className="flex items-center gap-2 px-4"><Button variant="outline" size="sm" onClick={selectAll}>Todo</Button><Button variant="outline" size="sm" onClick={clearAll}>Ninguno</Button></div><div className="px-4"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar módulo…" aria-label="Buscar módulo" /></div><div className="space-y-5 px-4 pb-6">{filtered.map(({ domain, groups }) => <DomainModuleGroup key={domain} domain={domain} groups={groups} selected={selected} availability={availability} datasetAvailable={Boolean(activeIds[domain])} onToggle={(id, checked) => { toggle(id, checked); setPreset('Reporte personalizado') }} />)}</div></SheetContent>
      </Sheet>
    </div>
  )
}

const TITULADOS_FILTERS = [
  { key: 'laborStatus' as const, label: 'Estado laboral', options: ['Trabaja en una organización', 'Emprendimiento propio', 'Actualmente no trabaja', 'Sin respuesta'] },
  { key: 'sector' as const, label: 'Sector', options: ['Público', 'Privado', 'Independiente', 'ONG', 'No trabaja'] },
  { key: 'gender' as const, label: 'Género', options: ['Hombre', 'Mujer'] },
]
const EMPLEADORES_FILTERS = [
  { key: 'organizationType' as const, label: 'Tipo de organización', options: [...ORGANIZATION_TYPE_OPTIONS] },
  { key: 'organizationSize' as const, label: 'Tamaño', options: [...ORGANIZATION_SIZE_ORDER] },
]

function ReportFiltersPanel({ filters, onChange }: { filters: Partial<Record<DatasetDomain, ReportFilters>>; onChange: (next: Partial<Record<DatasetDomain, ReportFilters>>) => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const update = (domain: DatasetDomain, key: keyof ReportFilters, value: string) => {
    const current = filters[domain] ?? emptyFilters()
    const values = current[key] as string[]
    onChange({ ...filters, [domain]: { ...current, [key]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value] } })
  }
  const clear = (domain: DatasetDomain, key: keyof ReportFilters) => {
    const current = filters[domain] ?? emptyFilters()
    onChange({ ...filters, [domain]: { ...current, [key]: [] } })
  }
  const updateScalar = (domain: DatasetDomain, key: 'yearFrom' | 'yearTo', value: string) => {
    const current = filters[domain] ?? emptyFilters()
    const numeric = value === '' ? undefined : Number(value)
    onChange({ ...filters, [domain]: { ...current, [key]: numeric } })
  }
  return <Card><CardHeader><CardTitle>Filtros por encuesta</CardTitle><CardDescription>Cada encuesta mantiene sus propios filtros. Se aplican al generar el PDF y no afectan a la otra fuente.</CardDescription></CardHeader><CardContent className="grid gap-5 lg:grid-cols-2"><FilterDomain domain="TITULADOS" title="Titulados" filters={filters.TITULADOS ?? emptyFilters()} definitions={TITULADOS_FILTERS} open={open} setOpen={setOpen} onUpdate={update} onClear={clear} onScalarChange={updateScalar} /><FilterDomain domain="EMPLEADORES" title="Empleadores" filters={filters.EMPLEADORES ?? emptyFilters()} definitions={EMPLEADORES_FILTERS} open={open} setOpen={setOpen} onUpdate={update} onClear={clear} onScalarChange={updateScalar} /></CardContent></Card>
}

function FilterDomain({ domain, title, filters, definitions, open, setOpen, onUpdate, onClear, onScalarChange }: { domain: DatasetDomain; title: string; filters: ReportFilters; definitions: { key: 'laborStatus' | 'sector' | 'gender' | 'organizationType' | 'organizationSize'; label: string; options: string[] }[]; open: string | null; setOpen: (value: string | null) => void; onUpdate: (domain: DatasetDomain, key: keyof ReportFilters, value: string) => void; onClear: (domain: DatasetDomain, key: keyof ReportFilters) => void; onScalarChange: (domain: DatasetDomain, key: 'yearFrom' | 'yearTo', value: string) => void }) {
  return <div className="space-y-3 rounded-lg border border-border-line p-3"><div className="flex items-center justify-between"><h3 className="font-semibold text-ink-900">{title}</h3><span className="text-xs text-ink-600">Vacío = Todos</span></div>{domain === 'TITULADOS' && <div className="grid grid-cols-2 gap-2"><label className="grid gap-1 text-xs text-ink-600">Año desde<Input type="number" value={filters.yearFrom ?? ''} onChange={(event) => onScalarChange(domain, 'yearFrom', event.target.value)} placeholder="Todos" /></label><label className="grid gap-1 text-xs text-ink-600">Año hasta<Input type="number" value={filters.yearTo ?? ''} onChange={(event) => onScalarChange(domain, 'yearTo', event.target.value)} placeholder="Todos" /></label></div>}<div className="flex flex-wrap gap-2">{definitions.map((definition) => { const values = filters[definition.key] as string[]; return <FilterMenu key={definition.key} label={definition.label} value={values.length === 0 ? 'Todos' : values.length === 1 ? values[0] : `${values.length} seleccionados`} open={open === `${domain}.${definition.key}`} onOpen={() => setOpen(open === `${domain}.${definition.key}` ? null : `${domain}.${definition.key}`)} options={definition.options} selected={values} onToggle={(value) => onUpdate(domain, definition.key, value)} onClear={() => onClear(domain, definition.key)} /> })}</div></div>
}

function DatasetPicker({ domain, datasets, activeId, onChange }: { domain: DatasetDomain; datasets: { id: string; sourceFileName: string; displayName: string; rowsValid: number }[]; activeId?: string; onChange: (id: string) => void }) {
  const label = domain === 'TITULADOS' ? 'Titulados' : 'Empleadores'
  return <label className="grid gap-1 text-sm"><span className="font-medium text-ink-900">Dataset de {label}</span><Select value={activeId ?? ''} onValueChange={onChange} disabled={datasets.length === 0}><SelectTrigger><SelectValue placeholder={datasets.length ? 'Seleccionar dataset' : 'Sin dataset cargado'} /></SelectTrigger><SelectContent>{datasets.map((dataset) => <SelectItem key={dataset.id} value={dataset.id}>{dataset.displayName || dataset.sourceFileName} · {dataset.rowsValid} válidas</SelectItem>)}</SelectContent></Select></label>
}

function DomainModuleGroup({ domain, groups, selected, availability, datasetAvailable, onToggle }: { domain: DatasetDomain; groups: Record<string, ReportModuleDefinition[]>; selected: string[]; availability: Record<string, ReportModuleAvailability>; datasetAvailable: boolean; onToggle: (id: string, checked: boolean) => void }) {
  const label = domain === 'TITULADOS' ? 'Titulados' : 'Empleadores'
  return <section className={`space-y-3 ${datasetAvailable ? '' : 'opacity-60'}`}><div className="flex items-center justify-between border-b border-border-line pb-2"><div><h3 className="font-semibold text-ink-900">{label}</h3>{!datasetAvailable && <p className="text-xs text-ink-600">Sin dataset de {label}</p>}</div><Badge tone={domain === 'TITULADOS' ? 'titulados' : 'empleadores'}>{Object.values(groups).flat().filter((module) => selected.includes(module.id)).length} seleccionados</Badge></div>{Object.entries(groups).map(([section, modules]) => <div key={section} className="space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-ink-600">{section}</p>{modules.map((module) => <ModuleRow key={module.id} module={module} status={availability[module.id]} checked={selected.includes(module.id)} disabled={!datasetAvailable} onChange={(checked) => onToggle(module.id, checked)} />)}</div>)}</section>
}

function ModuleRow({ module, status, checked, disabled, onChange }: { module: ReportModuleDefinition; status?: ReportModuleAvailability; checked: boolean; disabled: boolean; onChange: (checked: boolean) => void }) {
  const statusLabel = status === 'MUESTRA_PEQUENA' ? 'Muestra pequeña' : status === 'NO_DISPONIBLE' ? 'Dataset no disponible' : status === 'SIN_RESPUESTAS' ? 'Sin respuestas' : status === 'SIN_DATOS_CON_FILTRO' ? 'Sin datos con filtros' : status === 'DISPONIBLE' ? 'Disponible' : 'Pendiente de generar'
  return <label className={`flex items-start gap-3 rounded-lg border border-transparent p-2 transition-colors ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:border-border-line hover:bg-surface-container-low'}`}><Checkbox disabled={disabled} checked={checked} onCheckedChange={(value) => onChange(value === true)} /><span className="min-w-0"><span className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink-900">{module.title}<span className="rounded-full bg-surface-container-high px-2 py-0.5 text-[10px] font-medium text-ink-600">{disabled ? 'Sin dataset' : statusLabel}</span></span><span className="block text-xs text-ink-600">{module.description} · <code className="text-[11px]">{module.id}</code></span></span></label>
}
