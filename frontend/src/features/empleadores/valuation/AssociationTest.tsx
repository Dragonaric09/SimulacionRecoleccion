import { Badge } from '@/components/analytics/Badge'
import { formatCount, formatDecimal } from '../dashboard/dashboardFormat'
import type { AssociationResult } from './valuationTypes'
import { formatP } from './valuationFormat'
import { TapTooltip } from '@/components/analytics/TapTooltip'

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
    return (
      <TapTooltip content={result.motivo}>
        <button type="button" className="caption-meta cursor-help text-left text-ink-500 underline decoration-dotted underline-offset-2">
          Prueba no aplicable (n = {formatCount(result.n)})
        </button>
      </TapTooltip>
    )
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs text-ink-700">
      <TapTooltip content={result.motivo}>
        <button type="button" className="cursor-help font-semibold underline decoration-dotted underline-offset-2">{result.nombrePrueba}</button>
      </TapTooltip>
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

export function MultipleResponseTestsCard({ tests }: {
  tests: { option: string; test: AssociationResult; holmPValue: number | null; significantAfterCorrection: boolean }[]
}) {
  const applicable = tests.filter((item) => item.holmPValue !== null)
  return (
    <section className="association-test rounded-lg border border-border-line bg-white p-4 text-sm shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="title-card">Asociación por opción · ajuste de Holm</h3>
          <p className="mt-1 text-xs text-ink-600">Cada canal se contrasta como seleccionado / no seleccionado. Los p-valores se ajustan por las opciones evaluadas.</p>
        </div>
        <Badge tone="neutral">{applicable.length} de {tests.length} aplicables</Badge>
      </div>
      {applicable.length ? (
        <ul className="mt-3 divide-y divide-border-line">
          {tests.map(({ option, test, holmPValue, significantAfterCorrection }) => (
            <li key={option} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
              <div className="min-w-0">
                <p className="font-medium text-ink-900">{option}</p>
                <p className="text-xs text-ink-600">{test.nombrePrueba} · n = {formatCount(test.n)}</p>
              </div>
              {holmPValue !== null ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs tabular-nums text-ink-700">p ajustado = {formatP(holmPValue)}</span>
                  <Badge tone={significantAfterCorrection ? 'success' : 'neutral'}>
                    {significantAfterCorrection ? 'Significativa' : 'No significativa'}
                  </Badge>
                </div>
              ) : (
                <TapTooltip content={test.motivo}>
                  <span className="cursor-help text-xs text-ink-500 underline decoration-dotted">Prueba no aplicable</span>
                </TapTooltip>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 rounded-md bg-surface-container-low p-3 text-sm text-ink-700">
          No hay pruebas por opción aplicables con esta base. Los conteos y porcentajes descriptivos sí se muestran.
        </p>
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
