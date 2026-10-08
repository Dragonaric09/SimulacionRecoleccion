import {
  BarChart3,
  BriefcaseBusiness,
  FileChartColumn,
  GraduationCap,
  LayoutDashboard,
  Network,
  Scale,
  Upload,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavigationItem = {
  path: string
  label: string
  description: string
  icon: LucideIcon
  section: 'general' | 'titulados' | 'empleadores'
  implemented?: boolean
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
    label: 'Resumen de contratación',
    description: 'Indicadores de empleadores',
    icon: LayoutDashboard,
    section: 'empleadores',
  },
  {
    path: '/empleadores/valoracion-carrera',
    label: 'Valoración de la carrera',
    description: 'Distribución de respuestas por afirmación',
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
    label: 'Cruces y exportación',
    description: 'Matrices y salidas analíticas',
    icon: FileChartColumn,
    section: 'empleadores',
  },
]

export const sectionLabels = {
  general: 'Datos',
  titulados: 'Titulados',
  empleadores: 'Empleadores',
} as const

export function findNavigationItem(pathname: string) {
  return navigation.find((item) => item.path === pathname)
}

export function navigate(path: string) {
  if (window.location.pathname === path) return
  window.history.pushState({}, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

