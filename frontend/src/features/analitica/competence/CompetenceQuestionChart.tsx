import { ChartVariantSelector, useChartVariant } from '@/components/analytics/charts'
import { ChartCardActions } from '@/components/analytics/ChartCard'
import type { Competence } from '../shared/analyticsTypes'
import { CompetenceMatrix } from './CompetenceMatrix'
import { CompetenceRadar } from './CompetenceRadar'
import { CompetenceStatsTable } from './CompetenceStatsTable'

type CompetenceChartVariant = 'heatmap' | 'radar' | 'table'

export function CompetenceQuestionChart({
  items,
  group,
  storageKey,
  showSelector = true,
  theme = 'titulados',
  variants: allowedVariants,
  onExportCsv,
  help,
}: {
  items: Competence[]
  group: string
  storageKey?: string
  showSelector?: boolean
  theme?: 'titulados' | 'empleadores'
  variants?: CompetenceChartVariant[]
  onExportCsv?: () => void
  help?: string
}) {
  const variants: readonly CompetenceChartVariant[] = allowedVariants ?? [
    'heatmap',
    'radar',
    'table',
  ]
  const [variant, setVariant] = useChartVariant(storageKey, 'heatmap', variants)
  const labels: Record<CompetenceChartVariant, string> = {
    heatmap: 'Mapa de calor',
    radar: 'Radar',
    table: 'Tabla',
  }
  const selector = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {showSelector && (
        <ChartVariantSelector
          value={variant}
          options={variants}
          labels={labels}
          onChange={setVariant}
        />
      )}
      <ChartCardActions title={`Competencias: ${group}`} help={help} onExportCsv={onExportCsv} />
    </div>
  )
  return (
    <div className="chart-variant-root">
      <div className="chart-variant-stage chart-variant-stage-full">
        {variant === 'heatmap' ? (
          <CompetenceMatrix
            items={items}
            className="w-full"
            actions={selector}
            theme={theme}
            showNotObserved={theme === 'empleadores'}
          />
        ) : variant === 'radar' ? (
          <CompetenceRadar
            items={items}
            className="w-full"
            actions={selector}
            color={theme === 'empleadores' ? '#14A39A' : '#1f6fb5'}
          />
        ) : (
          <CompetenceStatsTable items={items} group={group} actions={selector} theme={theme} />
        )}
      </div>
    </div>
  )
}
