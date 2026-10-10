const EMPLEADORES_PATHS = new Set([
  '/empleadores/resumen-contratacion',
  '/empleadores/valoracion-carrera',
  '/empleadores/brechas-competencias',
  '/empleadores/cruces-exportacion',
])

export function isEmpleadoresPath(path: string) {
  return EMPLEADORES_PATHS.has(path)
}
