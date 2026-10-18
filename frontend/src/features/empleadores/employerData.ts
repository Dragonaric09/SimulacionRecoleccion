import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DEPARTMENT_OPTIONS,
  HIRED_OPTIONS,
  HIRING_PROBABILITY_ORDER,
  ORGANIZATION_SIZE_ORDER,
  ORGANIZATION_TYPE_OPTIONS,
  SECTOR_OPTIONS,
} from './instrumento'

export const NO_ANSWER = 'Sin respuesta'

/** Filtros globales de la sección Empleadores. Cada lista vacía significa «todos». */
export type EmployerFilters = {
  organizationTypes: string[]
  organizationSizes: string[]
  sectors: string[]
  departments: string[]
  hired: string[]
  hiringProbabilities: string[]
}

export type EmployerFilterKey = keyof EmployerFilters

/** Definición de cada filtro: parámetro de la API, etiqueta y opciones en el orden del formulario. */
export const EMPLOYER_FILTERS: { key: EmployerFilterKey; param: string; label: string; options: string[] }[] = [
  { key: 'organizationTypes', param: 'organizationType', label: 'Tipo de organización', options: [...ORGANIZATION_TYPE_OPTIONS] },
  { key: 'organizationSizes', param: 'organizationSize', label: 'Tamaño', options: [...ORGANIZATION_SIZE_ORDER] },
  { key: 'sectors', param: 'sector', label: 'Rubro', options: [...SECTOR_OPTIONS, NO_ANSWER] },
  { key: 'departments', param: 'department', label: 'Departamento', options: [...DEPARTMENT_OPTIONS, NO_ANSWER] },
  { key: 'hired', param: 'hired', label: 'Contrató en los últimos 5 años', options: [...HIRED_OPTIONS, NO_ANSWER] },
  { key: 'hiringProbabilities', param: 'hiringProbability', label: 'Posibilidad de contratar', options: [...HIRING_PROBABILITY_ORDER, NO_ANSWER] },
]

export const NO_EMPLOYER_FILTERS: EmployerFilters = {
  organizationTypes: [],
  organizationSizes: [],
  sectors: [],
  departments: [],
  hired: [],
  hiringProbabilities: [],
}

export function employerFilterQuery(filters: EmployerFilters) {
  const params = new URLSearchParams()
  EMPLOYER_FILTERS.forEach(({ key, param }) => filters[key].forEach((value) => params.append(param, value)))
  const query = params.toString()
  return query ? `&${query}` : ''
}

export function hasEmployerFilters(filters: EmployerFilters) {
  return EMPLOYER_FILTERS.some(({ key }) => filters[key].length > 0)
}

/** Descripción legible de los filtros activos, para encabezados de reportes y exportaciones. */
export function describeEmployerFilters(filters: EmployerFilters) {
  return EMPLOYER_FILTERS.filter(({ key }) => filters[key].length > 0).map(({ key, label }) => ({ label, values: filters[key] }))
}

function storageKey(datasetId: string) {
  return `simulacionem.empleadoresFilters.${datasetId}`
}

function restore(saved: Partial<EmployerFilters> | null): EmployerFilters {
  if (!saved) return NO_EMPLOYER_FILTERS
  const result = { ...NO_EMPLOYER_FILTERS }
  EMPLOYER_FILTERS.forEach(({ key, options }) => {
    const values = saved[key]
    result[key] = Array.isArray(values) ? values.filter((value) => options.includes(value)) : []
  })
  return result
}

/** Filtros guardados del dataset, leídos de forma síncrona (el reporte PDF los necesita en el primer render). */
export function loadEmployerFilters(datasetId?: string): EmployerFilters {
  if (!datasetId) return NO_EMPLOYER_FILTERS
  try {
    return restore(JSON.parse(localStorage.getItem(storageKey(datasetId)) ?? 'null') as Partial<EmployerFilters> | null)
  } catch {
    return NO_EMPLOYER_FILTERS
  }
}

/** Estado de filtros por dataset. La persistencia local es solo una comodidad: si falla, la pantalla sigue funcionando. */
export function useEmployerFilters(datasetId?: string) {
  const [filters, setFilters] = useState<EmployerFilters>(NO_EMPLOYER_FILTERS)

  useEffect(() => {
    if (!datasetId) {
      setFilters(NO_EMPLOYER_FILTERS)
      return
    }
    try {
      setFilters(restore(JSON.parse(localStorage.getItem(storageKey(datasetId)) ?? 'null') as Partial<EmployerFilters> | null))
    } catch {
      setFilters(NO_EMPLOYER_FILTERS)
    }
  }, [datasetId])

  /* Se guarda solo al cambiar un filtro: guardar en un efecto escribiría el estado anterior en el dataset nuevo. */
  const commit = useCallback((next: EmployerFilters) => {
    setFilters(next)
    if (!datasetId) return
    try {
      localStorage.setItem(storageKey(datasetId), JSON.stringify(next))
    } catch {
      /* sin almacenamiento disponible: los filtros solo viven en la pantalla */
    }
  }, [datasetId])

  const toggle = useCallback((key: EmployerFilterKey, value: string) => {
    const current = filters
    commit({
      ...current,
      [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value],
    })
  }, [filters, commit])

  const clear = useCallback((key?: EmployerFilterKey) => {
    commit(key ? { ...filters, [key]: [] } : NO_EMPLOYER_FILTERS)
  }, [filters, commit])

  const query = useMemo(() => employerFilterQuery(filters), [filters])
  return { filters, toggle, clear, query, active: hasEmployerFilters(filters) }
}

/** Descarga un CSV con BOM UTF-8 para que Excel respete tildes. */
export function downloadCsv(fileName: string, rows: (string | number)[][]) {
  const escape = (value: string | number) => {
    const text = String(value)
    return /[";,\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
  }
  const content = '﻿' + rows.map((row) => row.map(escape).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
