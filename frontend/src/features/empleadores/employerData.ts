import { useCallback, useEffect, useMemo, useState } from 'react'

/** Filtros globales de la sección Empleadores: tipo y tamaño de la organización. */
export type EmployerFilters = { organizationTypes: string[]; organizationSizes: string[] }

export const NO_EMPLOYER_FILTERS: EmployerFilters = { organizationTypes: [], organizationSizes: [] }

export function employerFilterQuery(filters: EmployerFilters) {
  const params = new URLSearchParams()
  filters.organizationTypes.forEach((value) => params.append('organizationType', value))
  filters.organizationSizes.forEach((value) => params.append('organizationSize', value))
  const query = params.toString()
  return query ? `&${query}` : ''
}

export function hasEmployerFilters(filters: EmployerFilters) {
  return filters.organizationTypes.length > 0 || filters.organizationSizes.length > 0
}

function storageKey(datasetId: string) {
  return `simulacionem.empleadoresFilters.${datasetId}`
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
      const saved = JSON.parse(localStorage.getItem(storageKey(datasetId)) ?? 'null') as Partial<EmployerFilters> | null
      setFilters(saved ? { organizationTypes: saved.organizationTypes ?? [], organizationSizes: saved.organizationSizes ?? [] } : NO_EMPLOYER_FILTERS)
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

  const toggle = useCallback((key: keyof EmployerFilters, value: string) => {
    const current = filters
    commit({
      ...current,
      [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value],
    })
  }, [filters, commit])

  const clear = useCallback((key?: keyof EmployerFilters) => {
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
