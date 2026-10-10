const TITULADOS_PATHS = new Set([
  '/titulados/resumen',
  '/titulados/perfil-empleabilidad',
  '/titulados/formacion-continua',
  '/titulados/financiamiento',
  '/titulados/brechas-competencias',
  '/titulados/cruces-exportacion',
  '/titulados/simulacion-escenarios',
])

export function isTituladosPath(path: string) {
  return TITULADOS_PATHS.has(path)
}
