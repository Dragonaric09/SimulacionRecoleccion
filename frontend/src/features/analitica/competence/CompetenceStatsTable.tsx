import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AnalyticsTableCard } from '@/components/analytics/AnalyticsTableCard'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Competence } from '../shared/analyticsTypes'
import { formatDecimal } from '../shared/analyticsFormatters'
import { groupLabel } from './competenceHelpers'

export function CompetenceStatsTable({
  items,
  group,
  actions,
  theme = 'titulados',
}: {
  items: Competence[]
  group: string
  actions?: ReactNode
  theme?: 'titulados' | 'empleadores'
}) {
  const globalAverage = items.length
    ? items.reduce((sum, item) => sum + item.average, 0) / items.length
    : 0
  const averageClass = theme === 'empleadores' ? 'text-[#14A39A]' : 'text-titulados'
  return (
    <AnalyticsTableCard
      title={`Estadísticos por competencia ${groupLabel(group).toLowerCase()}`}
      description={`Ordenados descendentemente por media · ${groupLabel(group)} · n = ${items[0]?.validCount ?? 0}`}
      actions={
        <div className="flex flex-wrap items-center justify-end gap-2">
          {actions}
          <FormulaPopover />
        </div>
      }
    >
      <div className="overflow-x-auto">
        <Table className="min-w-[760px] text-sm">
          <TableHeader>
            <TableRow className="bg-surface-container-low text-xs text-ink-600">
              <TableHead className="rounded-l-lg p-3 text-left">Competencia / Disciplina</TableHead>
              <TableHead className="p-3 text-right">
                n<br />
                válido
              </TableHead>
              <TableHead className="p-3 text-right">Media</TableHead>
              <TableHead className="p-3 text-right">Desv. estándar</TableHead>
              <TableHead className="p-3 text-right">
                Mediana
                <br />
                (Me)
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.code} className="border-b border-surface-container-high">
                <TableCell className="p-3 font-medium text-ink-900">{item.name}</TableCell>
                <TableCell className="tabular-nums p-3 text-right">{item.validCount}</TableCell>
                <TableCell
                  className={`tabular-nums p-3 text-right font-semibold ${item.average < 2.5 ? 'text-red-600' : averageClass}`}
                >
                  {formatDecimal(item.average)}
                </TableCell>
                <TableCell className="tabular-nums p-3 text-right">
                  {item.standardDeviation == null || item.validCount < 2
                    ? 'n/d'
                    : formatDecimal(item.standardDeviation)}
                </TableCell>
                <TableCell className="tabular-nums p-3 text-right">
                  {formatDecimal(item.median)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4 flex flex-col justify-between gap-3 rounded-lg bg-surface-container-low p-3 text-xs text-ink-600 sm:flex-row">
        <strong className="whitespace-nowrap text-ink-900">
          Media global {groupLabel(group)}: {formatDecimal(globalAverage)}
        </strong>
      </div>
    </AnalyticsTableCard>
  )
}

function FormulaPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Ver fórmulas estadísticas">
          Σ Ver fórmulas estadísticas
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 text-sm">
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-ink-900">Cómo se calculan</p>
            <p className="text-xs text-ink-600">
              Los estadísticos se calculan por competencia usando únicamente respuestas numéricas
              válidas.
            </p>
          </div>
          <dl className="space-y-2 text-xs text-ink-700">
            <div>
              <dt className="font-semibold">n válido</dt>
              <dd>Respuestas con nivel numérico del 1 al 5.</dd>
            </div>
            <div>
              <dt className="font-semibold">Media</dt>
              <dd>Suma de los niveles dividida entre n válido.</dd>
            </div>
            <div>
              <dt className="font-semibold">Desv. estándar</dt>
              <dd>
                Desviación estándar muestral; se muestra n/d cuando hay menos de 2 respuestas.
              </dd>
            </div>
            <div>
              <dt className="font-semibold">Mediana</dt>
              <dd>Valor central de las respuestas ordenadas.</dd>
            </div>
            <div>
              <dt className="font-semibold">No observado</dt>
              <dd>Se excluye de todos estos cálculos.</dd>
            </div>
          </dl>
        </div>
      </PopoverContent>
    </Popover>
  )
}
import type { ReactNode } from 'react'
