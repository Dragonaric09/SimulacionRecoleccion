import { ChartVariantSelector, useChartVariant } from '@/components/analytics/charts'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
      {help && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Qué mide el perfil de competencias: ${group}`}
              >
                <Info />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs text-left">{help}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {onExportCsv && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Exportar CSV: ${group}`}
          onClick={onExportCsv}
        >
          <Download />
        </Button>
      )}
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
