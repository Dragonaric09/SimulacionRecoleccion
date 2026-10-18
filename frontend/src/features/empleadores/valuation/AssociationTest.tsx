import { Badge } from '@/components/analytics/Badge'
import { formatCount, formatDecimal } from '../dashboard/dashboardFormat'
import type { AssociationResult } from './valuationTypes'
import { formatP } from './valuationFormat'

function formatStatistic(result: AssociationResult) {
  if (result.estadistico === null) return null
  const digits = result.codigo === 'MANN_WHITNEY' ? 1 : result.codigo === 'SPEARMAN' ? 3 : 2
  const df = result.gradosLibertad !== null && result.codigo !== 'SPEARMAN' ? ` (gl = ${result.gradosLibertad})` : ''
  return `${result.estadisticoNombre ?? 'Estadístico'} = ${formatDecimal(result.estadistico, digits)}${df}`
}

/** Línea corta para tablas y encabezados: prueba, p y tamaño del efecto. */
export function AssociationBadge({ result }: { result: AssociationResult | null }) {
  if (!result) return null
  if (!result.aplicable) {
    return <span className="caption-meta text-ink-500" title={result.motivo}>Prueba no aplicable (n = {formatCount(result.n)})</span>
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-ink-700" title={result.motivo}>
      <span className="font-semibold">{result.nombrePrueba}</span>
      <span>· p = {formatP(result.pValor)}</span>
      {result.efecto !== null && result.efectoNombre !== result.nombrePrueba && <span>· {result.efectoNombre} = {formatDecimal(result.efecto, 2)}</span>}
      {result.efecto !== null && result.efectoNombre === result.nombrePrueba && <span>· ρ = {formatDecimal(Math.abs(result.efecto) < 0.005 ? 0 : result.efecto, 2)}</span>}
      <Badge tone={result.significativo ? 'success' : 'neutral'}>
        {result.significativo ? 'Diferencia significativa' : 'Sin diferencia significativa'}
      </Badge>
    </span>
  )
}

/**
 * Ficha completa de la prueba: nivel de medición de cada variable, prueba elegida y por qué, cómo se obtuvo el
 * p-valor, tamaño del efecto y las pruebas descartadas.
 */
export function AssociationTestCard({ result, rowLabel, columnLabel }: {
  result: AssociationResult
  rowLabel: string
  columnLabel: string
}) {
  const statistic = formatStatistic(result)
  return (
    <section className="association-test rounded-lg border border-border-line bg-white p-4 text-sm shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="title-card">{result.aplicable ? result.nombrePrueba : 'Prueba no aplicable'}</h3>
        {result.aplicable && (
          <Badge tone={result.significativo ? 'success' : 'neutral'}>
            {result.significativo ? `Asociación significativa (α = ${formatDecimal(result.alfa, 2)})` : `Sin asociación significativa (α = ${formatDecimal(result.alfa, 2)})`}
          </Badge>
        )}
      </div>
      <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label={rowLabel} value={result.nivelFila} />
        <Fact label={columnLabel} value={result.nivelColumna} />
        <Fact label="Respuestas en el cruce" value={`n = ${formatCount(result.n)}`} />
        {result.aplicable && <Fact label="p-valor" value={`${formatP(result.pValor)}${result.metodoP ? ` · ${result.metodoP}` : ''}`} />}
        {statistic && <Fact label="Estadístico" value={statistic} />}
        {result.efecto !== null && (
          <Fact label="Tamaño del efecto" value={`${result.efectoNombre} = ${formatDecimal(result.efecto, 3)}${result.magnitud ? ` · ${result.magnitud}` : ''}`} />
        )}
        {result.totalCeldas !== null && result.celdasEsperadasMenores5 !== null && (
          <Fact label="Celdas con esperada < 5" value={`${result.celdasEsperadasMenores5} de ${result.totalCeldas}`} />
        )}
      </dl>
      <p className="mt-3 text-ink-700"><span className="font-semibold">Por qué esta prueba: </span>{result.motivo}</p>
      {result.descartadas.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ink-600">
          {result.descartadas.map((reason) => <li key={reason}>{reason}</li>)}
        </ul>
      )}
    </section>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="caption-meta text-ink-500">{label}</dt>
      <dd className="font-medium text-ink-900">{value}</dd>
    </div>
  )
}
