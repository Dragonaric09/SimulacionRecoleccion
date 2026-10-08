import { useState } from 'react'
import { Database, Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { navigation, navigate, sectionLabels, type NavigationItem } from './navigation'
import { PlaceholderPage } from './PlaceholderPage'

type Props = { route: NavigationItem }

export function AppLayout({ route }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
          className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-primary-container bg-primary text-white transition-transform lg:static lg:translate-x-0 ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          } ${sidebarOpen ? '' : 'lg:w-[76px]'}`}
        >
          <div className="flex h-16 items-center gap-3 border-b px-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Database className="size-5" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">SimulacionEM</p>
                <p className="truncate text-xs text-on-primary-container">Analizador de encuestas</p>
              </div>
            )}
          </div>
          <nav className="flex-1 space-y-5 overflow-y-auto p-3" aria-label="Navegación principal">
            {(['general', 'titulados', 'empleadores'] as const).map((section) => {
              const items = navigation.filter((item) => item.section === section)
              return (
                <div key={section} className="space-y-1">
                  {sidebarOpen && (
                    <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-on-primary-container">
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
                            ? 'bg-slate-900 text-white shadow-sm'
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
          <div className="hidden border-t p-3 lg:block">
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
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border-line bg-white/95 px-4 backdrop-blur sm:px-6">
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
              <div>
                <p className="text-sm font-medium text-ink-900">{route.label}</p>
                <p className="hidden text-xs text-ink-600 sm:block">{route.description}</p>
              </div>
            </div>
            <span className="rounded-full border border-border-line bg-slate-50 px-3 py-1 text-xs text-ink-600">Modo analizador</span>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <PlaceholderPage route={route} />
          </main>
        </div>
      </div>
    </div>
  )
}

