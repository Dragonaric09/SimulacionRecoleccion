import { useEffect, useState } from 'react'
import { apiRequest } from '@/api/client'

type ApiState<T> = { data: T | null; loading: boolean; error: string | null }

/**
 * Consulta de la API con descarte de respuestas obsoletas: si cambia la URL (filtro o dataset)
 * mientras llega una respuesta anterior, esa respuesta se ignora. Mientras carga se conserva la anterior.
 */
export function useEmployerApi<T>(url: string | null): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ data: null, loading: false, error: null })

  useEffect(() => {
    if (!url) {
      setState({ data: null, loading: false, error: null })
      return
    }
    let current = true
    setState((previous) => ({ ...previous, loading: true, error: null }))
    apiRequest<T>(url)
      .then((data) => {
        if (current) setState({ data, loading: false, error: null })
      })
      .catch((cause: unknown) => {
        if (current) setState({ data: null, loading: false, error: cause instanceof Error ? cause.message : String(cause) })
      })
    return () => {
      current = false
    }
  }, [url])

  return state
}
