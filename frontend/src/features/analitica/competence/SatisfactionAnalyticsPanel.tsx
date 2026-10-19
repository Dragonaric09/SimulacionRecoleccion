import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AnalyticsSummary, CategoryDistribution } from '../api'
import { TituladosCrossMatrix } from '../shared/TituladosCrossMatrix'
import { SatisfactionPanel } from './SatisfactionPanels'

type Indicator = {
  key: string
  label: string
  population: string
  scale: 'satisfaction' | 'agreement'
}

const INDICATORS: Indicator[] = [
  {
    key: 'satisfaccion_formacion',
    label: 'Valoración global de la formación',
    population: 'titulados con respuesta válida',
    scale: 'agreement',
  },
  {
    key: 'concordancia_formacion_requerimientos',
    label: 'Concordancia con los requerimientos del mercado',
    population: 'titulados con respuesta válida',
    scale: 'agreement',
  },
  {
    key: 'pertinencia_trabajo_formacion',
    label: 'Pertinencia del trabajo respecto a la formación',
    population: 'titulados que respondieron sobre su trabajo actual',
    scale: 'agreement',
  },
]

/**
 * Diagnóstico de satisfacción basado en las distribuciones ordinales y en sus relaciones.
 * No promedia escalas: las respuestas se muestran en sus categorías originales y las matrices
 * solicitan la prueba inferencial que corresponde a cada cruce.
 */
export function SatisfactionAnalyticsPanel({
  summary,
  datasetId,
  filterQuery = '',
}: {
  summary: AnalyticsSummary | null
  datasetId?: string
  filterQuery?: string
}) {
  if (!summary) return <SatisfactionPanel summary={summary} />

  const readings = INDICATORS.map((indicator) => ({
    ...indicator,
    profile: responseProfile(summary.distributions[indicator.key], indicator.scale),
  }))

  return (
    <div className="space-y-5">
      <section
        className="grid gap-4 lg:grid-cols-3"
        aria-label="Señales principales de satisfacción"
      >
        {readings.map(({ key, label, population, profile }) => (
          <ResponseSignal key={key} label={label} population={population} profile={profile} />
        ))}
      </section>

      <Card className="rounded-xl border border-border-line shadow-sm">
        <CardHeader>
          <CardTitle className="title-card">Lectura para la toma de decisiones</CardTitle>
          <CardDescription>
            Prioriza la proporción de respuestas desfavorables y favorables. No se combinan las
            escalas en un promedio artificial ni se interpreta asociación como causalidad.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          {readings.map(({ key, label, profile }) => (
            <DecisionReading key={key} label={label} profile={profile} />
          ))}
        </CardContent>
      </Card>

      <section aria-label="Distribuciones de satisfacción y pertinencia">
        <SatisfactionPanel summary={summary} />
      </section>

      {datasetId && (
        <section
          className="grid gap-5 xl:grid-cols-2"
          aria-label="Relaciones analíticas de satisfacción"
        >
          <TituladosCrossMatrix
            datasetId={datasetId}
            filterQuery={filterQuery}
            rowField="satisfaccion_formacion"
            columnField="concordancia_formacion_requerimientos"
            title="Valoración global y concordancia con el mercado"
            description="Cruza dos escalas ordinales. La matriz muestra el perfil de concordancia dentro de cada nivel de satisfacción y reporta rho de Spearman."
          />
          <TituladosCrossMatrix
            datasetId={datasetId}
            filterQuery={filterQuery}
            rowField="situacion_laboral_actual"
            columnField="satisfaccion_formacion"
            title="Valoración global según situación laboral"
            description="Compara la distribución ordinal de satisfacción entre situaciones laborales. La prueba de Kruskal–Wallis indica si las diferencias entre grupos son distinguibles."
          />
          <div className="xl:col-span-2">
            <TituladosCrossMatrix
              datasetId={datasetId}
              filterQuery={filterQuery}
              rowField="satisfaccion_formacion"
              columnField="pertinencia_trabajo_formacion"
              title="Valoración global y pertinencia del trabajo"
              description="Disponible para quienes respondieron sobre su trabajo actual. Permite comprobar con rho de Spearman si ambas valoraciones ordinales se mueven conjuntamente."
            />
          </div>
        </section>
      )}
    </div>
  )
}

function ResponseSignal({
  label,
  population,
  profile,
}: {
  label: string
  population: string
  profile: ResponseProfile | null
}) {
  const favorable = profile?.favorable ?? null
  return (
    <Card className="rounded-xl border border-border-line shadow-sm">
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{formatPercentage(favorable)}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs text-ink-600">
        <p>respuestas favorables · n = {profile?.total ?? 0}</p>
        <p>{population}</p>
        {profile && (
          <div
            className="flex h-2 overflow-hidden rounded-full bg-surface-container-low"
            aria-hidden
          >
            <div className="bg-[#ed552f]" style={{ width: `${profile.unfavorable}%` }} />
            <div className="bg-[#f3a487]" style={{ width: `${profile.intermediate}%` }} />
            <div className="bg-[#1f6fb5]" style={{ width: `${profile.favorable}%` }} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DecisionReading({ label, profile }: { label: string; profile: ResponseProfile | null }) {
  if (!profile) {
    return (
      <div className="rounded-lg border border-border-line bg-surface-container-low p-4">
        <p className="font-semibold text-ink-900">{label}</p>
        <p className="mt-2 text-sm text-ink-600">
          No hay respuestas con niveles reconocibles para sintetizar. Revise el detalle de la
          distribución.
        </p>
      </div>
    )
  }
  const emphasis =
    profile.unfavorable > profile.favorable
      ? 'Predomina la valoración desfavorable.'
      : profile.unfavorable >= 25
        ? 'Existe una proporción desfavorable que requiere seguimiento.'
        : 'La valoración favorable es predominante.'
  return (
    <div className="rounded-lg border border-border-line bg-surface-container-low p-4">
      <p className="font-semibold text-ink-900">{label}</p>
      <p className="mt-2 text-sm text-ink-700">{emphasis}</p>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-ink-600">Desfavorable</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-[#c44b2d]">
            {formatPercentage(profile.unfavorable)}
          </dd>
        </div>
        <div>
          <dt className="text-ink-600">Intermedia</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-ink-900">
            {formatPercentage(profile.intermediate)}
          </dd>
        </div>
        <div>
          <dt className="text-ink-600">Favorable</dt>
          <dd className="mt-0.5 font-semibold tabular-nums text-[#1f6fb5]">
            {formatPercentage(profile.favorable)}
          </dd>
        </div>
      </dl>
    </div>
  )
}

type ResponseProfile = {
  favorable: number
  intermediate: number
  unfavorable: number
  total: number
}

function responseProfile(
  distribution: CategoryDistribution | undefined,
  scale: Indicator['scale'],
): ResponseProfile | null {
  const total = distribution?.validCount ?? 0
  if (!total) return null
  let favorable = 0
  let intermediate = 0
  let unfavorable = 0
  let recognized = 0
  for (const [label, count] of Object.entries(distribution?.counts ?? {})) {
    const direction = responseDirection(label, scale)
    if (direction === null) continue
    recognized += count
    if (direction === 'favorable') favorable += count
    else if (direction === 'unfavorable') unfavorable += count
    else intermediate += count
  }
  if (!recognized) return null
  return {
    favorable: (favorable * 100) / total,
    intermediate: (intermediate * 100) / total,
    unfavorable: (unfavorable * 100) / total,
    total,
  }
}

function responseDirection(label: string, scale: Indicator['scale']) {
  const normalized = label
    .toLocaleLowerCase('es-BO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  if (scale === 'satisfaction') {
    if (normalized.includes('insatisfecho')) return 'unfavorable'
    if (normalized.includes('algo') && normalized.includes('satisfecho')) return 'intermediate'
    if (normalized.includes('satisfecho')) return 'favorable'
    return null
  }
  if (normalized.includes('totalmente') && normalized.includes('desacuerdo')) return 'unfavorable'
  if (normalized.includes('desacuerdo')) return 'unfavorable'
  if (normalized.includes('totalmente') && normalized.includes('acuerdo')) return 'favorable'
  if (normalized.includes('acuerdo')) return 'favorable'
  return null
}

function formatPercentage(value: number | null) {
  return value === null ? '—' : `${value.toFixed(1).replace('.', ',')} %`
}
