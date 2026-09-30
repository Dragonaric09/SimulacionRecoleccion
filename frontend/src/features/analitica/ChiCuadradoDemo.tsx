import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { ejecutarChiCuadrado, type ResultadoChiCuadrado } from './api'

const TABLA_EJEMPLO = [
  [50, 10],
  [10, 50],
]

export function ChiCuadradoDemo() {
  const [resultado, setResultado] = useState<ResultadoChiCuadrado | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  async function ejecutar() {
    setCargando(true)
    setError(null)
    try {
      setResultado(await ejecutarChiCuadrado(TABLA_EJEMPLO, 0.05))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCargando(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prueba de independencia χ²</CardTitle>
        <CardDescription>Tabla de contingencia 2×2 de ejemplo, α = 0.05</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableBody>
            {TABLA_EJEMPLO.map((fila, i) => (
              <TableRow key={i}>
                {fila.map((valor, j) => (
                  <TableCell key={j} className="text-center">{valor}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Button onClick={ejecutar} disabled={cargando}>
          {cargando ? 'Calculando…' : 'Ejecutar prueba'}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {resultado && (
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Estadístico χ²</dt>
            <dd>{resultado.estadistico.toFixed(4)}</dd>
            <dt className="text-muted-foreground">Grados de libertad</dt>
            <dd>{resultado.gradosLibertad}</dd>
            <dt className="text-muted-foreground">p-valor</dt>
            <dd>{resultado.pValor.toExponential(4)}</dd>
            <dt className="text-muted-foreground">Decisión</dt>
            <dd>{resultado.rechazaIndependencia ? 'Se rechaza H₀ (dependientes)' : 'No se rechaza H₀'}</dd>
          </dl>
        )}
      </CardContent>
    </Card>
  )
}
