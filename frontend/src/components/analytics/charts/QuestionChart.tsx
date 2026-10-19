/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DonutChart } from './DonutChart'
import { RankedBars } from './RankedBars'
import type { DistributionChartItem } from './chartTypes'

export type CategoricalChartVariant = 'ranked' | 'donut' | 'table'

export function useChartVariant<T extends string>(
  storageKey: string | undefined,
  defaultVariant: T,
  variants: readonly T[],
) {
  const [variant, setVariant] = useState<T>(defaultVariant)
  useEffect(() => {
    if (!storageKey) return
    const stored = window.localStorage.getItem(storageKey) as T | null
    if (stored && variants.includes(stored)) setVariant(stored)
  }, [storageKey, variants])
  const changeVariant = (next: T) => {
    setVariant(next)
    if (storageKey) window.localStorage.setItem(storageKey, next)
  }
  return [variant, changeVariant] as const
}

export function ChartVariantSelector<T extends string>({
  value,
  options,
  labels,
  onChange,
}: {
  value: T
  options: readonly T[]
  labels: Record<T, string>
  onChange: (value: T) => void
}) {
  if (options.length < 2) return null
  return (
    <div className="flex items-center justify-center gap-2 text-center text-xs text-ink-600">
      <span>Ver como:</span>
      <Select value={value} onValueChange={(next) => onChange(next as T)}>
        <SelectTrigger size="sm" aria-label="Tipo de visualización" className="bg-white text-xs text-ink-800">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {labels[option]}
          </SelectItem>
        ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function CategoricalQuestionChart({
  items,
  total,
  color = '#14A39A',
  categoryColors = [
    '#1F6FB5',
    '#14A39A',
    '#F2A33A',
    '#8E5BD0',
    '#E4572E',
    '#5C6B7A',
    '#7CB342',
    '#D9418C',
  ],
  defaultVariant = 'ranked',
  variants = ['ranked', 'donut', 'table'],
  maxItems = 15,
  labelWidth = 190,
  storageKey,
  variant: controlledVariant,
  onVariantChange,
  showSelector = true,
}: {
  items: DistributionChartItem[]
  total: number
  color?: string
  categoryColors?: readonly string[]
  defaultVariant?: CategoricalChartVariant
  variants?: CategoricalChartVariant[]
  maxItems?: number
  labelWidth?: number
  storageKey?: string
  variant?: CategoricalChartVariant
  onVariantChange?: (variant: CategoricalChartVariant) => void
  showSelector?: boolean
}) {
  const [storedVariant, changeStoredVariant] = useChartVariant(storageKey, defaultVariant, variants)
  const variant = controlledVariant ?? storedVariant
  const changeVariant = (next: CategoricalChartVariant) => {
    changeStoredVariant(next)
    onVariantChange?.(next)
  }
  const labels: Record<CategoricalChartVariant, string> = {
    ranked: 'Barras',
    donut: 'Donut',
    table: 'Tabla',
  }
  return (
    <div className="chart-variant-root space-y-3">
      {showSelector && (
        <ChartVariantSelector
          value={variant}
          options={variants}
          labels={labels}
          onChange={changeVariant}
        />
      )}
      <div className="chart-variant-stage">
        {variant === 'donut' ? (
          <DonutChart items={items} total={total} colors={categoryColors} />
        ) : variant === 'table' ? (
          <CategoricalTable items={items} total={total} />
        ) : (
          <RankedBars items={items} color={color} maxItems={maxItems} labelWidth={labelWidth} />
        )}
      </div>
    </div>
  )
}

function CategoricalTable({ items, total }: { items: DistributionChartItem[]; total: number }) {
  if (items.length === 0)
    return <p className="text-sm text-ink-600">Sin respuestas para esta pregunta.</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-line text-xs text-ink-600">
            <th className="p-2 text-left">Categoría</th>
            <th className="p-2 text-right">Conteo</th>
            <th className="p-2 text-right">Porcentaje</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.label} className="border-b border-surface-container-high">
              <td className="p-2 text-ink-900">{item.label}</td>
              <td className="p-2 text-right tabular-nums">
                {item.count} de {item.total ?? total}
              </td>
              <td className="p-2 text-right tabular-nums">
                {item.percent.toFixed(1).replace('.', ',')} %
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
