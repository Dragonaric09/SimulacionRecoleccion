import {
  BarChart3,
  BriefcaseBusiness,
  FileChartColumn,
  GitCompareArrows,
  GraduationCap,
  LayoutDashboard,
  Network,
  FileText,
  Scale,
  Upload,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavigationItem = {
  path: string
  label: string
  description: string
  icon: LucideIcon
  section: NavigationSection
  implemented?: boolean
}

export type NavigationSection = 'general' | 'titulados' | 'empleadores' | 'comparacion'

/** Secciones ligadas a una sola encuesta: tienen dataset activo, informe PDF y tono propio. */
export function isDomainSection(section: NavigationSection): section is 'titulados' | 'empleadores' {
  return section === 'titulados' || section === 'empleadores'
}

export const navigation: NavigationItem[] = [
  {
    path: '/cargar-datos',
    label: 'Cargar datos',
    description: 'Importación y calidad de datasets',
    icon: Upload,
    section: 'general',
    implemented: true,
  },
  {
    path: '/reporte',
    label: 'Reporte',
    description: 'Selecciona módulos y prepara el informe PDF',
    icon: FileText,
    section: 'general',
    implemented: true,
  },
  {
    path: '/titulados/resumen',
    label: 'Resumen general',
    description: 'Indicadores principales de titulados',
    icon: LayoutDashboard,
    section: 'titulados',
  },
  {
    path: '/titulados/perfil-empleabilidad',
    label: 'Perfil de empleabilidad',
    description: 'Situación laboral y sectores',
    icon: BriefcaseBusiness,
    section: 'titulados',
  },
  {
    path: '/titulados/formacion-continua',
    label: 'Formación continua',
    description: 'Continuidad y necesidades formativas',
    icon: GraduationCap,
    section: 'titulados',
  },
  {
    path: '/titulados/financiamiento',
    label: 'Financiamiento',
    description: 'Cruces sobre financiamiento',
    icon: Scale,
    section: 'titulados',
  },
  {
    path: '/titulados/brechas-competencias',
    label: 'Brechas de competencias',
    description: 'Medias y dispersión por competencia',
    icon: BarChart3,
    section: 'titulados',
  },
  {
    path: '/titulados/cruces-exportacion',
    label: 'Cruces y exportación',
    description: 'Matrices y salidas analíticas',
    icon: FileChartColumn,
    section: 'titulados',
  },
  {
    path: '/titulados/simulacion-escenarios',
    label: 'Simulación de escenarios',
    description: 'Escenarios de proyección',
    icon: Network,
    section: 'titulados',
  },
  {
    path: '/empleadores/resumen-contratacion',
    label: 'Resumen y contratación',
    description: 'Indicadores de empleadores',
    icon: LayoutDashboard,
    section: 'empleadores',
  },
  {
    path: '/empleadores/valoracion-carrera',
    label: 'Valoración de la Carrera',
    description: 'Valoración por dimensiones, segmentos y relaciones',
    icon: Scale,
    section: 'empleadores',
  },
  {
    path: '/empleadores/brechas-competencias',
    label: 'Brechas de competencias',
    description: 'Valoración de competencias',
    icon: BarChart3,
    section: 'empleadores',
  },
  {
    path: '/empleadores/cruces-exportacion',
    label: 'Cruces y exportar',
    description: 'Matrices y salidas analíticas',
    icon: FileChartColumn,
    section: 'empleadores',
  },
  {
    path: '/comparacion/titulados-empleadores',
    label: 'Titulados vs. empleadores',
    description: 'Valoración de competencias en ambas encuestas',
    icon: GitCompareArrows,
    section: 'comparacion',
  },
]

export const sectionLabels = {
  general: 'Datos',
  titulados: 'Titulados',
  empleadores: 'Empleadores',
  comparacion: 'Cruce entre encuestas',
} as const

export function findNavigationItem(pathname: string) {
  return navigation.find((item) => item.path === pathname)
}

export function navigate(path: string) {
  if (window.location.pathname === path) return
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

