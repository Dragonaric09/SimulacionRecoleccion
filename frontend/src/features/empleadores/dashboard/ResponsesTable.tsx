import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from 'cn'
import { formatCount, formatDateTime, formatDecimal } from './dashboardFormat'
import { probabilityLabel, SIZE_SHORT_LABEL } from './labels'
import type { ResponsePage, ResponseRow } from './dashboardTypes'

export type SortKey = 'fecha' | 'tipo' | 'tamano' | 'departamento' | 'rubro' | 'contrata' | 'probabilidad' | 'nivel' | 'competencias' | 'acuerdo'
export type SortState = { key: SortKey; dir: 'asc' | 'desc' }

const PAGE_SIZES = [10, 25, 50, 100] as const

type Column = { key: SortKey; label: string; align?: 'left' | 'right'; render: (row: ResponseRow) => string }

const COLUMNS: Column[] = [
  { key: 'fecha', label: 'Fecha de respuesta', render: (row) => formatDateTime(row.submittedAt) },
  { key: 'tipo', label: 'Tipo', render: (row) => row.organizationType ?? '—' },
  { key: 'tamano', label: 'Tamaño', render: (row) => (row.organizationSize ? SIZE_SHORT_LABEL[row.organizationSize] ?? row.organizationSize : '—') },
  { key: 'departamento', label: 'Departamento', render: (row) => row.department ?? '—' },
  { key: 'rubro', label: 'Rubro', render: (row) => row.sector ?? '—' },
  { key: 'contrata', label: 'Contrató (5 años)', render: (row) => row.hired },
  { key: 'probabilidad', label: 'Probabilidad', render: (row) => (row.hiringProbability ? probabilityLabel(row.hiringProbability) : '—') },
  { key: 'nivel', label: 'Nivel demandado', render: (row) => row.demandedLevel ?? '—' },
  {
    key: 'competencias',
    label: 'Competencias (media)',
    align: 'right',
    render: (row) => (row.competenceAverage === null ? '—' : formatDecimal(row.competenceAverage, 2)),
  },
  { key: 'acuerdo', label: 'Valoraciones de acuerdo', align: 'right', render: (row) => `${row.fullAgreement} de 18` },
]

/** Tabla detallada. Ordenación y paginación ocurren en el servidor: la página nunca carga todas las filas. */
export function ResponsesTable({ data, loading, sort, onSort, page, pageSize, onPage, onPageSize }: {
  data: ResponsePage | null
  loading: boolean
  sort: SortState
  onSort: (key: SortKey) => void
  page: number
  pageSize: number
  onPage: (page: number) => void
  onPageSize: (size: number) => void
}) {
  const total = data?.total ?? 0
  const from = total === 0 ? 0 : page * pageSize + 1
  const to = Math.min(total, (page + 1) * pageSize)
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  return (
    <Card className="gap-0 border border-border-line py-0 shadow-sm">
      <CardHeader className="flex flex-col gap-3 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="title-card">Respuestas detalladas</CardTitle>
          <CardDescription className="caption-meta">
            Campos no personales. Orden y paginación en el servidor, para datasets de cualquier tamaño.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-600">
          Filas por página
          <Select value={String(pageSize)} onValueChange={(value) => onPageSize(Number(value))}>
            <SelectTrigger size="sm" aria-label="Filas por página">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {PAGE_SIZES.map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0 pt-4">
        <div className="overflow-x-auto">
          <Table className="min-w-[1080px] text-sm">
            <TableHeader>
              <TableRow className="bg-surface-container-low/60 text-xs text-ink-600">
                {COLUMNS.map((column) => {
                  const active = sort.key === column.key
                  const ariaSort = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'
                  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
                  return (
                    <TableHead
                      key={column.key}
                      aria-sort={ariaSort}
                      className={cn('px-4 py-2.5 font-medium', column.align === 'right' ? 'text-right' : 'text-left')}
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onSort(column.key)}
                        className={cn('h-auto gap-1 px-0 py-0 font-medium hover:bg-transparent hover:text-ink-900', active && 'text-ink-900')}
                      >
                        {column.label}
                        <Icon className="size-3.5 opacity-70" aria-hidden="true" />
                      </Button>
                    </TableHead>
                  )
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.rows ?? []).map((row) => (
                <TableRow key={row.id} className="border-t border-slate-100 hover:bg-surface-container-low/50">
                  {COLUMNS.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn('px-4 py-2.5 text-ink-900', column.align === 'right' ? 'text-right tabular-nums' : 'text-left')}
                    >
                      {column.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {!loading && data && data.rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} className="px-4 py-8 text-center text-ink-600">
                    Ningún registro coincide con los filtros.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 text-sm sm:flex-row">
          <span className="tabular-nums text-ink-600" aria-live="polite">
            {loading && !data ? 'Cargando respuestas…' : `Mostrando ${formatCount(from)}–${formatCount(to)} de ${formatCount(total)} respuestas`}
          </span>
          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(event) => { event.preventDefault(); if (page > 0 && !loading) onPage(page - 1) }}
                  aria-disabled={page <= 0 || loading}
                  className={page <= 0 || loading ? 'pointer-events-none opacity-50' : undefined}
                  text=""
                />
              </PaginationItem>
              <PaginationItem>
                <span className="min-w-24 text-center tabular-nums text-ink-600">
                  Página {formatCount(page + 1)} de {formatCount(pageCount)}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(event) => { event.preventDefault(); if (page + 1 < pageCount && !loading) onPage(page + 1) }}
                  aria-disabled={page + 1 >= pageCount || loading}
                  className={page + 1 >= pageCount || loading ? 'pointer-events-none opacity-50' : undefined}
                  text=""
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </CardContent>
    </Card>
  )
}
