import { useEffect, type ReactNode } from 'react'
import { useEmployerApi } from '../useEmployerApi'
import { describeEmployerFilters, employerFilterQuery, type EmployerFilters } from '../employerData'
import { COMPETENCE_ORDER, DEMANDED_LEVEL_ORDER, HIRING_PROBABILITY_ORDER, ORGANIZATION_SIZE_ORDER, SUFFICIENCY_SCALE, VALUATION_ITEMS } from '../instrumento'
import { EMPLOYER, NEUTRAL, likertColor } from '../dashboard/chartTheme'
import { formatChange, formatCount, formatDateTime, formatDecimal, formatPercent } from '../dashboard/dashboardFormat'
import { SIZE_SHORT_LABEL, probabilityLabel } from '../dashboard/labels'
import type { DashboardCompetence, DashboardKpi, Distribution, EmployerDashboard } from '../dashboard/dashboardTypes'
import { ValuationContent } from '../EmpleadoresValoracionPage'
import { valuationUrl } from '../valuation/valuationFormat'
import type { EmployerValuation } from '../valuation/valuationTypes'

/**
 * Informe PDF de la sección Empleadores. Es un documento propio para A4 horizontal: portada con filtros y base,
 * resumen, valoración por dimensiones, competencias y anexo metodológico. Todos los gráficos son HTML/CSS de ancho
 * fijo (sin contenedores responsivos), así que el navegador los imprime tal como se ven.
 */
export function EmployerReport({ datasetId, datasetName, filters, onReady }: {
  datasetId: string
  datasetName: string
  filters: EmployerFilters
  onReady: () => void
}) {
  const query = employerFilterQuery(filters)
  const dashboard = useEmployerApi<EmployerDashboard>(`/analytics/employers/dashboard?datasetId=${encodeURIComponent(datasetId)}${query}`)
  const valuation = useEmployerApi<EmployerValuation>(valuationUrl(datasetId, query))
  const ready = Boolean((dashboard.data || dashboard.error) && (valuation.data || valuation.error))

  useEffect(() => {
    if (ready) onReady()
  }, [ready, onReady])

  const generated = new Intl.DateTimeFormat('es-BO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/La_Paz' }).format(new Date())
  const filterList = describeEmployerFilters(filters)
  const d = dashboard.data
  const v = valuation.data
  const n = d?.filteredResponses ?? 0

  return (
    <div className="employer-report" data-report-ready={ready ? 'true' : 'false'}>
      <section className="report-cover">
        <p className="report-kicker">SimulacionEM · Informe analítico</p>
        <h1 className="report-title">Encuesta a empleadores</h1>
        <p className="report-subtitle">Carrera de Ingeniería de Sistemas · Universidad Mayor de San Simón</p>
        <dl className="report-meta">
          <MetaRow label="Dataset">{datasetName}</MetaRow>
          <MetaRow label="Generado">{generated}</MetaRow>
          <MetaRow label="Respuestas analizadas">
            {d ? `${formatCount(d.filteredResponses)} de ${formatCount(d.totalResponses)} respuestas válidas` : '—'}
          </MetaRow>
          <MetaRow label="Periodo de respuestas">
            {d ? `${formatDateTime(d.firstResponse)} — ${formatDateTime(d.lastResponse)}` : '—'}
          </MetaRow>
          <MetaRow label="Filtros">
            {filterList.length === 0 ? 'Sin filtros: todas las respuestas válidas' : (
              <ul className="report-filter-list">
                {filterList.map(({ label, values }) => <li key={label}><strong>{label}:</strong> {values.join(', ')}</li>)}
              </ul>
            )}
          </MetaRow>
        </dl>
        <ol className="report-toc">
          <li>Perfil de las organizaciones y contratación</li>
          <li>Valoración de la Carrera por dimensiones</li>
          <li>Suficiencia de competencias de los titulados</li>
          <li>Anexo metodológico</li>
        </ol>
        {n > 0 && n < 5 && <p className="report-warning">Quedan pocos registros ({n}): interprete con cautela.</p>}
      </section>

      {(dashboard.error || valuation.error) && (
        <ReportSection number="!" title="Datos no disponibles">
          <p>{dashboard.error ?? valuation.error}</p>
        </ReportSection>
      )}

      {d && (
        <ReportSection number="1" title="Perfil de las organizaciones y contratación" n={n}>
          <div className="report-kpis">
            {d.kpis.map((kpi) => <KpiTile key={kpi.key} kpi={kpi} />)}
          </div>
          <div className="report-grid-3">
            <BarList title="Tipo de organización" distribution={d.organizationType} />
            <BarList title="Tamaño" distribution={d.organizationSize} relabel={(label) => SIZE_SHORT_LABEL[label] ?? label} order={ORGANIZATION_SIZE_ORDER} />
            <BarList title="Contrató titulados en los últimos 5 años" distribution={d.hiring} />
            <BarList title="Posibilidad de contratar" distribution={d.hiringProbability} relabel={probabilityLabel} order={HIRING_PROBABILITY_ORDER} />
            <BarList title="Nivel de formación que demanda" distribution={d.demandedLevel} order={DEMANDED_LEVEL_ORDER} />
            <BarList title="Medio de convocatoria" distribution={d.channel} />
            <BarList title="Rubro principal" distribution={d.sector} limit={8} />
            <BarList title="Departamento" distribution={d.department} limit={8} />
            <BarList title="Cargos que ocupan los titulados" distribution={d.positions} limit={8} />
          </div>
        </ReportSection>
      )}

      {v && v.summary.respondents > 0 && (
        <ReportSection number="2" title="Valoración de la Carrera por dimensiones" n={v.summary.respondents}>
          <ValuationContent data={v} print />
        </ReportSection>
      )}

      {d && (
        <ReportSection number="3" title="Suficiencia de competencias de los titulados" n={n}>
          <CompetenceTable competences={d.competences} />
        </ReportSection>
      )}

      <ReportSection number="A" title="Anexo metodológico">
        <Methodology valuation={v ?? null} />
      </ReportSection>
    </div>
  )
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="report-meta-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function ReportSection({ number, title, n, children }: { number: string; title: string; n?: number; children: ReactNode }) {
  return (
    <section className="report-section">
      <div className="report-section-header">
        <span className="report-section-number">{number}</span>
        <h2>{title}</h2>
        {n !== undefined && <span className="report-section-n">n = {formatCount(n)}</span>}
      </div>
      {children}
    </section>
  )
}

function formatKpi(kpi: DashboardKpi) {
  if (kpi.value === null) return '—'
  if (kpi.unit === 'count') return formatCount(kpi.value)
  if (kpi.unit === 'percent') return formatPercent(kpi.value)
  return formatDecimal(kpi.value, 2)
}

function KpiTile({ kpi }: { kpi: DashboardKpi }) {
  return (
    <div className="report-kpi">
      <p className="report-kpi-label">{kpi.label}</p>
      <p className="report-kpi-value">{formatKpi(kpi)}</p>
      <p className="report-kpi-note">
        {kpi.change === null ? 'Sin base de comparación' : `${formatChange(kpi.change, kpi.changeFormat, kpi.unit)} vs. 7 días anteriores`}
        {kpi.unit !== 'count' ? ` · Base: ${formatCount(kpi.base)} respuestas` : ''}
      </p>
    </div>
  )
}

/** Distribución como lista de barras horizontales con conteo y porcentaje. */
function BarList({ title, distribution, relabel = (label) => label, limit, order }: {
  title: string
  distribution: Distribution
  relabel?: (label: string) => string
  limit?: number
  /** Orden de la escala para variables ordinales; sin él, de mayor a menor frecuencia. */
  order?: readonly string[]
}) {
  const rank = (label: string) => (order?.indexOf(label) ?? -1) === -1 ? Number.MAX_SAFE_INTEGER : order!.indexOf(label)
  const items = [...distribution.items].sort((a, b) => (order ? rank(a.label) - rank(b.label) : b.count - a.count))
  const shown = limit ? items.slice(0, limit) : items
  const hidden = items.length - shown.length
  const max = Math.max(1, ...shown.map((item) => item.percent))
  return (
    <div className="report-card">
      <div className="report-card-header">
        <h3>{title}</h3>
        <span>n = {formatCount(distribution.answered)}</span>
      </div>
      {shown.length === 0 ? <p className="report-muted">Sin respuestas.</p> : (
        <div className="report-bars">
          {shown.map((item) => (
            <div key={item.label} className="report-bar-row">
              <span className="report-bar-label">{relabel(item.label)}</span>
              <span className="report-bar-track"><span style={{ width: `${(item.percent / max) * 100}%`, background: EMPLOYER }} /></span>
              <span className="report-bar-value">{formatCount(item.count)} · {formatPercent(item.percent, 0)}</span>
            </div>
          ))}
        </div>
      )}
      {(hidden > 0 || distribution.missing > 0) && (
        <p className="report-muted">
          {hidden > 0 ? `${hidden} categorías más con menos respuestas. ` : ''}
          {distribution.missing > 0 ? `Sin respuesta: ${formatCount(distribution.missing)}.` : ''}
        </p>
      )}
    </div>
  )
}

function CompetenceTable({ competences }: { competences: DashboardCompetence[] }) {
  const position = (name: string) => {
    const index = COMPETENCE_ORDER.indexOf(name as (typeof COMPETENCE_ORDER)[number])
    return index === -1 ? Number.MAX_SAFE_INTEGER : index
  }
  const rows = [...competences].sort((a, b) => position(a.name) - position(b.name))
  return (
    <div className="report-card">
      <table className="report-table">
        <thead>
          <tr>
            <th className="text-left">Competencia</th>
            <th>Grupo</th>
            {SUFFICIENCY_SCALE.map((level) => <th key={level.level} title={level.label}>{level.level}</th>)}
            <th>No obs.</th>
            <th>n</th>
            <th>Media</th>
            <th>D. E.</th>
            <th>Mediana</th>
            <th>% nivel 1–2</th>
            <th className="report-mean-col">Media en la escala 1–5</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.code}>
              <td className="text-left font-medium">{item.name}</td>
              <td>{item.group.toUpperCase().includes('SOFT') ? 'Soft' : 'Hard'}</td>
              {SUFFICIENCY_SCALE.map((level) => {
                const count = item.levels[String(level.level)] ?? 0
                const share = item.answered === 0 ? 0 : count / item.answered
                return (
                  <td key={level.level} className="report-heat" style={{ background: share === 0 ? '#FFFFFF' : `color-mix(in srgb, ${level.color} ${Math.round(25 + share * 75)}%, white)` }}>
                    {formatCount(count)}
                  </td>
                )
              })}
              <td style={{ color: NEUTRAL }}>{formatCount(item.notObserved)}</td>
              <td>{formatCount(item.answered)}</td>
              <td className="font-semibold">{item.average === null ? 'n/d' : formatDecimal(item.average, 2)}</td>
              <td>{item.standardDeviation === null || item.answered < 2 ? 'n/d' : formatDecimal(item.standardDeviation, 2)}</td>
              <td>{item.median === null ? 'n/d' : formatDecimal(item.median, 1)}</td>
              <td>{formatPercent(item.lowShare, 0)}</td>
              <td className="report-mean-col">
                {item.average !== null && (
                  <span className="report-mean-track">
                    <span className="report-mean-dot" style={{ left: `${((item.average - 1) / 4) * 100}%`, background: likertColor(item.average) }} />
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="report-muted">
        Niveles: {SUFFICIENCY_SCALE.map((level) => `${level.level} ${level.label}`).join(' · ')}. «No observado» no entra en n, media ni porcentajes.
      </p>
    </div>
  )
}

const DIMENSION_RULES = [
  'Nominal × nominal: χ² de Pearson si se cumple la regla de Cochran (ninguna esperada < 1 y no más del 20 % de celdas con esperada < 5); si no, prueba exacta de Fisher (2×2) o Fisher–Freeman–Halton por Monte Carlo (r×c). Efecto: V de Cramér (φ en 2×2).',
  'Ordinal × ordinal: ρ de Spearman con rangos medios para empates. p por permutación si n < 30; si no, aproximación t con n − 2 gl.',
  'Nominal de 2 grupos × ordinal: U de Mann–Whitney. p por permutación si algún grupo tiene menos de 10 casos; si no, aproximación normal con corrección por empates. Efecto: correlación biserial de rangos.',
  'Nominal de 3 o más grupos × ordinal: H de Kruskal–Wallis con corrección por empates. p por permutación si algún grupo tiene menos de 5 casos; si no, χ² con k − 1 gl. Efecto: ε².',
  'Con menos de 10 respuestas en el cruce no se aplica ninguna prueba. Las permutaciones usan 10 000 réplicas con semilla fija (resultados reproducibles). α = 0,05.',
]

function Methodology({ valuation }: { valuation: EmployerValuation | null }) {
  const statement = new Map(VALUATION_ITEMS.map((item) => [item.key, item.statement]))
  return (
    <div className="report-methodology">
      <div className="report-card">
        <h3>Escalas y exclusiones</h3>
        <ul>
          <li>Valoración: Totalmente de acuerdo = 100, Parcialmente de acuerdo = 50, Totalmente desacuerdo = 0. El puntaje de una dimensión es el promedio de sus afirmaciones respondidas.</li>
          <li>«No sabe» y las respuestas vacías no entran en puntajes ni porcentajes de la escala; se informan aparte.</li>
          <li>Competencias: escala de suficiencia de 1 (Muy insuficiente) a 5 (Muy suficiente); «No observado» queda fuera.</li>
          <li>Los datos de identificación de las organizaciones no se usan en el análisis ni aparecen en este informe.</li>
        </ul>
      </div>
      <div className="report-card">
        <h3>Elección de la prueba estadística según el tipo de dato</h3>
        <ul>{DIMENSION_RULES.map((rule) => <li key={rule}>{rule}</li>)}</ul>
        <p className="report-muted">Magnitud del efecto (umbrales convencionales): |ρ| y biserial — 0,1 pequeña, 0,3 moderada, 0,5 grande; ε² — 0,01 / 0,08 / 0,26; V de Cramér — 0,1 / 0,3 / 0,5 divididos por √(min(filas, columnas) − 1).</p>
      </div>
      {valuation && (
        <div className="report-card report-span-2">
          <h3>Composición de las dimensiones</h3>
          <table className="report-table report-table-text">
            <thead><tr><th className="text-left">Dimensión</th><th className="text-left">Afirmaciones del formulario</th></tr></thead>
            <tbody>
              {valuation.dimensions.map((dimension) => (
                <tr key={dimension.key}>
                  <td className="text-left font-medium">{dimension.label}</td>
                  <td className="text-left">
                    <ol>{dimension.itemKeys.map((key) => <li key={key}>{statement.get(key) ?? key}</li>)}</ol>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
