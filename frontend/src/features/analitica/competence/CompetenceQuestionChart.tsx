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
  layout = 'switcher',
  theme = 'titulados',
  variants: allowedVariants,
  onExportCsv,
  help,
}: {
  items: Competence[]
  group: string
  storageKey?: string
  showSelector?: boolean
  layout?: 'switcher' | 'dashboard'
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
  if (layout === 'dashboard') {
    return (
      <div className="space-y-6">
        <CompetenceMatrix
          items={items}
          className="w-full"
          actions={
            <ChartCardActions
              title={`Competencias: ${group}`}
              help={help}
              onExportCsv={onExportCsv}
            />
          }
          theme={theme}
          showNotObserved={theme === 'empleadores'}
        />
        <div className="grid items-start gap-6 lg:grid-cols-12">
          <CompetenceStatsTable
            items={items}
            group={group}
            className="lg:col-span-7"
            theme={theme}
            actions={
              <ChartCardActions
                title={`Estadísticos por competencia: ${group}`}
                help="La tabla presenta la media, mediana y dispersión de cada competencia sobre las respuestas válidas. Sirve para contrastar valores exactos que el radar resume visualmente."
              />
            }
          />
          <CompetenceRadar
            items={items}
            className="lg:col-span-5"
            actions={
              <ChartCardActions
                title={`Perfil de medias: ${group}`}
                help="Cada eje representa una competencia y su distancia al centro indica la media observada en la escala de 1 a 5. El radar permite comparar el perfil relativo entre competencias; no representa frecuencias ni una prueba estadística."
              />
            }
            color={theme === 'empleadores' ? '#14A39A' : '#1f6fb5'}
          />
        </div>
      </div>
    )
  }
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
