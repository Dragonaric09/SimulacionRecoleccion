import { useState } from 'react'
import { Database, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatasetProvider, useDatasetContext, type DatasetDomain } from './DatasetContext'
import { navigation, navigate, sectionLabels, type NavigationItem } from './navigation'
import { PlaceholderPage } from './PlaceholderPage'
import { PrintButton } from '@/components/analytics/PrintButton'
import { EmpleadoresPrintBundle } from '@/features/empleadores/EmpleadoresPages'
import { TituladosPrintBundle } from '@/features/titulados/TituladosPages'

type Props = { route: NavigationItem }

export function AppLayout(props: Props) {
  return <DatasetProvider><AppLayoutContent {...props} /></DatasetProvider>
}

function AppLayoutContent({ route }: Props) {
  const { datasets, activeIds } = useDatasetContext()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const reportDomain = route.section === 'titulados' ? 'TITULADOS' : 'EMPLEADORES'
  const activeReportDataset = route.section !== 'general'
    ? datasets[reportDomain].find((dataset) => dataset.id === activeIds[reportDomain])
    : undefined

  return (
    <div className="min-h-screen bg-background text-ink-900">
      <div className="flex min-h-screen">
        {mobileMenuOpen && (
          <button
            aria-label="Cerrar menú"
            className="fixed inset-0 z-20 bg-slate-950/30 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        <aside
            className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col overflow-hidden border-r border-primary-container bg-primary-container text-on-primary transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:self-start ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          } ${sidebarOpen ? '' : 'lg:w-[76px]'}`}
        >
          <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/10 text-secondary-container">
              <Database className="size-5" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold leading-tight">Analizador</p>
                <p className="truncate text-xs text-on-primary-container">Analizador de encuestas</p>
              </div>
            )}
          </div>
          <nav className="scrollbar-sidebar flex-1 space-y-5 overflow-y-auto px-2 py-3" aria-label="Navegación principal">
            {(['general', 'titulados', 'empleadores'] as const).map((section) => {
              const items = navigation.filter((item) => item.section === section)
              return (
                <div key={section} className="space-y-1">
                  {sidebarOpen && (
                    <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-[#7db1dd]">
                      {sectionLabels[section]}
                    </p>
                  )}
                  {items.map((item) => {
                    const Icon = item.icon
                    const active = item.path === route.path
                    return (
                      <a
                        key={item.path}
                        href={item.path}
                        title={!sidebarOpen ? item.label : undefined}
                        aria-current={active ? 'page' : undefined}
                        onClick={(event) => {
                          event.preventDefault()
                          navigate(item.path)
                          setMobileMenuOpen(false)
                        }}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                          active
                            ? 'bg-white/10 text-white shadow-sm'
                            : 'text-on-primary-container hover:bg-white/10 hover:text-white'
                        } ${sidebarOpen ? '' : 'justify-center'}`}
                      >
                        <Icon className="size-4 shrink-0" />
                        {sidebarOpen && <span className="truncate">{item.label}</span>}
                      </a>
                    )
                  })}
                </div>
              )
            })}
          </nav>
          <div className="hidden border-t border-white/10 p-3 lg:block">
            <Button
              variant="ghost"
              size="sm"
              className={`w-full ${sidebarOpen ? 'justify-start' : 'justify-center'}`}
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label={sidebarOpen ? 'Contraer navegación' : 'Expandir navegación'}
            >
              {sidebarOpen ? <PanelLeftClose /> : <PanelLeftOpen />}
              {sidebarOpen && 'Contraer menú'}
            </Button>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border-line bg-surface/95 px-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Abrir menú"
              >
                <Menu />
              </Button>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-ink-900">{route.label}</p>
                <p className="text-xs text-ink-600">{route.description}</p>
              </div>
            </div>
            {route.section !== 'general' && (
              <div className="print-hide flex min-w-0 flex-wrap items-center justify-end gap-2">
                <GlobalDatasetSelector domain={route.section === 'titulados' ? 'TITULADOS' : 'EMPLEADORES'} />
                {!route.path.includes('cruces-exportacion') && !route.path.includes('simulacion-escenarios') && <PrintButton domain={route.section === 'titulados' ? 'TITULADOS' : 'EMPLEADORES'} />}
              </div>
            )}
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {route.section !== 'general' && !route.path.includes('cruces-exportacion') && !route.path.includes('simulacion-escenarios') && (
              <section className="print-only print-cover mb-6" aria-label="Portada del informe">
                <p className="caption-bold uppercase tracking-wider text-ink-600">SimulacionEM · Informe analítico</p>
                <h1 className="headline-page">{route.section === 'titulados' ? 'Titulados' : 'Empleadores'}</h1>
                <p>Informe completo de análisis</p>
                <p>Fecha de generación: {new Intl.DateTimeFormat('es-BO', { dateStyle: 'long', timeZone: 'America/La_Paz' }).format(new Date())}</p>
                <p>Filtros activos: Año: Todos · Estado laboral: Todos · Sector: Todos</p>
                <p>Dataset: {activeReportDataset ? `${datasetDisplayName(activeReportDataset, reportDomain)} · ${activeReportDataset.rowsValid} válidas` : 'No seleccionado'}</p>
                <p>Mostrando las respuestas válidas del dataset seleccionado.</p>
                <p className="mt-4 text-xs text-ink-600">Los porcentajes excluyen “No sabe” y “No observado”. Con menos de 5 respuestas, las gráficas son solo referenciales.</p>
              </section>
            )}
            <div className="screen-content"><PlaceholderPage route={route} /></div>
            {route.section !== 'general' && !route.path.includes('cruces-exportacion') && !route.path.includes('simulacion-escenarios') && (
              <div className="print-bundle" aria-label="Informe completo para impresión">
                {route.section === 'titulados' ? <TituladosPrintBundle /> : <EmpleadoresPrintBundle />}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

function GlobalDatasetSelector({ domain }: { domain: DatasetDomain }) {
  const { datasets, activeIds, setActiveDataset } = useDatasetContext()
  const available = datasets[domain]
  const active = available.find((dataset) => dataset.id === activeIds[domain])
  if (!available.length) return null
  if (available.length === 1) {
    return <span className="max-w-[260px] truncate rounded-md border border-border-line bg-white px-3 py-2 text-xs text-ink-600">Datos: {active ? `${datasetDisplayName(active, domain)} · ${active.rowsValid} válidas` : 'Sin dataset'}</span>
  }
  return (
    <Select value={active?.id ?? ''} onValueChange={(value) => {
      if (value === '__new__') {
        navigate('/cargar-datos')
        return
      }
      setActiveDataset(domain, value)
    }}>
      <SelectTrigger className="h-9 w-[280px] min-w-0 text-xs" aria-label="Dataset activo">
        <span className="shrink-0 text-ink-600">Datos:</span>
        <SelectValue placeholder="Seleccionar dataset" />
      </SelectTrigger>
      <SelectContent>
        {available.map((dataset) => (
          <SelectItem key={dataset.id} value={dataset.id}>
            {datasetDisplayName(dataset, domain)} · {dataset.importedAt ? new Intl.DateTimeFormat('es-BO').format(new Date(dataset.importedAt)) : 'sin fecha'} · {dataset.rowsValid} válidas
          </SelectItem>
        ))}
        <SelectItem value="__new__">Cargar nuevo archivo…</SelectItem>
      </SelectContent>
    </Select>
  )
}

function datasetDisplayName(dataset: { sourceFileName: string; displayName?: string; period: number | null }, domain: DatasetDomain) {
  if (dataset.displayName) return dataset.displayName
  if (dataset.period) return `${domain === 'TITULADOS' ? 'Encuesta titulados' : 'Encuesta empleadores'} ${dataset.period}`
  return dataset.sourceFileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')
}
