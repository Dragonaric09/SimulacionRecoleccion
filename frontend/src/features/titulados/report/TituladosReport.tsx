import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiRequest } from '@/api/client'
import type { AnalyticsSummary, CategoryDistribution } from '@/features/analitica/api'
import type {
  Competence,
  Cross,
  EmploymentProfile,
} from '@/features/analitica/shared/analyticsTypes'
import type {
  AssociationResult,
  EmployerVariable,
} from '@/features/empleadores/valuation/valuationTypes'

const fields =
  'situacion_laboral_actual,interes_posgrado,area_posgrado_interes,nivel_posgrado_interes,sector_trabajo,anio_titulacion,es_primer_empleo,edad_rango,genero,rubro_trabajo_actual,remuneracion_rango,pertinencia_trabajo_formacion,aspectos_utiles,aspectos_mejorables,asignaturas_ventaja,asignaturas_poco_utiles'
const blue = '#1f6fb5'

type ReportData = {
  summary: AnalyticsSummary
  satisfaction: AnalyticsSummary
  curriculum: AnalyticsSummary
  profile: EmploymentProfile
  competences: Competence[]
  valuationMarket: ReportCross
  workSalary: ReportCross
}

type ReportCross = {
  cross: Cross
  row: EmployerVariable
  column: EmployerVariable
  excluded: number
  test: AssociationResult
}

export function TituladosReport({
  datasetId,
  datasetName,
  onReady,
}: {
  datasetId: string
  datasetName: string
  onReady: () => void
}) {
  const [data, setData] = useState<ReportData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    const query = `?datasetId=${encodeURIComponent(datasetId)}`
    Promise.all([
      apiRequest<AnalyticsSummary>(
        `/analytics/titulados/summary${query}&fields=${encodeURIComponent(fields)}`,
        { signal: controller.signal },
      ),
      apiRequest<AnalyticsSummary>(`/analytics/titulados/satisfaction${query}`, {
        signal: controller.signal,
      }),
      apiRequest<AnalyticsSummary>(`/analytics/titulados/curriculum${query}`, {
        signal: controller.signal,
      }),
      apiRequest<EmploymentProfile>(`/analytics/titulados/employment/profile${query}`, {
        signal: controller.signal,
      }),
      apiRequest<Competence[]>(`/analytics/competencies/gaps${query}`, {
        signal: controller.signal,
      }),
      apiRequest<ReportCross>(
        `/analytics/titulados/cross${query}&rowField=satisfaccion_formacion&columnField=concordancia_formacion_requerimientos`,
        { signal: controller.signal },
      ),
      apiRequest<ReportCross>(
        `/analytics/titulados/cross${query}&rowField=rubro_trabajo_actual&columnField=remuneracion_rango`,
        { signal: controller.signal },
      ),
    ])
      .then(
        ([
          summary,
          satisfaction,
          curriculum,
          profile,
          competences,
          valuationMarket,
          workSalary,
        ]) => {
          setData({
            summary,
            satisfaction,
            curriculum,
            profile,
            competences,
            valuationMarket,
            workSalary,
          })
        },
      )
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : String(cause))
      })
    return () => controller.abort()
  }, [datasetId])

  useEffect(() => {
    if (data || error) onReady()
  }, [data, error, onReady])

  const generated = new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/La_Paz',
  }).format(new Date())

  if (error) {
    return (
      <div className="graduate-report">
        <section className="graduate-cover">
          <p className="graduate-kicker">SimulacionEM · Informe analítico</p>
          <h1 className="graduate-title">Encuesta a titulados</h1>
          <p className="graduate-warning">No se pudieron cargar los datos: {error}</p>
        </section>
      </div>
    )
  }

  return (
    <div className="graduate-report" data-report-ready={data ? 'true' : 'false'}>
      <section className="graduate-cover">
        <p className="graduate-kicker">SimulacionEM · Informe analítico</p>
        <h1 className="graduate-title">Encuesta a titulados</h1>
        <p className="graduate-subtitle">
          Carrera de Ingeniería de Sistemas · Universidad Mayor de San Simón
        </p>
        <dl className="graduate-meta">
          <MetaRow label="Dataset">{datasetName}</MetaRow>
          <MetaRow label="Generado">{generated}</MetaRow>
          <MetaRow label="Respuestas analizadas">
            {data ? `${formatCount(data.summary.validResponses)} respuestas válidas` : 'Cargando…'}
          </MetaRow>
          <MetaRow label="Cobertura">Sin filtros: todas las respuestas válidas del dataset</MetaRow>
        </dl>
        <ol className="graduate-toc">
          <li>Inserción laboral y trayectoria</li>
          <li>Valoración de la formación y proyección de posgrado</li>
          <li>Malla y asignaturas</li>
          <li>Competencias percibidas</li>
          <li>Notas metodológicas</li>
        </ol>
      </section>

      {data && <ReportContent data={data} />}
    </div>
  )
}

function ReportContent({ data }: { data: ReportData }) {
  const { summary, satisfaction, curriculum, profile, competences, valuationMarket, workSalary } =
    data
  const labor = summary.distributions.situacion_laboral_actual
  const employment = laborCounts(labor)
  const occupied = employment.organization + employment.entrepreneurship
  const interest = affirmative(summary.distributions.interes_posgrado)
  const valuationDistribution = satisfaction.distributions.satisfaccion_formacion
  const concordanceDistribution = satisfaction.distributions.concordancia_formacion_requerimientos
  const relevanceDistribution = satisfaction.distributions.pertinencia_trabajo_formacion
  const rows = cohortRows(profile.cohortPoints)
  const lowest = [...competences].sort((left, right) => left.average - right.average).slice(0, 8)

  return (
    <>
      <ReportSection number="1" title="Inserción laboral y trayectoria" n={summary.validResponses}>
        <div className="graduate-kpis">
          <Kpi
            label="Personas ocupadas"
            value={formatPercent(occupied, summary.validResponses)}
            note={`${occupied} de ${summary.validResponses} respuestas`}
          />
          <Kpi
            label="Emprendimiento"
            value={formatPercent(employment.entrepreneurship, summary.validResponses)}
            note={`${employment.entrepreneurship} respuestas`}
          />
          <Kpi
            label="Primer empleo actual"
            value={formatPercent(
              affirmative(summary.distributions.es_primer_empleo),
              Math.max(occupied, 1),
            )}
            note="Base: titulados ocupados"
          />
          <Kpi
            label="Mediana de titulación"
            value={formatYear(summary.numericMedians.anio_titulacion)}
            note="Año de titulación"
          />
        </div>
        <div className="graduate-grid-2">
          <CompositionCard title="Situación laboral" distribution={labor} />
          <CohortColumns rows={rows} total={profile.cohortPoints.length} />
        </div>
        <div className="graduate-grid-3">
          <BarList
            title="Sector de inserción"
            distribution={summary.distributions.sector_trabajo}
            limit={8}
          />
          <BarList title="Rango de edad" distribution={summary.distributions.edad_rango} order />
          <BarList title="Género" distribution={summary.distributions.genero} />
        </div>
        <div className="graduate-grid-2">
          <BarList
            title="Rubro de la organización actual"
            distribution={summary.distributions.rubro_trabajo_actual}
            limit={6}
          />
          <BarList
            title="Remuneración mensual"
            distribution={summary.distributions.remuneracion_rango}
            order
          />
        </div>
        <ReportMatrix
          title="Remuneración por rubro de organización"
          description="Porcentaje dentro de cada rubro. El contraste no paramétrico indica si la posición salarial difiere entre rubros; no identifica causalidad."
          result={workSalary}
          maxRows={7}
        />
      </ReportSection>

      <ReportSection number="2" title="Valoración de la formación y proyección de posgrado">
        <div className="graduate-grid-3">
          <CompositionCard
            title="Valoración global de la formación"
            distribution={valuationDistribution}
            tone="agreement"
          />
          <CompositionCard
            title="Concordancia con requerimientos del mercado"
            distribution={concordanceDistribution}
            tone="agreement"
          />
          <CompositionCard
            title="Pertinencia del trabajo con la formación"
            distribution={relevanceDistribution}
            tone="agreement"
          />
        </div>
        <ReportMatrix
          title="Valoración global y concordancia con el mercado"
          description="Filas: valoración global. Columnas: concordancia. La prueba muestra si ambas escalas ordinales se relacionan; la intensidad se reporta junto al resultado."
          result={valuationMarket}
          maxRows={4}
        />
        <div className="graduate-grid-2">
          <CompositionCard
            title="Interés en posgrado"
            distribution={summary.distributions.interes_posgrado}
          />
        </div>
        <div className="graduate-grid-2">
          <BarList
            title="Áreas de posgrado de interés"
            distribution={summary.distributions.area_posgrado_interes}
            limit={8}
            multiple
          />
          <BarList
            title="Nivel de posgrado de interés"
            distribution={summary.distributions.nivel_posgrado_interes}
            order
          />
        </div>
        <p className="graduate-note">
          {interest} de {summary.validResponses} personas declararon interés en posgrado. En las
          áreas de interés se permiten varias respuestas por persona.
        </p>
      </ReportSection>

      <ReportSection number="3" title="Malla y asignaturas">
        <div className="graduate-grid-2">
          <RankedSelections
            title="Aspectos de la Carrera más útiles"
            distribution={curriculum.distributions.aspectos_utiles}
            limit={6}
          />
          <RankedSelections
            title="Prioridades de mejora identificadas"
            distribution={curriculum.distributions.aspectos_mejorables}
            limit={6}
            tone="warning"
          />
        </div>
        <div className="graduate-grid-2">
          <RankedSelections
            title="Asignaturas que dieron ventaja competitiva"
            distribution={curriculum.distributions.asignaturas_ventaja}
            limit={6}
          />
          <RankedSelections
            title="Asignaturas percibidas poco útiles o desactualizadas"
            distribution={curriculum.distributions.asignaturas_poco_utiles}
            limit={6}
            tone="warning"
          />
        </div>
        <p className="graduate-note">
          Todas las visualizaciones de esta sección son multirrespuesta: una persona podía escoger
          varias opciones; por ello los porcentajes no suman 100 % y no se aplica una prueba de
          asociación entre ellas.
        </p>
      </ReportSection>

      <ReportSection number="4" title="Competencias percibidas" n={lowest[0]?.validCount}>
        <div className="graduate-card">
          <table className="graduate-table">
            <thead>
              <tr>
                <th className="text-left">Competencia</th>
                <th>Grupo</th>
                <th>n</th>
                <th>Media</th>
                <th>Mediana</th>
                <th>D. E.</th>
                <th className="graduate-scale-col">Media en la escala 1–5</th>
              </tr>
            </thead>
            <tbody>
              {lowest.map((item) => (
                <tr key={item.code}>
                  <td className="text-left font-medium">{item.name}</td>
                  <td>{item.group.toUpperCase().includes('SOFT') ? 'Soft' : 'Hard'}</td>
                  <td>{formatCount(item.validCount)}</td>
                  <td className="font-semibold">{formatDecimal(item.average)}</td>
                  <td>{formatDecimal(item.median)}</td>
                  <td>
                    {item.standardDeviation === null
                      ? 'n/d'
                      : formatDecimal(item.standardDeviation)}
                  </td>
                  <td className="graduate-scale-col">
                    <span className="graduate-scale">
                      <span style={{ left: `${scalePosition(item.average)}%` }} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="graduate-note">
            Se muestran las ocho competencias con menor media. La escala va de 1 (muy insuficiente)
            a 5 (muy suficiente).
          </p>
        </div>
      </ReportSection>

      <ReportSection number="A" title="Notas metodológicas">
        <div className="graduate-grid-2">
          <div className="graduate-card">
            <h3>Bases y porcentajes</h3>
            <p>
              El valor n de cada visualización corresponde a las respuestas válidas de esa pregunta.
              Los porcentajes se calculan sobre esa base, no necesariamente sobre el total del
              dataset.
            </p>
          </div>
          <div className="graduate-card">
            <h3>Pruebas y lectura de matrices</h3>
            <p>
              En los cruces ordinales se usa rho de Spearman; si una variable nominal divide dos
              grupos frente a una ordinal, U de Mann-Whitney; con tres o más grupos, Kruskal-Wallis.
              Para dos variables nominales se usa χ² o Fisher según las frecuencias esperadas. α =
              0,05.
            </p>
          </div>
        </div>
      </ReportSection>
    </>
  )
}

function ReportSection({
  number,
  title,
  n,
  children,
}: {
  number: string
  title: string
  n?: number
  children: ReactNode
}) {
  return (
    <section className={`graduate-section graduate-section-${number}`}>
      <div className="graduate-section-header">
        <span>{number}</span>
        <h2>{title}</h2>
        {n !== undefined && <small>n = {formatCount(n)}</small>}
      </div>
      {children}
    </section>
  )
}

function MetaRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="graduate-meta-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="graduate-kpi">
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  )
}

function CompositionCard({
  title,
  distribution,
  tone = 'employment',
}: {
  title: string
  distribution?: CategoryDistribution
  tone?: 'employment' | 'agreement'
}) {
  const entries = Object.entries(distribution?.counts ?? {}).sort(([left], [right]) =>
    tone === 'agreement' ? agreementRank(left) - agreementRank(right) : 0,
  )
  const colors =
    tone === 'agreement'
      ? ['#e4572e', '#f4a98a', '#8db8e0', blue]
      : [blue, '#14a39a', '#f2a33a', '#94a3b8']
  return (
    <div className="graduate-card">
      <div className="graduate-card-header">
        <h3>{title}</h3>
        <span>n = {formatCount(distribution?.validCount ?? 0)}</span>
      </div>
      {entries.length ? (
        <>
          <div className="graduate-composition">
            {entries.map(([label], index) => (
              <span
                key={label}
                style={{
                  width: `${distribution?.percentages[label] ?? 0}%`,
                  background: colors[index % colors.length],
                }}
              />
            ))}
          </div>
          <div className="graduate-legend">
            {entries.map(([label, count], index) => (
              <p key={label}>
                <i style={{ background: colors[index % colors.length] }} />
                {label}
                <b>
                  {formatCount(count)} · {formatPercent(count, distribution?.validCount ?? 0)}
                </b>
              </p>
            ))}
          </div>
        </>
      ) : (
        <p className="graduate-note">Sin respuestas.</p>
      )}
    </div>
  )
}

function ReportMatrix({
  title,
  description,
  result,
  maxRows,
}: {
  title: string
  description: string
  result: ReportCross
  maxRows: number
}) {
  const rows = result.cross.rowCategories.slice(0, maxRows)
  const hiddenRows = result.cross.rowCategories.length - rows.length
  return (
    <div className="graduate-card graduate-matrix-card">
      <div className="graduate-card-header">
        <h3>{title}</h3>
        <span>n = {formatCount(result.cross.validCount)}</span>
      </div>
      <p className="graduate-note">{description}</p>
      <table className="graduate-table graduate-matrix">
        <thead>
          <tr>
            <th className="text-left">{result.row.label} ↓</th>
            {result.cross.columnCategories.map((category) => (
              <th key={category}>{category}</th>
            ))}
            <th>n</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const total = rowTotal(result.cross, row)
            return (
              <tr key={row}>
                <td className="text-left font-medium">{row}</td>
                {result.cross.columnCategories.map((column) => {
                  const count = result.cross.counts[row]?.[column] ?? 0
                  const percent = result.cross.percentages[row]?.[column] ?? 0
                  return (
                    <td
                      key={column}
                      className="graduate-heat"
                      style={{ background: `rgba(31, 111, 181, ${0.07 + percent / 130})` }}
                    >
                      <b>{formatCount(count)}</b>
                      <small>{formatPercent(percent, 100)}</small>
                    </td>
                  )
                })}
                <td>{formatCount(total)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {hiddenRows > 0 && (
        <p className="graduate-note">
          Se omitieron {hiddenRows} rubros de menor frecuencia para conservar la lectura del
          informe.
        </p>
      )}
      <TestSummary test={result.test} excluded={result.excluded} />
    </div>
  )
}

function TestSummary({ test, excluded }: { test: AssociationResult; excluded: number }) {
  if (!test.aplicable) {
    return (
      <p className="graduate-test graduate-test-muted">
        {test.nombrePrueba}: no aplicable. {test.motivo}{' '}
        {excluded ? `${formatCount(excluded)} respuestas sin ambas variables.` : ''}
      </p>
    )
  }
  const pValue =
    test.pValor === null ? 'n/d' : test.pValor < 0.001 ? '< 0,001' : formatDecimal(test.pValor)
  const effect =
    test.efecto === null
      ? null
      : `${test.efectoNombre ?? 'Efecto'} = ${formatDecimal(test.efecto)}${test.magnitud ? ` (${test.magnitud.toLowerCase()})` : ''}`
  return (
    <p
      className={`graduate-test ${test.significativo ? 'graduate-test-significant' : 'graduate-test-muted'}`}
    >
      <b>{test.nombrePrueba}</b> · p {pValue}
      {effect ? ` · ${effect}` : ''} ·{' '}
      {test.significativo
        ? 'diferencia o asociación significativa (α = 0,05).'
        : 'sin evidencia suficiente de diferencia o asociación (α = 0,05).'}
      {excluded ? ` Excluidas: ${formatCount(excluded)}.` : ''}
    </p>
  )
}

function RankedSelections({
  title,
  distribution,
  limit,
  tone = 'default',
}: {
  title: string
  distribution?: CategoryDistribution
  limit: number
  tone?: 'default' | 'warning'
}) {
  const rows = Object.entries(distribution?.counts ?? {})
    .filter(([, count]) => count > 0)
    .sort(([, left], [, right]) => right - left)
    .slice(0, limit)
  return (
    <div
      className={`graduate-card graduate-selection-card ${tone === 'warning' ? 'graduate-selection-warning' : ''}`}
    >
      <div className="graduate-card-header">
        <h3>{title}</h3>
        <span>n = {formatCount(distribution?.validCount ?? 0)}</span>
      </div>
      {rows.length ? (
        <ol className="graduate-ranking">
          {rows.map(([label, count], index) => (
            <li key={label}>
              <b>{index + 1}</b>
              <span>{label}</span>
              <em>
                {formatCount(count)} · {formatPercent(count, distribution?.validCount ?? 0)}
              </em>
            </li>
          ))}
        </ol>
      ) : (
        <p className="graduate-note">Sin respuestas.</p>
      )}
    </div>
  )
}

function CohortColumns({
  rows,
  total,
}: {
  rows: { label: string; count: number }[]
  total: number
}) {
  const maximum = Math.max(1, ...rows.map((row) => row.count))
  return (
    <div className="graduate-card">
      <div className="graduate-card-header">
        <h3>Antigüedad desde titulación</h3>
        <span>n = {formatCount(total)}</span>
      </div>
      {total ? (
        <>
          <div className="graduate-columns">
            {rows.map((row) => (
              <div key={row.label}>
                <b>{row.count}</b>
                <span
                  style={{
                    height: `${Math.max(row.count ? 10 : 2, (row.count * 74) / maximum)}px`,
                  }}
                />
                <small>{row.label}</small>
              </div>
            ))}
          </div>
          <p className="graduate-note">
            La altura de cada columna representa el número de titulados del tramo.
          </p>
        </>
      ) : (
        <p className="graduate-note">Sin datos de cohorte.</p>
      )}
    </div>
  )
}

function BarList({
  title,
  distribution,
  limit,
  order,
  multiple = false,
}: {
  title: string
  distribution?: CategoryDistribution
  limit?: number
  order?: boolean
  multiple?: boolean
}) {
  const entries = useMemo(
    () =>
      Object.entries(distribution?.counts ?? {}).sort(
        ([leftLabel, leftCount], [rightLabel, rightCount]) =>
          order ? ordinalRank(leftLabel) - ordinalRank(rightLabel) : rightCount - leftCount,
      ),
    [distribution, order],
  )
  const shown = limit ? entries.slice(0, limit) : entries
  const maximum = Math.max(1, ...shown.map(([, count]) => count))
  return (
    <div className="graduate-card">
      <div className="graduate-card-header">
        <h3>{title}</h3>
        <span>n = {formatCount(distribution?.validCount ?? 0)}</span>
      </div>
      {shown.length ? (
        <div className="graduate-bars">
          {shown.map(([label, count]) => (
            <div key={label}>
              <span>{label}</span>
              <i>
                <b style={{ width: `${(count * 100) / maximum}%` }} />
              </i>
              <em>
                {formatCount(count)} · {formatPercent(count, distribution?.validCount ?? 0)}
              </em>
            </div>
          ))}
        </div>
      ) : (
        <p className="graduate-note">Sin respuestas.</p>
      )}
      {multiple && (
        <p className="graduate-note">Pregunta multirrespuesta: los porcentajes no suman 100 %.</p>
      )}
    </div>
  )
}

function laborCounts(distribution?: CategoryDistribution) {
  return Object.entries(distribution?.counts ?? {}).reduce(
    (result, [label, count]) => {
      const normalized = label.toLocaleLowerCase('es-BO')
      if (normalized.includes('organización') || normalized.includes('organizacion'))
        result.organization += count
      else if (normalized.includes('emprend')) result.entrepreneurship += count
      else if (
        normalized.includes('no trabaja') ||
        normalized.includes('desemple') ||
        normalized.includes('búsqueda')
      )
        result.unemployed += count
      return result
    },
    { organization: 0, entrepreneurship: 0, unemployed: 0 },
  )
}

function rowTotal(cross: Cross, row: string) {
  return Object.values(cross.counts[row] ?? {}).reduce((total, count) => total + count, 0)
}

function agreementRank(label: string) {
  const normalized = normalizeLabel(label)
  if (normalized.includes('totalmente') && normalized.includes('desacuerdo')) return 1
  if (normalized.includes('desacuerdo')) return 2
  if (normalized.includes('totalmente') && normalized.includes('acuerdo')) return 4
  if (normalized.includes('acuerdo')) return 3
  return Number.MAX_SAFE_INTEGER
}

function ordinalRank(label: string) {
  const normalized = normalizeLabel(label)
  if (normalized.includes('menos') || normalized.includes('menor')) return 0
  if (normalized.includes('2500') || normalized.includes('2.500')) return 1
  if (normalized.includes('3501') || normalized.includes('3.501')) return 2
  if (normalized.includes('5001') || normalized.includes('5.001')) return 3
  if (normalized.includes('7001') || normalized.includes('7.001')) return 4
  if (normalized.includes('mas') || normalized.includes('más')) return 5
  if (normalized.startsWith('15')) return 0
  if (normalized.startsWith('19')) return 1
  if (normalized.startsWith('23')) return 2
  if (normalized.startsWith('27')) return 3
  if (normalized.startsWith('31')) return 4
  if (normalized.startsWith('35')) return 5
  if (normalized.includes('diplomado')) return 0
  if (normalized.includes('especialidad')) return 1
  if (normalized.includes('maestria')) return 2
  if (normalized.includes('doctorado')) return normalized.includes('pos') ? 4 : 3
  return Number.MAX_SAFE_INTEGER
}

function normalizeLabel(value: string) {
  return value
    .toLocaleLowerCase('es-BO')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function affirmative(distribution?: CategoryDistribution) {
  const key = Object.keys(distribution?.counts ?? {}).find((label) =>
    ['true', 'sí', 'si'].includes(label.toLocaleLowerCase('es-BO')),
  )
  return key ? (distribution?.counts[key] ?? 0) : 0
}

function cohortRows(points: EmploymentProfile['cohortPoints']) {
  const rows = ['0–2 años', '3–5 años', '6+ años'].map((label) => ({ label, count: 0 }))
  points.forEach((point) => {
    const years = new Date().getFullYear() - point.graduationYear
    rows[years <= 2 ? 0 : years <= 5 ? 1 : 2].count += 1
  })
  return rows
}

function formatCount(value: number) {
  return new Intl.NumberFormat('es-BO').format(value)
}
function formatDecimal(value: number) {
  return value.toFixed(2).replace('.', ',')
}
function formatPercent(count: number, total: number) {
  return `${total ? ((count * 100) / total).toFixed(1).replace('.', ',') : '0,0'} %`
}
function formatYear(value: number | undefined) {
  return value === undefined ? '—' : String(Math.round(value))
}
function scalePosition(value: number) {
  return Math.min(100, Math.max(0, ((value - 1) / 4) * 100))
}
