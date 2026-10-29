import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'

/**
 * Estado que sobrevive a recargar la página (localStorage). Se lee de forma síncrona en el primer render, así
 * que la pantalla consulta desde el inicio con lo que el usuario había elegido.
 *
 * `isValid` descarta valores guardados que ya no corresponden (por ejemplo, una variable que dejó de existir).
 * Si el almacenamiento no está disponible, se comporta como un estado normal.
 */
export function usePersistentState<T>(
  key: string,
  initial: T,
  isValid: (value: unknown) => value is T = (value): value is T => value !== undefined && value !== null,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => read(key, initial, isValid))

  // Una pantalla compartida por dos secciones cambia de clave al cambiar de sección.
  const [currentKey, setCurrentKey] = useState(key)
  if (currentKey !== key) {
    setCurrentKey(key)
    setValue(read(key, initial, isValid))
  }

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* sin almacenamiento: el valor solo vive en la pantalla */
    }
  }, [key, value])

  const set = useCallback<Dispatch<SetStateAction<T>>>((next) => setValue(next), [])
  return [value, set]
}

function read<T>(key: string, initial: T, isValid: (value: unknown) => value is T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return initial
    const parsed: unknown = JSON.parse(raw)
    return isValid(parsed) ? parsed : initial
  } catch {
    return initial
  }
}
