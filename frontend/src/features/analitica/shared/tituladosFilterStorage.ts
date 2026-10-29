import { useCallback, useState } from 'react'

/**
 * Filtros de titulados guardados por dataset. La barra de filtros los escribe al cambiar; las páginas los leen
 * aquí de forma síncrona, para que la primera consulta después de recargar ya salga filtrada. Antes cada página
 * empezaba con «sin filtros» y la barra los aplicaba después: durante esa primera carga la barra mostraba el
 * filtro, pero los datos venían sin filtrar.
 */
export function tituladosFilterStorageKey(datasetId: string) {
  return `simulacionem.tituladosFilters.${datasetId}`
}

export function loadTituladosFilterQuery(datasetId?: string) {
  if (!datasetId) return ''
  try {
    return localStorage.getItem(tituladosFilterStorageKey(datasetId)) ?? ''
  } catch {
    return ''
  }
}

export function saveTituladosFilterQuery(datasetId: string, query: string) {
  try {
    localStorage.setItem(tituladosFilterStorageKey(datasetId), query)
  } catch {
    /* sin almacenamiento: los filtros solo viven en la pantalla */
  }
}

/** Consulta de filtros de la página: parte del valor guardado del dataset activo y cambia con la barra. */
export function useTituladosFilterQuery(datasetId?: string) {
  const [state, setState] = useState(() => ({ id: datasetId, query: loadTituladosFilterQuery(datasetId) }))
  // Al cambiar de dataset se usan sus propios filtros guardados, sin pasar por un render sin filtrar.
  const query = state.id === datasetId ? state.query : loadTituladosFilterQuery(datasetId)
  const setQuery = useCallback((next: string) => setState({ id: datasetId, query: next }), [datasetId])
  return [query, setQuery] as const
}
