import { useMemo, useState } from 'react'
import { FileText, LockKeyhole, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/analytics/Badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useDatasetContext, type DatasetDomain } from '@/app/DatasetContext'
import { groupedModules, reportCatalog } from './reportCatalog'
import type { ReportModuleDefinition } from './reportTypes'

const domains: DatasetDomain[] = ['TITULADOS', 'EMPLEADORES']

export function ReportPage() {
  const { datasets, activeIds, setActiveDataset } = useDatasetContext()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>(reportCatalog.map((module) => module.id))
  const [showCover, setShowCover] = useState(true)
  const [showDataTables, setShowDataTables] = useState(false)
  const [hideEmptyOptions, setHideEmptyOptions] = useState(false)

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
  const selectAll = () => setSelected(reportCatalog.map((module) => module.id))
  const clearAll = () => setSelected([])

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3"><p className="caption-bold uppercase tracking-wider text-ink-600">SimulacionEM</p><Badge tone="neutral">Fase 1</Badge></div>
          <h1 className="headline-page">Reporte</h1>
          <p className="max-w-3xl text-sm text-ink-600">Selecciona módulos existentes de una o ambas encuestas para preparar el reporte base. La vista previa y la generación PDF se conectarán en el siguiente corte.</p>
        </div>
        <Button disabled={selectedCount === 0}><FileText /> Generar PDF</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Configuración del reporte</CardTitle><CardDescription>Los datasets y filtros serán independientes por encuesta. En esta primera integración se conserva la orientación horizontal.</CardDescription></CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {domains.map((domain) => <DatasetPicker key={domain} domain={domain} datasets={datasets[domain]} activeId={activeIds[domain]} onChange={(id) => setActiveDataset(domain, id)} />)}
          <label className="flex items-center gap-3 text-sm"><Checkbox checked={showCover} onCheckedChange={(value) => setShowCover(value === true)} /> Portada del informe</label>
          <label className="flex items-center gap-3 text-sm"><Checkbox checked={showDataTables} onCheckedChange={(value) => setShowDataTables(value === true)} /> Tabla de datos bajo cada gráfico</label>
          <label className="flex items-center gap-3 text-sm"><Checkbox checked={hideEmptyOptions} onCheckedChange={(value) => setHideEmptyOptions(value === true)} /> Ocultar opciones sin respuestas</label>
          <div className="rounded-lg border border-border-line bg-surface-container-low p-3 text-sm text-ink-600"><LockKeyhole className="mr-2 inline size-4" />El reporte recibirá agregados permitidos; no se imprimen datos personales ni texto libre.</div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.75fr)]">
        <Card>
          <CardHeader><div className="flex flex-wrap items-center justify-between gap-3"><div><CardTitle>Contenido</CardTitle><CardDescription>{selectedCount} de {reportCatalog.length} módulos seleccionados</CardDescription></div><div className="flex gap-2"><Button variant="outline" size="sm" onClick={selectAll}>Todo</Button><Button variant="outline" size="sm" onClick={clearAll}>Ninguno</Button></div></div><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar módulo…" aria-label="Buscar módulo" /></CardHeader>
          <CardContent className="space-y-5">
            {filtered.map(({ domain, groups }) => <DomainModuleGroup key={domain} domain={domain} groups={groups} selected={selected} onToggle={toggle} />)}
          </CardContent>
        </Card>
        <Card className="h-fit xl:sticky xl:top-24"><CardHeader><CardTitle>Vista previa</CardTitle><CardDescription>El PDF real aparecerá aquí cuando se conecte el constructor pdfmake.</CardDescription></CardHeader><CardContent><div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-border-line bg-surface-container-low p-6 text-center text-sm text-ink-600"><FileText className="mb-3 size-10 text-primary" /><p className="font-medium text-ink-900">{selectedCount === 0 ? 'Selecciona al menos un módulo' : 'Vista previa pendiente de generación'}</p><p className="mt-2">{selectedCount === 0 ? 'El botón de generación se activará cuando haya contenido.' : 'La selección y los datasets ya están preparados para el constructor del documento.'}</p><Button className="mt-4" variant="ghost" size="sm" onClick={() => { setSelected(reportCatalog.map((module) => module.id)); setQuery('') }}><RotateCcw /> Restablecer selección</Button></div></CardContent></Card>
      </div>
    </div>
  )
}

function DatasetPicker({ domain, datasets, activeId, onChange }: { domain: DatasetDomain; datasets: { id: string; sourceFileName: string; displayName: string; rowsValid: number }[]; activeId?: string; onChange: (id: string) => void }) {
  const label = domain === 'TITULADOS' ? 'Titulados' : 'Empleadores'
  return <label className="grid gap-1 text-sm"><span className="font-medium text-ink-900">Dataset de {label}</span><Select value={activeId ?? ''} onValueChange={onChange} disabled={datasets.length === 0}><SelectTrigger><SelectValue placeholder={datasets.length ? 'Seleccionar dataset' : 'Sin dataset cargado'} /></SelectTrigger><SelectContent>{datasets.map((dataset) => <SelectItem key={dataset.id} value={dataset.id}>{dataset.displayName || dataset.sourceFileName} · {dataset.rowsValid} válidas</SelectItem>)}</SelectContent></Select></label>
}

function DomainModuleGroup({ domain, groups, selected, onToggle }: { domain: DatasetDomain; groups: Record<string, ReportModuleDefinition[]>; selected: string[]; onToggle: (id: string, checked: boolean) => void }) {
  const label = domain === 'TITULADOS' ? 'Titulados' : 'Empleadores'
  return <section className="space-y-3"><div className="flex items-center justify-between border-b border-border-line pb-2"><h3 className="font-semibold text-ink-900">{label}</h3><Badge tone={domain === 'TITULADOS' ? 'titulados' : 'empleadores'}>{Object.values(groups).flat().filter((module) => selected.includes(module.id)).length} seleccionados</Badge></div>{Object.entries(groups).map(([section, modules]) => <div key={section} className="space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-ink-600">{section}</p>{modules.map((module) => <ModuleRow key={module.id} module={module} checked={selected.includes(module.id)} onChange={(checked) => onToggle(module.id, checked)} />)}</div>)}</section>
}

function ModuleRow({ module, checked, onChange }: { module: ReportModuleDefinition; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent p-2 transition-colors hover:border-border-line hover:bg-surface-container-low"><Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} /><span className="min-w-0"><span className="block text-sm font-medium text-ink-900">{module.title}</span><span className="block text-xs text-ink-600">{module.description} · <code className="text-[11px]">{module.id}</code></span></span></label>
}
