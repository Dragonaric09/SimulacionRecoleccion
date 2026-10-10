import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BriefcaseBusiness, Clock3, GraduationCap, Target, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/analytics/Badge";
import { FilterToolbar } from "@/components/analytics/FilterToolbar";
import { KpiCard } from "@/components/analytics/KpiCard";
import { StatusPanel } from "@/components/analytics/StatusPanel";
import { Empty, EmptyTitle } from "@/components/ui/empty";
import {
  ChartContainer,
} from "@/components/ui/chart";
import { Cell, Pie, PieChart } from "recharts";
import { apiRequest } from "@/api/client";
import type { AnalyticsSummary, CategoryDistribution } from "./api";
import type { Competence, EmploymentProfile } from "./shared/analyticsTypes";
import { useDatasetContext } from "@/app/DatasetContext";
import { navigate } from "@/app/navigation";

const fields =
  "situacion_laboral_actual,interes_posgrado,area_posgrado_interes,sector_trabajo,anio_titulacion,es_primer_empleo";

export function TituladosSummaryPage({ printAll = false }: { printAll?: boolean } = {}) {
  const { activeIds, setActiveDataset } = useDatasetContext();
  const datasetId = activeIds.TITULADOS;
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [satisfaction, setSatisfaction] = useState<AnalyticsSummary | null>(null);
  const [competences, setCompetences] = useState<Competence[]>([]);
  const [profile, setProfile] = useState<EmploymentProfile | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!datasetId) {
      setLoading(false);
      setError(null);
      setSummary(null);
      setProfile(null);
      return;
    }
    setLoading(true);
    setError(null);
    const query = `?datasetId=${encodeURIComponent(datasetId)}${filterQuery}`;
    Promise.all([
      apiRequest<AnalyticsSummary>(
        `/analytics/titulados/summary?datasetId=${encodeURIComponent(datasetId)}&fields=${encodeURIComponent(fields)}${filterQuery}`,
      ),
      apiRequest<AnalyticsSummary>(`/analytics/titulados/satisfaction${query}`),
      apiRequest<EmploymentProfile>(`/analytics/titulados/employment/profile${query}`),
      apiRequest<Competence[]>(`/analytics/competencies/gaps${query}`),
    ])
      .then(([nextSummary, nextSatisfaction, nextProfile, nextCompetences]) => {
        setSummary(nextSummary);
        setSatisfaction(nextSatisfaction);
        setProfile(nextProfile);
        setCompetences(nextCompetences);
      })
      .catch((cause) => {
        const message = cause instanceof Error ? cause.message : String(cause);
        if (message.includes("HTTP 404")) {
          localStorage.removeItem("simulacionem.activeDatasetId");
          setActiveDataset("TITULADOS", undefined);
          setSummary(null);
          setError(null);
          return;
        }
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [datasetId, filterQuery]);

  const laboral = summary?.distributions.situacion_laboral_actual;
  const posgrado = summary?.distributions.interes_posgrado;
  const areasPosgrado = summary?.distributions.area_posgrado_interes;
  const employment = laborCounts(laboral);
  const occupied = employment.organization + employment.entrepreneurship;
  const interes = posgrado ? firstCount(posgrado, ["Sí", "SI", "Si"]) : null;
  const medianYear = summary?.numericMedians.anio_titulacion;
  const yearsSince = medianYear == null ? null : new Date().getFullYear() - medianYear;
  const yearRange = graduationYearRange(summary?.distributions.anio_titulacion, undefined, undefined, profile?.cohortPoints);
  const firstEmployment = summary?.distributions.es_primer_empleo;
  const firstEmploymentYes = firstEmployment ? booleanCount(firstEmployment, true) : null;
  const weakest = competences.length
    ? competences.reduce((current, item) => item.average < current.average ? item : current)
    : null;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 pt-1 md:flex-row md:items-end">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
          </div>
          <h1 className="headline-page tracking-tight">
            Resumen general
          </h1>
          <p className="max-w-2xl text-sm text-ink-600">
            Indicadores de inserción laboral, formación e interés de posgrado.
          </p>
        </div>
      </div>
      {summary && !printAll && (
        <FilterToolbar summary={summary} onQueryChange={setFilterQuery} />
      )}
      {loading && (
        <StatusPanel
          kind="loading"
          title="Cargando resumen"
          description="Consultando los indicadores del dataset seleccionado."
        />
      )}
      {!loading && error && (
        <StatusPanel
          kind="warning"
          title="No se pudo cargar el resumen"
          description={error}
        />
      )}
      {!loading && !error && !summary && (
        <StatusPanel
          kind="info"
          title="Sin dataset de titulados"
          description="Importa un CSV de titulados desde Cargar datos para ver este resumen."
        />
      )}
      {summary && (
        <>
          {summary.smallSample && (
            <StatusPanel
              kind="warning"
              title="Muestra reducida"
              description={`Los resultados corresponden a ${summary.validResponses} respuestas válidas y deben leerse junto con sus conteos.`}
            />
          )}
          <div className="summary-kpi-grid grid items-stretch gap-4 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-6">
            <KpiCard label="Titulados" value={String(summary.validResponses)} detail={`Titulación ${yearRange.min ?? "—"}–${yearRange.max ?? "—"}`} icon={Users} tone="titulados" />
            <KpiCard label="Con empleo" value={`${occupied} de ${summary.validResponses}`} detail={formatPercent(occupied, summary.validResponses)} icon={BriefcaseBusiness} tone="titulados" />
            <KpiCard label="Mediana desde titulación" value={yearsSince === null ? "—" : `${formatDecimal(yearsSince, 1)} años`} detail={medianYear == null ? "No disponible" : `La mitad se tituló antes de ${Math.ceil(medianYear)}`} icon={Clock3} tone="titulados" />
            <KpiCard label="Siguen en su primer empleo" value={firstEmploymentYes == null ? "—" : `${firstEmploymentYes} de ${occupied}`} detail={firstEmploymentYes == null ? "Sin respuestas" : `${formatPercent(firstEmploymentYes, occupied)} · base: ${occupied} con empleo`} icon={BriefcaseBusiness} tone="titulados" />
            <KpiCard label="Interesados en posgrado" value={formatCount(workValue(interes), summary.validResponses)} detail={formatPercent(workValue(interes), summary.validResponses)} icon={GraduationCap} tone="titulados" />
            <KpiCard label="Mayor brecha" value={weakest ? formatDecimal(weakest.average) : "—"} detail={weakest?.name ?? "Sin datos"} icon={Target} tone="titulados" />
          </div>
          
          <div className="summary-context-grid grid items-stretch gap-4 lg:grid-cols-2">
            <EmploymentSummaryCard distribution={laboral} total={summary.validResponses} />
            <SenioritySummaryCard points={profile?.cohortPoints ?? []} total={summary.validResponses} />
          </div>
          <div className="summary-results-grid grid items-stretch gap-4 lg:grid-cols-3">
            <CompetenceSummaryCard items={competences} />
            <SatisfactionSummaryCard distribution={satisfaction?.distributions.satisfaccion_formacion} />
            <PostgraduateCard distribution={areasPosgrado} />
          </div>
        </>
      )}
    </div>
  );
}

function EmploymentCard({
  distribution,
}: {
  distribution?: CategoryDistribution;
}) {
  const entries = useMemo(
    () => Object.entries(distribution?.counts ?? {}),
    [distribution],
  );
  const total = distribution?.validCount ?? 0;
  const chartData = entries.map(([label, value]) => ({ label, value }));
  const chartConfig = Object.fromEntries(
    entries.map(([label], index) => [
      label,
      { label, color: colorForEmployment(index) },
    ]),
  );
  return (
    <Card className="h-fit rounded-xl border-0 shadow-sm lg:col-span-5">
      <CardHeader>
        <CardTitle className="title-card">Estado laboral</CardTitle>
        <CardDescription>
          Distribución de inserción en el mercado laboral{" "}
          <span className="whitespace-nowrap">· n = {total}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <div className="relative size-36 shrink-0">
          <div className="employment-donut-responsive absolute inset-0">
          <ChartContainer config={chartConfig} className="aspect-square">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="label"
                innerRadius={48}
                outerRadius={68}
                stroke="none"
                isAnimationActive={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={entry.label} fill={colorForEmployment(index)} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          </div>
          <div className="employment-donut-fixed absolute inset-0" aria-label="Dona de estado laboral para impresión">
            <PieChart width={144} height={144}>
              <Pie data={chartData} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={48} outerRadius={68} stroke="none" isAnimationActive={false}>
                {chartData.map((entry, index) => <Cell key={entry.label} fill={colorForEmployment(index)} />)}
              </Pie>
            </PieChart>
          </div>
          <div className="absolute inset-0 m-auto flex size-24 flex-col items-center justify-center rounded-full bg-white">
            <span className="title-card tabular-nums">{total}</span>
            <span className="caption-meta uppercase text-ink-600">Total</span>
          </div>
        </div>
        <div className="min-w-0 w-full space-y-2">
          {entries.length ? (
            entries.map(([label, count], index) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 rounded-lg border border-border-line bg-surface-container-low px-3 py-2 text-sm"
              >
                <div className="flex min-w-0 items-start gap-2">
                  <span
                    className="mt-1 size-3 shrink-0 rounded-sm"
                    style={{ backgroundColor: colorForEmployment(index) }}
                  />
                  <span className="break-words leading-5">{label}</span>
                </div>
                <span className="tabular-nums whitespace-nowrap font-medium">
                  {count}{" "}
                  <span className="caption-meta text-ink-600">
                    ({formatPercent(distribution?.percentages[label] ?? 0, 100)})
                  </span>
                </span>
              </div>
            ))
          ) : (
            <Empty className="py-6">
              <EmptyTitle>Sin respuestas disponibles</EmptyTitle>
            </Empty>
          )}
        </div>
      </CardContent>
      <div className="mx-6 border-t border-surface-container-high py-3 text-xs text-ink-600">
        Frecuencia de personas según situación laboral
      </div>
    </Card>
  );
}

void EmploymentCard;

type EmploymentCounts = {
  organization: number;
  entrepreneurship: number;
  unemployed: number;
};

function laborCounts(distribution?: CategoryDistribution): EmploymentCounts {
  const counts = Object.entries(distribution?.counts ?? {});
  const normalized = (label: string) => label.toLocaleLowerCase("es-BO");
  return counts.reduce<EmploymentCounts>((result, [label, count]) => {
    const value = normalized(label);
    if (value.includes("organización") || value.includes("organizacion")) result.organization += count;
    else if (value.includes("emprend")) result.entrepreneurship += count;
    else if (value.includes("no trabaja") || value.includes("no trabajo") || value.includes("búsqueda") || value.includes("busqueda") || value.includes("desemple")) result.unemployed += count;
    return result;
  }, { organization: 0, entrepreneurship: 0, unemployed: 0 });
}

function SummaryDetailLink({ href, children = "Ver detalle" }: { href: string; children?: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 text-xs font-medium text-titulados transition-colors hover:text-titulados/75"
      onClick={() => navigate(href)}
    >
      {children} <ArrowRight className="size-3" />
    </button>
  );
}

function EmploymentSummaryCard({ distribution, total }: { distribution?: CategoryDistribution; total: number }) {
  const counts = laborCounts(distribution);
  const rows = [
    ["Organización", counts.organization],
    ["Emprendimiento", counts.entrepreneurship],
    ["Sin empleo", counts.unemployed],
  ] as const;
  const colors = ["#1f6fb5", "#14a39a", "#f2a33a"];
  return (
    <Card className="h-full rounded-xl border border-border-line shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="title-card">Situación laboral</CardTitle>
            <CardDescription>Distribución de la muestra · n = {total}</CardDescription>
          </div>
          <SummaryDetailLink href="/titulados/perfil-empleabilidad" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex h-7 overflow-hidden rounded-md bg-surface-container-high" aria-label="Situación laboral apilada al 100 por ciento">
          {rows.map(([label, count], index) => count > 0 ? (
            <div key={label} className="flex min-w-0 items-center justify-center px-1 text-[11px] font-semibold" style={{ width: `${total ? count * 100 / total : 0}%`, backgroundColor: colors[index], color: "white" }} title={`${label}: ${count} (${formatPercent(count, total)})`}>
              {count * 100 / Math.max(total, 1) >= 10 ? `${count}` : ""}
            </div>
          ) : null)}
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs text-ink-600">
          {rows.map(([label, count]) => <div key={label} className="space-y-0.5"><div className="font-medium text-ink-900">{label}</div><div className="tabular-nums">{count} ({formatPercent(count, total)})</div></div>)}
        </div>
      </CardContent>
    </Card>
  );
}

function SenioritySummaryCard({ points, total }: { points: EmploymentProfile["cohortPoints"]; total: number }) {
  const rows = ["0–2 años", "3–5 años", "6+ años"].map((label) => ({ label, count: 0 }));
  points.forEach((point) => {
    const age = new Date().getFullYear() - point.graduationYear;
    const target = age <= 2 ? rows[0] : age <= 5 ? rows[1] : rows[2];
    target.count += 1;
  });
  const maximum = Math.max(1, ...rows.map((row) => row.count));
  return (
    <Card className="h-full rounded-xl border border-border-line shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div><CardTitle className="title-card">Titulados por antigüedad</CardTitle><CardDescription>Tramos desde la titulación · n = {total}</CardDescription></div>
          <SummaryDetailLink href="/titulados/perfil-empleabilidad" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row) => <div key={row.label} className="grid grid-cols-[5rem_1fr_2.5rem] items-center gap-2 text-xs"><span className="text-ink-700">{row.label}</span><div className="h-2 overflow-hidden rounded-full bg-surface-container-high"><div className="h-full rounded-full bg-titulados" style={{ width: `${row.count * 100 / maximum}%` }} /></div><span className="text-right tabular-nums font-medium">{row.count}</span></div>)}
      </CardContent>
    </Card>
  );
}

function CompetenceSummaryCard({ items }: { items: Competence[] }) {
  const rows = [...items].sort((left, right) => left.average - right.average).slice(0, 3);
  return (
    <Card className="h-full rounded-xl border border-border-line shadow-sm">
      <CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="title-card">Competencias con mayor brecha</CardTitle><CardDescription>Menor promedio observado · n = {rows[0]?.validCount ?? 0}</CardDescription></div><SummaryDetailLink href="/titulados/brechas-competencias" /></div></CardHeader>
      <CardContent className="space-y-3">{rows.length ? rows.map((row) => <div key={row.code} className="flex items-center justify-between gap-3 border-b border-border-line pb-2 last:border-0"><span className="min-w-0 break-words text-sm text-ink-800">{row.name}</span><strong className="shrink-0 tabular-nums text-ink-900">{formatDecimal(row.average)} / 5</strong></div>) : <Empty className="py-4"><EmptyTitle>Sin datos de competencias</EmptyTitle></Empty>}</CardContent>
    </Card>
  );
}

function SatisfactionSummaryCard({ distribution }: { distribution?: CategoryDistribution }) {
  const entries = satisfactionEntries(distribution);
  const colors = ["#ed552f", "#f3a487", "#1f6fb5"];
  const total = distribution?.validCount ?? 0;
  return (
    <Card className="h-full rounded-xl border border-border-line shadow-sm">
      <CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="title-card">Satisfacción con la formación</CardTitle><CardDescription>Escala de satisfacción (3 niveles) · n = {total}</CardDescription></div><SummaryDetailLink href="/titulados/brechas-competencias" /></div></CardHeader>
      <CardContent className="space-y-3">{entries.length ? <><div className="flex h-7 overflow-hidden rounded-md">{entries.map(([label, _count], index) => <div key={label} className="flex min-w-0 items-center justify-center text-[11px] font-semibold" style={{ width: `${distribution?.percentages[label] ?? 0}%`, backgroundColor: colors[index], color: index === 1 ? "#1f2937" : "white" }}>{(distribution?.percentages[label] ?? 0) >= 10 ? `${formatPercentValue(distribution?.percentages[label] ?? 0)} %` : ""}</div>)}</div><div className="space-y-1 text-xs text-ink-700">{entries.map(([label, count]) => <div key={label} className="flex justify-between gap-2"><span>{label}</span><span className="tabular-nums">{count} ({formatPercentValue(distribution?.percentages[label] ?? 0)} %)</span></div>)}</div></> : <Empty className="py-4"><EmptyTitle>Sin datos de satisfacción</EmptyTitle></Empty>}</CardContent>
    </Card>
  );
}

function PostgraduateCard({
  distribution,
}: {
  distribution?: CategoryDistribution;
}) {
  const entries = useMemo(
    () => Object.entries(distribution?.counts ?? {}).sort(([, left], [, right]) => right - left),
    [distribution],
  );
  return (
    <Card className="h-full rounded-xl border border-border-line shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="title-card">
              Áreas de posgrado de interés
            </CardTitle>
            <CardDescription>
              Demanda de especialización académica y tecnológica · n = {distribution?.validCount ?? 0}
            </CardDescription>
          </div>
          <Badge tone="neutral">Multirrespuesta</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length ? (
          <div className="space-y-4">
            {entries.map(([label, count]) => {
              const percent = distribution?.percentages[label] ?? 0;
              return (
                <div key={label} className="space-y-1">
                  <div className="flex items-start justify-between gap-4 text-sm">
                    <span className="min-w-0 break-words font-medium">
                      {label}
                    </span>
                    <span className="tabular-nums whitespace-nowrap font-medium">
                      {count} de {distribution?.validCount ?? 0}{" "}
                      <span className="caption-meta text-ink-600">
                        ({percent.toFixed(1).replace(".", ",")} %)
                      </span>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-surface-container-high">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percent}%`,
                        backgroundColor: "#1f6fb5",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty className="py-6">
            <EmptyTitle>Sin respuestas disponibles</EmptyTitle>
          </Empty>
        )}
      </CardContent>
      <div className="mx-6 flex flex-wrap justify-between gap-2 border-t border-surface-container-high py-3 text-xs text-ink-600">
        <span>Varias respuestas posibles</span>
        <span>Porcentajes sobre los {distribution?.validCount ?? 0} interesados</span>
      </div>
    </Card>
  );
}

function colorForEmployment(index: number) {
  return ["#1f6fb5", "#14a39a", "#94a3b8", "#f2a33a"][index % 4];
}
function booleanCount(distribution: CategoryDistribution, expected: boolean) {
  const target = expected ? ["true", "sí", "si"] : ["false", "no"];
  const key = Object.keys(distribution.counts).find((label) => target.includes(label.toLocaleLowerCase("es-BO")));
  return key ? distribution.counts[key] : 0;
}

function graduationYearRange(distribution?: CategoryDistribution, min?: number, max?: number, points: EmploymentProfile["cohortPoints"] = []) {
  const years = [...Object.keys(distribution?.counts ?? {}).map(Number), ...points.map((point) => point.graduationYear)]
    .filter((year) => Number.isFinite(year));
  return {
    min: min ?? (years.length ? Math.min(...years) : undefined),
    max: max ?? (years.length ? Math.max(...years) : undefined),
  };
}

function satisfactionEntries(distribution?: CategoryDistribution) {
  const entries = Object.entries(distribution?.counts ?? {});
  const order = ["insatisfecho", "algo satisfecho", "satisfecho"];
  return entries.sort(([left], [right]) => {
    const leftIndex = order.indexOf(left.toLocaleLowerCase("es-BO"));
    const rightIndex = order.indexOf(right.toLocaleLowerCase("es-BO"));
    return (leftIndex < 0 ? order.length : leftIndex) - (rightIndex < 0 ? order.length : rightIndex);
  });
}

function formatPercentValue(value: number) {
  return value.toFixed(1).replace(".", ",");
}
function firstCount(distribution: CategoryDistribution, candidates: string[]) {
  const key = Object.keys(distribution.counts).find(
    (item) =>
      candidates.some(
        (candidate) => item.toLowerCase() === candidate.toLowerCase(),
      ) ||
      (item.toLowerCase() === "true" &&
        candidates.some((candidate) =>
          ["sí", "si", "true"].includes(candidate.toLowerCase()),
        )),
  );
  return key
    ? {
        count: distribution.counts[key],
        percentage: distribution.percentages[key] ?? 0,
      }
    : null;
}
function workValue(value: { count: number; percentage: number } | null) {
  return value?.count ?? null;
}
function formatCount(value: number | null, total: number) {
  return value === null ? "—" : `${value} de ${total}`;
}
function formatDecimal(value: number, digits = 2) {
  return value.toFixed(digits).replace(".", ",");
}
function formatPercent(value: number | null, total: number) {
  return value === null
    ? "No disponible"
    : `${total ? ((value / total) * 100).toFixed(1).replace(".", ",") : "0,0"} %`;
}
