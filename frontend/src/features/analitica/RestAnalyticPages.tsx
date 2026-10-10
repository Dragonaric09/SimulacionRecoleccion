import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Dices,
  FlaskConical,
  GraduationCap,
  Inbox,
  ListChecks,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { apiRequest } from "@/api/client";
import { Badge } from "@/components/analytics/Badge";
import { FilterToolbar } from "@/components/analytics/FilterToolbar";
import { KpiCard } from "@/components/analytics/KpiCard";
import { StatusPanel } from "@/components/analytics/StatusPanel";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import {
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalyticsSummary, CategoryDistribution } from "./api";
import type { CohortChartPoint, Competence, Domain, EmploymentProfile, Simulation, Tone } from "./shared/analyticsTypes";
import { DatasetSelect, PageHeading, useDatasets } from "./shared/AnalyticsPrimitives";
import { MiniDistribution, StackedRelevanceCard } from "./employment/EmploymentCharts";
import { useCompetenceData } from "./competence/useCompetenceData";
import { CompetenceMatrix as CompetenceHeatmap } from "./competence/CompetenceMatrix";
import { CompetenceStatsTable as CompetenceStatsTableView } from "./competence/CompetenceStatsTable";
import { CurriculumCard as CurriculumCardView } from "./competence/CurriculumCard";
import { SatisfactionPanel as SatisfactionPanelView } from "./competence/SatisfactionPanels";
import { CompetenceRadar as CompetenceRadarView } from "./competence/CompetenceRadar";
import { SimulationComparisonTable, SimulationDistribution, SimulationWeights } from "./simulation/SimulationComponents";
import { simulationCategories, simulationCategoryLabel, simulationPercent, simulationVariableLabel } from "./simulation/simulationUtils";
import { SimulationDownloadMenu, type SimulationRun } from "./simulation/SimulationDownloads";
export { FinancingCompletePage, FinancingPage } from "./financing/FinancingPages";
export { CrossExportPage } from "./cross/CrossExportPage";


function CohortTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: CohortChartPoint }[];
}) {
  const point = payload?.find((entry) => entry.payload)?.payload;
  if (!active || !point) return null;
  return (
    <div className="grid min-w-[12rem] gap-1 rounded-lg border border-border-line bg-white px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-ink-900">
        Año de titulación: {point.graduationYear}
      </p>
      <p className="text-ink-600">
        Años de vida profesional: {point.professionalYears}
        {point.isOutlier ? " · valor atípico" : ""}
      </p>
    </div>
  );
}

export function EmploymentProfilePage({ printAll = false }: { printAll?: boolean } = {}) {
  const {
    datasets,
    datasetId,
    setDatasetId,
    loading: datasetsLoading,
  } = useDatasets("TITULADOS");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [unemploymentSummary, setUnemploymentSummary] =
    useState<AnalyticsSummary | null>(null);
  const [firstEmploymentSummary, setFirstEmploymentSummary] =
    useState<AnalyticsSummary | null>(null);
  const [entrepreneurshipSummary, setEntrepreneurshipSummary] =
    useState<AnalyticsSummary | null>(null);
  const [profile, setProfile] = useState<EmploymentProfile | null>(null);
  const [activeTab, setActiveTab] = useState("perfil");
  const [filterQuery, setFilterQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!datasetId) {
      setSummary(null);
      setUnemploymentSummary(null);
      setFirstEmploymentSummary(null);
      setEntrepreneurshipSummary(null);
      setProfile(null);
      return;
    }
    setLoading(true);
    setError(null);
    const query = `?datasetId=${encodeURIComponent(datasetId)}${filterQuery}`;
    Promise.all([
      apiRequest<AnalyticsSummary>(`/analytics/titulados/employment${query}`),
      apiRequest<EmploymentProfile>(
        `/analytics/titulados/employment/profile${query}`,
      ),
      apiRequest<AnalyticsSummary>(
        `/analytics/titulados/employment/unemployment${query}`,
      ),
      apiRequest<AnalyticsSummary>(
        `/analytics/titulados/employment/first-employment${query}`,
      ),
      apiRequest<AnalyticsSummary>(
        `/analytics/titulados/employment/entrepreneurship${query}`,
      ),
    ])
      .then(([nextSummary, nextProfile, nextUnemploymentSummary, nextFirstEmploymentSummary, nextEntrepreneurshipSummary]) => {
        setSummary(nextSummary);
        setProfile(nextProfile);
        setUnemploymentSummary(nextUnemploymentSummary);
        setFirstEmploymentSummary(nextFirstEmploymentSummary);
        setEntrepreneurshipSummary(nextEntrepreneurshipSummary);
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : String(cause)),
      )
      .finally(() => setLoading(false));
  }, [datasetId, filterQuery]);
  const labor = summary?.distributions.situacion_laboral_actual;
  const sectors = summary?.distributions.sector_trabajo_actual ?? summary?.distributions.sector_trabajo;
  const unemployed = labor
    ? countMatching(labor, ["no trabaja", "no trabajo", "búsqueda", "desemple"])
    : null;
  const points = profile?.cohortPoints ?? [];
  const tabs = [
    { key: "perfil", label: "Perfil" },
    { key: "trabajo", label: "Trabajo actual" },
    { key: "desempleo", label: "Sin empleo" },
    { key: "primer-empleo", label: "Primer empleo" },
    { key: "emprendimiento", label: "Emprendimiento" },
  ];
  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <PageHeading
          title="Perfil y empleabilidad"
          description="Situación laboral y sectores de inserción de las personas tituladas."
          tone="titulados"
        />
      </div>
      <DatasetSelect
        datasets={datasets}
        value={datasetId}
        onChange={setDatasetId}
        loading={datasetsLoading}
      />
      {summary && !printAll && (
        <FilterToolbar summary={summary} onQueryChange={setFilterQuery} />
      )}
      {loading && (
        <StatusPanel
          kind="loading"
          title="Cargando perfil"
          description="Consultando la situación laboral y el sector de trabajo."
        />
      )}
      {error && (
        <StatusPanel
          kind="warning"
          title="No se pudo cargar el perfil"
          description={error}
        />
      )}
      {!loading && !error && !summary && (
        <StatusPanel
          kind="info"
          title="Sin dataset de titulados"
          description="Importa un CSV de titulados desde Cargar datos para ver este perfil."
        />
      )}
      {summary && (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList variant="line" className="grid w-full grid-cols-5 border-b border-border-line bg-transparent">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key} className="min-w-0 px-2 text-center text-sm">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          {printAll ? tabs.map((tab) => (
            <section key={tab.key} className="print-tab-section">
              <h2 className="title-card mb-3">{tab.label}</h2>
              <EmploymentTabContent tab={tab.key} summary={summary} profile={{ ...(profile ?? { datasetId: "", validResponses: 0, cohortPoints: [] }), cohortPoints: points }} labor={labor} sectors={sectors} unemployed={unemployed} unemploymentSummary={unemploymentSummary} firstEmploymentSummary={firstEmploymentSummary} entrepreneurshipSummary={entrepreneurshipSummary} />
            </section>
          )) : <EmploymentTabContent tab={activeTab} summary={summary} profile={{ ...(profile ?? { datasetId: "", validResponses: 0, cohortPoints: [] }), cohortPoints: points }} labor={labor} sectors={sectors} unemployed={unemployed} unemploymentSummary={unemploymentSummary} firstEmploymentSummary={firstEmploymentSummary} entrepreneurshipSummary={entrepreneurshipSummary} />}
        </>
      )}
    </div>
  );
}

function EmploymentTabContent({
  tab,
  summary,
  profile,
  labor,
  sectors,
  unemployed,
  unemploymentSummary,
  firstEmploymentSummary,
  entrepreneurshipSummary,
}: {
  tab: string;
  summary: AnalyticsSummary;
  profile: EmploymentProfile | null;
  labor?: CategoryDistribution;
  sectors?: CategoryDistribution;
  unemployed: number | null;
  unemploymentSummary: AnalyticsSummary | null;
  firstEmploymentSummary: AnalyticsSummary | null;
  entrepreneurshipSummary: AnalyticsSummary | null;
}) {
  if (tab === "emprendimiento")
    return <EntrepreneurshipPanel summary={entrepreneurshipSummary} />;
  if (tab === "trabajo")
    return <CurrentWorkPanel summary={summary} sectors={sectors} />;
  if (tab === "desempleo")
    return (
      <UnemploymentPanel
        unemployed={unemployed}
        unemploymentSummary={unemploymentSummary}
      />
    );
  if (tab === "primer-empleo")
    return (
      <FirstEmploymentPanel
        summary={summary}
        unemployed={unemployed}
        firstEmploymentSummary={firstEmploymentSummary}
      />
    );
  return (
    <>
      <ProfileStatistics summary={summary} />
      <div className="grid items-start gap-5 lg:grid-cols-12">
        <CohortScatterCard
          points={profile?.cohortPoints ?? []}
          className="lg:col-span-7"
        />
        <SenioritySegmentationCard points={profile?.cohortPoints ?? []} className="lg:col-span-5" />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <EmploymentDonutCard
          distribution={labor}
          total={summary.validResponses}
        />
        <ProfileDistributionCard
          title="Sector de inserción laboral"
          description="Sector del trabajo actual de las personas tituladas ocupadas"
          distribution={sectors}
        />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-3">
        <AgeDistributionCard distribution={summary.distributions.edad_rango} />
        <GenderDistributionCard distribution={summary.distributions.genero} />
        <CareerTrajectoryCard professional={summary} unemployment={summary} />
      </div>
    </>
  );
}

function EntrepreneurshipPanel({
  summary,
}: {
  summary: AnalyticsSummary | null;
}) {
  const total = summary?.validResponses ?? 0;
  const origin = summary?.distributions.origen_emprendimiento;
  const deliverable = summary?.distributions.entregable_emprendimiento;
  const financing = summary?.distributions.financiamiento_emprendimiento;
  const satisfaction = summary?.distributions.satisfaccion_emprendimiento;
  const importance = summary?.distributions.importancia_formacion_emprendimiento;

  return (
    <Card className="rounded-xl border border-border-line shadow-sm">
      <CardHeader className="border-b border-border-line">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="title-card">
              Emprendimiento propio e iniciativas independientes
            </CardTitle>
            <CardDescription>
              Características, financiamiento, satisfacción e impacto formativo · n = {total}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      {total ? (
        <CardContent className="entrepreneurship-grid grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div>
            <h3 className="mb-4 text-sm font-semibold text-ink-900">
              Origen y fuentes de financiamiento
            </h3>
            <div className="space-y-4">
              <EntrepreneurshipDistribution label="Origen del emprendimiento" distribution={origin} color="#1f6fb5" />
              <EntrepreneurshipDistribution label="Tipo de producto/entregable" distribution={deliverable} />
              <EntrepreneurshipDistribution label="Financiamiento inicial" distribution={financing} />
            </div>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold text-ink-900">
              Valoración formativa y satisfacción
            </h3>
            <div className="space-y-4">
              <EntrepreneurshipDistribution label="Nivel de satisfacción con el emprendimiento" distribution={satisfaction} />
              <EntrepreneurshipDistribution label="Importancia de la formación universitaria" distribution={importance} />
            </div>
          </div>
        </CardContent>
      ) : (
        <Empty className="py-10">
          <EmptyTitle>Sin respuestas de emprendimiento</EmptyTitle>
          <EmptyDescription>
            No hay personas clasificadas como emprendimiento propio en este dataset.
          </EmptyDescription>
        </Empty>
      )}
    </Card>
  );
}

function EntrepreneurshipDistribution({ label, distribution, color = "#1f6fb5" }: { label: string; distribution?: CategoryDistribution; color?: string }) {
  const counts = distribution?.counts ?? {};
  const orderedLabels = label.includes("satisfacción") ? ["Insatisfecho", "Algo satisfecho", "Satisfecho"] : label.includes("Importancia") ? ["Nada importante", "Poco importante", "Importante", "Muy importante"] : undefined;
  const entries = orderedLabels ? orderedLabels.map((option) => {
    const source = Object.keys(counts).find((candidate) => normalizeAnalyticLabel(candidate) === normalizeAnalyticLabel(option));
    return [source ?? option, source ? counts[source] : 0] as [string, number];
  }) : Object.entries(counts).sort(([, left], [, right]) => right - left);
  const total = distribution?.validCount ?? 0;
  return (
    <div className="entrepreneurship-distribution space-y-2 py-1.5">
      <div className="text-sm font-medium text-ink-900">{label} <span className="text-xs font-normal text-ink-600">(n = {total})</span></div>
      {entries.length ? entries.map(([option, count]) => {
        const percent = distribution?.percentages[option] ?? 0;
        return <div key={option} className="space-y-1">
          <div className="flex flex-wrap justify-between gap-2 text-sm"><span className="min-w-0 break-words">{booleanLabel(option)}</span><strong className="whitespace-nowrap tabular-nums">{count} de {total} ({formatPercentValue(percent)})</strong></div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-container-high"><div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} /></div>
        </div>;
      }) : <span className="text-sm text-ink-600">Sin respuestas disponibles</span>}
    </div>
  );
}

function FirstEmploymentPanel({
  summary,
  unemployed,
  firstEmploymentSummary,
}: {
  summary: AnalyticsSummary;
  unemployed: number | null;
  firstEmploymentSummary: AnalyticsSummary | null;
}) {
  const experience =
    summary.distributions.es_primer_empleo ??
    summary.distributions.primera_experiencia_laboral;
  const timing = firstEmploymentSummary?.distributions.tiempo_primer_empleo;
  const employedTotal = Math.max(
    summary.validResponses - (unemployed ?? 0),
    0,
  );
  const continued = experience ? booleanCount(experience, true) : 0;
  const continuedPercent = formatPercentage(continued, employedTotal);
  const timingLabels = ["Ya trabajaba antes de titularse", "Menos de 1 mes", "Entre 1 - 4 meses", "Entre 4 - 8 meses", "Entre 8 - 12 meses", "Más de 12 meses"];
  const timingEntries = timingLabels.map((label) => {
    const source = Object.keys(timing?.counts ?? {}).find((candidate) => normalizeAnalyticLabel(candidate) === normalizeAnalyticLabel(label));
    return [source ?? label, source ? timing?.counts[source] ?? 0 : 0] as [string, number];
  });
  const branchTotal = timing?.validCount ?? 0;

  return (
    <Card className="rounded-xl border border-border-line shadow-sm">
      <CardHeader className="border-b border-border-line">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="title-card">
              Transición al primer empleo (rama n = {branchTotal})
            </CardTitle>
            <CardDescription>
              Tiempo transcurrido desde titulación/egreso hasta la primera contratación laboral
            </CardDescription>
          </div>
          <span className="rounded-md bg-surface-container-high px-3 py-1 text-xs font-semibold tabular-nums text-ink-900">
            n = {branchTotal}
          </span>
        </div>
      </CardHeader>
      <CardContent className="first-employment-grid grid items-start gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="h-fit rounded-xl border border-border-line bg-slate-50 shadow-none">
          <CardContent className="p-4">
            <p className="caption-bold uppercase tracking-wide text-primary">
              Continuidad primer empleo
            </p>
            <p className="mt-4 text-4xl font-semibold tabular-nums text-ink-900">
              {continued} de {employedTotal}{" "}
              <span className="text-base font-normal text-ink-600">
                ({continuedPercent})
              </span>
            </p>
            <p className="mt-2 text-sm text-ink-600">
              De los titulados actualmente ocupados, continúan trabajando en su primer empleo.
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${employedTotal ? (continued / employedTotal) * 100 : 0}%` }}
              />
            </div>
          </CardContent>
        </Card>
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink-900">
              Tiempo hasta el primer empleo
            </h3>
            <span className="text-xs tabular-nums text-ink-600">n = {branchTotal}</span>
          </div>
          {timingEntries.length ? (
            <div className="space-y-3">
              {timingEntries.map(([label, count], index) => {
                const percent = timing?.percentages[label] ?? 0;
                return (
                  <div key={label} className="space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span>{label}</span>
                      <span className="tabular-nums whitespace-nowrap font-medium">
                        {count} de {branchTotal} ({formatPercentage(count, branchTotal)})
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${percent}%`,
                          opacity: Math.max(0.45, 1 - index * 0.12),
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
        </div>
      </CardContent>
    </Card>
  );
}

function UnemploymentPanel({
  unemployed,
  unemploymentSummary,
}: {
  unemployed: number | null;
  unemploymentSummary: AnalyticsSummary | null;
}) {
  const previousExperience =
    unemploymentSummary?.distributions.primera_experiencia_laboral;
  const reasons = unemploymentSummary?.distributions.razon_no_trabaja;
  const total = unemploymentSummary?.validResponses ?? unemployed ?? 0;
  const previousCount = previousExperience
    ? booleanCount(previousExperience, true)
    : null;
  const previousPercent =
    previousCount == null ? null : formatPercentage(previousCount, total);
  const average = unemploymentSummary?.numericAverages.anios_desempleo;
  const median = unemploymentSummary?.numericMedians.anios_desempleo;
  const deviation =
    unemploymentSummary?.numericStandardDeviations.anios_desempleo;
  const reasonEntries = Object.entries(reasons?.counts ?? {}).sort(
    ([, left], [, right]) => right - left,
  );

  return (
    <Card className="rounded-xl border border-border-line shadow-sm">
      <CardHeader className="border-b border-border-line">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="title-card">
              Población sin empleo / En búsqueda activa (n = {unemployed ?? 0})
            </CardTitle>
            <CardDescription>
              Motivos y antecedentes laborales previos
            </CardDescription>
          </div>
          <span className="rounded-md bg-surface-container-high px-3 py-1 text-xs font-semibold tabular-nums text-ink-900">
            n = {unemployed ?? 0}
          </span>
        </div>
      </CardHeader>
      <CardContent className="unemployment-grid grid items-start gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        <div className="h-fit rounded-xl border border-border-line bg-surface-container-low p-4">
          <p className="label-default uppercase tracking-wider text-titulados">
            Experiencia laboral previa
          </p>
          <p className="mt-4 text-4xl font-semibold tabular-nums text-ink-900">
            {previousCount == null ? "—" : `${previousCount} de ${total}`}{" "}
            {previousPercent && (
              <span className="text-base font-normal text-ink-600">
                ({previousPercent})
              </span>
            )}
          </p>
          <p className="mt-2 text-sm text-ink-600">
            Han tenido trabajo formal con anterioridad al periodo actual de
            búsqueda.
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-high">
            <div
              className="h-full rounded-full bg-titulados transition-all duration-500"
              style={{ width: `${previousCount == null ? 0 : (previousCount / Math.max(total, 1)) * 100}%` }}
            />
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink-900">
              Razones por las que no trabaja
            </h3>
            <span className="text-xs text-ink-600">n = {reasons?.validCount ?? 0}</span>
          </div>
          {reasonEntries.length ? (
            <div className="mt-4 space-y-3">
              {reasonEntries.map(([label, count], index) => {
                const percent = reasons?.percentages[label] ?? 0;
                return (
                  <div key={label} className="space-y-1">
                    <div className="flex items-start justify-between gap-3 text-sm">
                      <span className="min-w-0 break-words">{label}</span>
                      <span className="whitespace-nowrap tabular-nums font-semibold">
                        {count} de {reasons?.validCount ?? 0} ({formatPercentage(count, reasons?.validCount ?? 0)})
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percent}%`, backgroundColor: unemploymentReasonColor(index) }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-ink-600">
              No hay razones mapeadas en este dataset. Vuelve a importar el CSV para aplicar el nuevo mapeo.
            </p>
          )}
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-surface-container-high pt-3">
            {[
              ["Media", average],
              ["Mediana", median],
              ["DE", deviation],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="caption-meta text-ink-600">{label} · años</p>
                <p className="mt-1 font-semibold tabular-nums text-ink-900">
                  {typeof value === "number" ? value.toFixed(1).replace(".", ",") : "—"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CurrentWorkPanel({
  summary,
  sectors,
}: {
  summary: AnalyticsSummary;
  sectors?: CategoryDistribution;
}) {
  const rubro = summary.distributions.rubro_trabajo_actual;
  const remuneration = summary.distributions.remuneracion_rango;
  const areas = summary.distributions.area_trabajo;
  const relevance = summary.distributions.pertinencia_trabajo_formacion;
  const workCount =
    rubro?.validCount ??
    remuneration?.validCount ??
    areas?.validCount ??
    sectors?.validCount ??
    0;
  return (
    <Card className="rounded-xl border border-border-line shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="title-card">
              Trabajo actual en organizaciones o empresas (n = {workCount})
            </CardTitle>
            <CardDescription>
              Detalles de contratación, áreas, remuneración y pertinencia
            </CardDescription>
          </div>
          <Badge tone="titulados">n = {workCount}</Badge>
        </div>
      </CardHeader>
      <CardContent className="work-current-grid grid gap-x-6 gap-y-8 border-t border-surface-container-high pt-5 lg:grid-cols-2">
        <MiniDistribution
          title="Rubro de la empresa"
          distribution={rubro}
        />
        <MiniDistribution
          title="Remuneración mensual líquida"
          distribution={remuneration}
          accent="amber"
        />
        <MiniDistribution
          title="Áreas dentro de la organización"
          distribution={areas}
          accent="purple"
          note="Varias respuestas posibles"
        />
        <StackedRelevanceCard distribution={relevance} />
      </CardContent>
    </Card>
  );
}


function CohortScatterCard({
  points,
  className = "",
}: {
  points: EmploymentProfile["cohortPoints"];
  className?: string;
}) {
  const years = points.map((point) => point.graduationYear);
  const values = points.map((point) => point.professionalYears);
  const mean = values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted.length
    ? sorted.length % 2
      ? sorted[(sorted.length - 1) / 2]
      : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : 0;
  const standardDeviation = values.length > 1
    ? Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1))
    : 0;
  const yearMin = years.length ? Math.min(...years) : 0;
  const yearMax = years.length ? Math.max(...years) : 1;
  const yearTicks = Array.from(
    { length: Math.max(1, yearMax - yearMin + 1) },
    (_, index) => yearMin + index,
  );
  const sameReferenceValue = Math.abs(mean - median) < 0.0001;
  const chartData: CohortChartPoint[] = points.map((point) => ({
    graduationYear: point.graduationYear,
    professionalYears: point.professionalYears,
    isOutlier: point.professionalYears > mean + standardDeviation,
  }));
  const outlierPoints = chartData.filter((point) => point.isOutlier);
  const chartConfig = {
    professionalYears: {
      label: "Años de vida profesional",
      color: "#1f6fb5",
    },
  };
  const renderScatterChart = (fixed = false) => (
    <ScatterChart
      {...(fixed ? { width: 960, height: 320 } : {})}
      margin={{ top: 18, right: fixed ? 28 : 18, bottom: fixed ? 34 : 30, left: fixed ? 52 : 18 }}
    >
      <CartesianGrid stroke="#dbe4ee" strokeDasharray="2 4" />
      <XAxis
        type="number"
        dataKey="graduationYear"
        domain={[yearMin - 0.5, yearMax + 0.5]}
        ticks={yearTicks}
        interval={0}
        tick={{ fill: "#0f172a", fontSize: 11 }}
        allowDecimals={false}
        label={{ value: "Año de titulación", position: "insideBottom", offset: -18, fill: "#475569", fontSize: 11 }}
      />
      <YAxis
        type="number"
        dataKey="professionalYears"
        domain={[0, Math.max(1, Math.ceil(Math.max(...values, 0)))]}
        tick={{ fill: "#64748b", fontSize: 10 }}
        width={fixed ? 44 : 28}
        allowDecimals={false}
        label={{ value: "Años de vida profesional", angle: -90, position: "insideLeft", fill: "#475569", fontSize: 11 }}
      />
      {sameReferenceValue ? (
        <ReferenceLine
          y={mean}
          stroke="#7c3aed"
          strokeDasharray="5 4"
          label={{ value: `Media = mediana: ${formatDecimal(mean, 1)} años`, fill: "#6d28d9", fontSize: 11, position: "insideTopLeft" }}
        />
      ) : (
        <>
          <ReferenceLine
            y={mean}
            stroke="#ef4444"
            strokeDasharray="5 4"
            label={{ value: `Media ${formatDecimal(mean, 1)} años`, fill: "#ef4444", fontSize: 11, position: "insideTopLeft" }}
          />
          <ReferenceLine
            y={median}
            stroke="#14a39a"
            strokeDasharray="3 4"
            label={{ value: `Mediana ${formatDecimal(median, 1)} años`, fill: "#0f766e", fontSize: 11, position: "insideBottomRight" }}
          />
        </>
      )}
      <Scatter
        name="Titulado individual"
        data={chartData}
        dataKey="professionalYears"
        fill="#1f6fb5"
        line={false}
        shape={(props: { cx?: number; cy?: number; payload?: { isOutlier?: boolean } }) => (
          <circle
            cx={props.cx}
            cy={props.cy}
            r={props.payload?.isOutlier ? 4.5 : 4}
            fill={props.payload?.isOutlier ? "#dc2626" : "#1f6fb5"}
            stroke="#ffffff"
            strokeWidth={1.5}
          />
        )}
        isAnimationActive={false}
      />
      {!fixed && (
        <ChartTooltip
          content={<CohortTooltip />}
        />
      )}
    </ScatterChart>
  );
  return (
    <Card className={`rounded-xl border-0 shadow-sm ${className}`}>
      <CardHeader>
        <CardTitle className="title-card">
          Años de vida profesional por cohorte
        </CardTitle>
        <CardDescription>
          Experiencia profesional según año de titulación · n = {points.length}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {points.length ? (
          <>
            <div className="overflow-hidden rounded-lg border border-border-line bg-slate-50 p-2">
              <div className="cohort-responsive-chart">
                <ChartContainer
                config={chartConfig}
                className="h-72 w-full min-w-0 aspect-auto"
                initialDimension={{ width: 760, height: 286 }}
              >
                {renderScatterChart()}
              </ChartContainer>
              </div>
              <div className="cohort-fixed-chart" aria-label="Gráfico de cohorte para impresión">
                {renderScatterChart(true)}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-600">
              <span>
                <i className="mr-1 inline-block size-2 rounded-full bg-titulados" />
                Titulado individual
              </span>
              {outlierPoints.length > 0 && <span><i className="mr-1 inline-block size-2 rounded-full bg-red-600" />Valor atípico</span>}
              {sameReferenceValue ? <span><i className="mr-1 inline-block w-4 border-t-2 border-dashed border-violet-600" />Media = mediana: {formatDecimal(mean, 1)} años</span> : <>
                <span><i className="mr-1 inline-block w-4 border-t-2 border-dashed border-red-500" />Media</span>
                <span><i className="mr-1 inline-block w-4 border-t-2 border-dashed border-teal-600" />Mediana</span>
              </>}
            </div>
            <div className="cohort-print-values" aria-label="Valores del gráfico por titulado">
              {points.map((point, index) => (
                <span key={`${point.graduationYear}-${point.professionalYears}-${index}`}>
                  {point.graduationYear}: {point.professionalYears} años{chartData[index]?.isOutlier ? " · atípico" : ""}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-ink-600">
            No hay registros numéricos suficientes para dibujar la cohorte.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ProfileStatistics({ summary }: { summary: AnalyticsSummary }) {
  const average = summary.numericAverages.anios_vida_profesional;
  const median = summary.numericMedians.anios_vida_profesional;
  const deviation = summary.numericStandardDeviations.anios_vida_profesional;
  const sameCentralValue =
    average != null && median != null && Math.abs(average - median) < 0.0001;
  return (
    <Card className="rounded-xl border border-border-line shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="caption-bold uppercase tracking-wider text-ink-600">
              Vida profesional (años)
            </p>
            <p className="mt-1 text-xs text-ink-600">
              {sameCentralValue
                ? `Media y mediana: ${formatDecimal(average!, 1)} años`
                : "Medidas descriptivas de la experiencia profesional"}
            </p>
          </div>
          <span className="font-bold tabular-nums text-titulados">
            n = {summary.validResponses}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 divide-x divide-border-line border-t border-border-line pt-4">
          <div className="px-3 first:pl-0">
            <p className="text-xs text-ink-600">Media</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-ink-900">
              {average == null ? "—" : formatDecimal(average, 1)}
              <span className="ml-1 text-sm font-medium text-ink-600">años</span>
            </p>
          </div>
          <div className="px-3">
            <p className="text-xs text-ink-600">Mediana</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-ink-900">
              {median == null ? "—" : formatDecimal(median, 1)}
              <span className="ml-1 text-sm font-medium text-ink-600">años</span>
            </p>
          </div>
          <div className="px-3 last:pr-0">
            <p className="text-xs text-ink-600">Desviación estándar</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-ink-900">
              {deviation == null ? "—" : formatDecimal(deviation, 1)}
              <span className="ml-1 text-sm font-medium text-ink-600">años</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SenioritySegmentationCard({
  points,
  className = "",
}: {
  points: EmploymentProfile["cohortPoints"];
  className?: string;
}) {
  const [threshold, setThreshold] = useState(5);
  const junior = points.filter(
    (point) => point.professionalYears <= threshold,
  ).length;
  const consolidated = Math.max(0, points.length - junior);
  const percent = (value: number) =>
    points.length ? (value / points.length) * 100 : 0;
  return (
    <Card
      className={`h-fit rounded-xl border border-border-line shadow-sm ${className}`}
    >
      <CardHeader>
        <CardTitle className="title-card">
          Segmentación de titulados por antigüedad
        </CardTitle>
        <CardDescription>
          Clasificación según años de ejercicio profesional posterior al egreso
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="print-hide rounded-lg border border-border-line bg-slate-50 p-3">
          <div className="flex items-center justify-between text-sm font-semibold">
            <span>Umbral de corte experiencia</span>
            <span className="rounded bg-white px-2 py-1 text-titulados">
              {threshold} años
            </span>
          </div>
          <Slider
            className="mt-3"
            min={3}
            max={8}
            step={1}
            value={[threshold]}
            onValueChange={([value]) => setThreshold(value)}
          />
          <div className="flex justify-between text-xs text-ink-600">
            <span>3 años (Reciente)</span>
            <span>5 años (Estándar)</span>
            <span>8 años (Senior)</span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border-line bg-slate-50 p-3">
            <p className="caption-bold text-titulados">JUNIOR / RECIENTE</p>
            <p className="display-kpi tabular-nums text-ink-900">
              {formatPercentValue(percent(junior))}
            </p>
            <p className="text-xs text-ink-600">
              {junior} de {points.length} titulados (≤ {threshold}a)
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-titulados"
                style={{ width: `${percent(junior)}%` }}
              />
            </div>
          </div>
          <div className="rounded-lg border border-border-line bg-slate-50 p-3">
            <p className="caption-bold text-ink-900">CONSOLIDADO</p>
            <p className="display-kpi tabular-nums text-ink-900">
              {formatPercentValue(percent(consolidated))}
            </p>
            <p className="text-xs text-ink-600">
              {consolidated} de {points.length} titulados (&gt; {threshold}a)
            </p>
            <div className="mt-2 h-1.5 rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-slate-800"
                style={{ width: `${percent(consolidated)}%` }}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-between border-t border-surface-container-high pt-2 text-xs text-ink-600">
          <span>Corte metodológico parametrizable</span>
          <strong className="text-ink-900">Total = {points.length}</strong>
        </div>
      </CardContent>
    </Card>
  );
}

const UsersIcon = Users;
const GraduationIcon = GraduationCap;
void UsersIcon;
void GraduationIcon;

function ProfileDistributionCard({
  title,
  description,
  distribution,
  className = "",
}: {
  title: string;
  description: string;
  distribution?: CategoryDistribution;
  className?: string;
}) {
  const entries = useMemo(
    () => Object.entries(distribution?.counts ?? {}),
    [distribution],
  );
  const validCount = distribution?.validCount ?? 0;
  const smallSample = validCount > 0 && validCount < 5;
  return (
    <Card className={`h-fit rounded-xl border-0 shadow-sm ${smallSample ? "border border-amber-300" : ""} ${className}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="title-card">{title}</CardTitle>
          {smallSample && <Badge tone="warning">Muestra pequeña · n = {validCount}</Badge>}
        </div>
        <CardDescription>
          {description}{" "}
          <span className="whitespace-nowrap">
            · n = {validCount}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length ? (
          <div className="space-y-4">
            {entries.map(([label, count], index) => {
              const percent = distribution?.percentages[label] ?? 0;
              return (
                <div key={label} className="space-y-1">
                  <div className="flex items-start justify-between gap-4 text-sm">
                    <span className="min-w-0 break-words font-medium">
                      {label}
                    </span>
                    <span className="tabular-nums whitespace-nowrap font-medium">
                      {count}{" "}
                      <span className="caption-meta text-ink-600">
                        ({formatPercentValue(percent)})
                      </span>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-surface-container-high">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percent}%`,
                        backgroundColor:
                          index === 0
                            ? "#1f6fb5"
                            : index === 1
                            ? "#1f6fb5"
                            : "#1f6fb5",
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
    </Card>
  );
}

function EmploymentDonutCard({
  distribution,
  total,
  className = "",
}: {
  distribution?: CategoryDistribution;
  total: number;
  className?: string;
}) {
  const entries = useMemo(
    () => Object.entries(distribution?.counts ?? {}),
    [distribution],
  );
  const employed = distribution
    ? countMatching(
        distribution,
        ["trabaja", "organización", "empresa", "emprend"],
        ["no trabaja", "búsqueda", "desemple"],
      )
    : 0;
  const occupiedPercent = total ? (employed / total) * 100 : 0;
  const chartData = entries.map(([label, value]) => ({ label, value }));
  const chartConfig = Object.fromEntries(
    entries.map(([label]) => [label, { label, color: laborColor(label) }]),
  );
  return (
    <Card className={`h-fit rounded-xl border-0 shadow-sm ${className}`}>
      <CardHeader>
        <CardTitle className="title-card">Estado laboral</CardTitle>
        <CardDescription>
          Situación ocupacional declarada · n = {total}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-5 sm:flex-row">
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
                {chartData.map((entry) => (
                  <Cell key={entry.label} fill={laborColor(entry.label)} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          </div>
          <div className="employment-donut-fixed absolute inset-0" aria-label="Dona de estado laboral para impresión">
            <PieChart width={144} height={144}>
              <Pie data={chartData} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={48} outerRadius={68} stroke="none" isAnimationActive={false}>
                {chartData.map((entry) => <Cell key={entry.label} fill={laborColor(entry.label)} />)}
              </Pie>
            </PieChart>
          </div>
          <div className="absolute inset-0 m-auto flex size-24 flex-col items-center justify-center rounded-full bg-white">
            <span className="title-card tabular-nums">
              {formatPercentValue(occupiedPercent)}
            </span>
            <span className="caption-meta uppercase text-ink-600">
              Ocupados
            </span>
          </div>
        </div>
        <div className="min-w-0 w-full space-y-2">
          {entries.map(([label, count]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3 rounded-lg border border-border-line bg-surface-container-low px-3 py-2 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="size-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: laborColor(label) }}
                />
                <span className="break-words">{displayLaborLabel(label)}</span>
              </div>
              <span className="tabular-nums whitespace-nowrap font-semibold">
                {count}{" "}
                <span className="caption-meta text-ink-600">
                  ({formatPercentValue(distribution?.percentages[label] ?? 0)})
                </span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
      <div className="mx-6 border-t border-surface-container-high py-3 text-xs text-ink-600">
        Tasa de personas ocupadas: {employed} de {total} titulados
      </div>
    </Card>
  );
}

function laborColor(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("emprend")) return "#14a39a";
  if (
    normalized.includes("busqueda") ||
    normalized.includes("desemple") ||
    normalized.includes("no trabaja")
  )
    return "#f2a33a";
  return "#1f6fb5";
}

function unemploymentReasonColor(_index: number) {
  return "#1f6fb5";
}

function AgeDistributionCard({
  distribution,
}: {
  distribution?: CategoryDistribution;
}) {
  return (
    <Card className="h-fit rounded-xl border border-border-line shadow-sm">
      <CardHeader>
        <CardTitle className="title-card">
          Distribución por edad (n = {distribution?.validCount ?? 0})
        </CardTitle>
        <CardDescription>Rangos de edad en orden cronológico</CardDescription>
      </CardHeader>
      <CardContent>
        <DistributionBars distribution={distribution} order={["15 - 18 años", "19 - 22 años", "23 - 26 años", "27 - 30 años", "31 - 34 años", "35 años o más"]} />
      </CardContent>
      <CardContent className="flex justify-between border-t border-surface-container-high py-3 text-xs text-ink-600">
        <span>Grupo mayoritario: {majorityLabel(distribution)}</span>
        <strong className="text-ink-900">
          n = {distribution?.validCount ?? 0}
        </strong>
      </CardContent>
    </Card>
  );
}

function GenderDistributionCard({
  distribution,
}: {
  distribution?: CategoryDistribution;
}) {
  const entries = Object.entries(distribution?.counts ?? {});
  const total = distribution?.validCount ?? 0;
  let offset = 0;
  const segments = entries.map(([label]) => {
    const percentage = distribution?.percentages[label] ?? 0;
    const segment = `${label.toLowerCase().includes("muj") ? "#8b5bd1" : "#1f6fb5"} ${offset}% ${offset + percentage}%`;
    offset += percentage;
    return segment;
  });
  return (
    <Card className="h-fit rounded-xl border border-border-line shadow-sm">
      <CardHeader>
        <CardTitle className="title-card">Género (n = {total})</CardTitle>
        <CardDescription>Composición declarada en encuesta</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center gap-5 py-5">
        <div
          className="relative flex size-28 shrink-0 items-center justify-center rounded-full"
          style={{
            background: entries.length
              ? `conic-gradient(${segments.join(", ")})`
              : "#e2e8f0",
          }}
        >
          <div className="flex size-20 flex-col items-center justify-center rounded-full bg-white">
            <span className="title-card tabular-nums">{total}</span>
            <span className="caption-meta uppercase text-ink-600">Total</span>
          </div>
        </div>
        <div className="min-w-0 space-y-2">
          {entries.map(([label, count]) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded border border-border-line bg-surface-container-low px-2.5 py-2 text-sm"
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{
                  backgroundColor: label.toLowerCase().includes("muj")
                    ? "#8b5bd1"
                    : "#1f6fb5",
                }}
              />
              <span className="min-w-0 break-words">
                {label}: <strong>{count}</strong>{" "}
                <span className="text-xs">
                  ({formatPercentValue(distribution?.percentages[label] ?? 0)})
                </span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
      <CardContent className="flex justify-between border-t border-surface-container-high py-3 text-xs text-ink-600">
        <span>
          {entries
            .map(([label]) => `${label}: ${formatPercentValue(distribution?.percentages[label] ?? 0)}`)
            .join(" · ")}
        </span>
        <strong className="text-ink-900">n = {total}</strong>
      </CardContent>
    </Card>
  );
}

function CareerTrajectoryCard({
  professional,
  unemployment,
}: {
  professional: AnalyticsSummary;
  unemployment: AnalyticsSummary;
}) {
  const professionalDeviation =
    professional.numericStandardDeviations.anios_vida_profesional;
  const unemploymentDeviation =
    unemployment.numericStandardDeviations.anios_desempleo;
  return (
    <Card className="h-fit rounded-xl border border-border-line shadow-sm">
      <CardHeader>
        <CardTitle className="title-card">Trayectoria y búsqueda</CardTitle>
        <CardDescription>
          Años de ejercicio y periodos sin empleo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <MetricPanel
          title="Vida profesional"
          average={professional.numericAverages.anios_vida_profesional}
          median={professional.numericMedians.anios_vida_profesional}
          deviation={professionalDeviation}
        />
        <MetricPanel
          title="Tiempo en búsqueda activa"
          average={unemployment.numericAverages.anios_desempleo}
          median={unemployment.numericMedians.anios_desempleo}
          deviation={unemploymentDeviation}
        />
      </CardContent>
      <CardContent className="flex justify-between border-t border-surface-container-high py-3 text-xs text-ink-600">
        <span>Parámetros calculados en años calendario</span>
        <strong className="text-ink-900">Base válida</strong>
      </CardContent>
    </Card>
  );
}

function MetricPanel({
  title,
  average,
  median,
  deviation,
}: {
  title: string;
  average?: number;
  median?: number;
  deviation: number | null | undefined;
}) {
  return (
    <div className="rounded-lg border border-border-line bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-titulados">{title}</span>
        <span className="text-xs text-ink-600">
          DE: ± {deviation == null ? "—" : `${formatDecimal(deviation, 1)} años`}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-600">
        Media:{" "}
        <strong className="text-base tabular-nums text-ink-900">
            {average == null ? "—" : formatDecimal(average, 1)}
        </strong>{" "}
        años{" "}
        <span>
          Mediana:{" "}
          <strong className="text-base tabular-nums text-ink-900">
            {median == null ? "—" : formatDecimal(median, 1)}
          </strong>{" "}
          años
        </span>
      </div>
    </div>
  );
}

function DistributionBars({
  distribution,
  order,
}: {
  distribution?: CategoryDistribution;
  order?: string[];
}) {
  const counts = distribution?.counts ?? {};
  const orderedEntries = order ? order.map((label) => {
    const source = Object.keys(counts).find((candidate) => normalizeAnalyticLabel(candidate) === normalizeAnalyticLabel(label));
    return [source ?? label, source ? counts[source] : 0] as [string, number];
  }) : Object.entries(counts);
  const assigned = orderedEntries.reduce((sum, [, count]) => sum + count, 0);
  const unclassified = Math.max(0, (distribution?.validCount ?? assigned) - assigned);
  const entries = unclassified ? [...orderedEntries, ["Sin clasificar", unclassified] as [string, number]] : orderedEntries;
  return entries.length ? (
    <div className="space-y-3">
      {entries.map(([label, count]) => {
        const percentage = distribution?.percentages[label] ?? 0;
        return (
          <div key={label} className="space-y-1">
            <div className="flex justify-between gap-3 text-sm">
              <span>{label}</span>
              <span className="tabular-nums whitespace-nowrap">
                {count} de {distribution?.validCount} ({formatPercentValue(percentage)})
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
              <div
                className="h-full rounded-full bg-titulados"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  ) : (
    <Empty className="py-8">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox />
        </EmptyMedia>
        <EmptyTitle>Sin respuestas disponibles</EmptyTitle>
        <EmptyDescription>
          No hay respuestas válidas para mostrar esta distribución.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function majorityLabel(distribution?: CategoryDistribution) {
  const entry = Object.entries(distribution?.counts ?? {}).sort(
    ([, a], [, b]) => b - a,
  )[0];
  return entry?.[0] ?? "—";
}

function countMatching(
  distribution: CategoryDistribution,
  fragments: string[],
  excluded: string[] = [],
) {
  return Object.entries(distribution.counts)
    .filter(([label]) => {
      const normalized = label.toLowerCase();
      return (
        fragments.some((fragment) => normalized.includes(fragment)) &&
        !excluded.some((fragment) => normalized.includes(fragment))
      );
    })
    .reduce((total, [, count]) => total + count, 0);
}
function formatPercentage(value: number, total: number) {
  return `${total ? ((value / total) * 100).toFixed(1).replace(".", ",") : "0,0"} %`;
}

function booleanCount(distribution: CategoryDistribution, value: boolean) {
  const key = Object.keys(distribution.counts).find(
    (item) => item.toLowerCase() === String(value),
  );
  return key ? distribution.counts[key] : 0;
}
function booleanLabel(value: string) {
  if (value.toLowerCase() === "true") return "Sí";
  if (value.toLowerCase() === "false") return "No";
  const normalized = value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-BO");
  if (!normalized) return normalized;
  const sentence =
    normalized.charAt(0).toLocaleUpperCase("es-BO") + normalized.slice(1);
  return sentence
    .replace(/\bia\b/gi, "IA")
    .replace(/\bdevops\b/gi, "DevOps")
    .replace(/\b(modular|presencial|virtual)\(/gi, "$1 (");
}

export function CompetencePage({ domain, printAll = false }: { domain: Domain; printAll?: boolean }) {
  const tone: Tone = domain === "TITULADOS" ? "titulados" : "empleadores";
  const {
    datasets,
    datasetId,
    setDatasetId,
    loading: datasetsLoading,
  } = useDatasets(domain);
  const [filterQuery, setFilterQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("");
  const [activeTab, setActiveTab] = useState("hard");
  const { items, satisfaction, curriculum, loading, error } = useCompetenceData(domain, datasetId, filterQuery);
  useEffect(() => {
    if (!items.length) {
      setActiveGroup("");
      return;
    }
    const firstHard = items.find((item) => item.group.toLowerCase().includes("hard"));
    const firstSoft = items.find((item) => item.group.toLowerCase().includes("soft"));
    setActiveTab(firstHard ? "hard" : firstSoft ? "soft" : "hard");
    setActiveGroup((firstHard ?? firstSoft ?? items[0])?.group ?? "");
  }, [items]);
  const groups = useMemo(
    () => [...new Set(items.map((item) => item.group))],
    [items],
  );
  const tabGroup = (tab: string) =>
    tab === "hard"
      ? groups.find((group) => group.toLowerCase().includes("hard"))
      : tab === "soft"
        ? groups.find((group) => group.toLowerCase().includes("soft"))
        : undefined;
  const visibleItems = useMemo(
    () =>
      items
        .filter((item) => item.group === activeGroup)
        .sort((a, b) => b.average - a.average),
    [items, activeGroup],
  );
  const average = visibleItems.length
    ? visibleItems.reduce((sum, item) => sum + item.average, 0) /
      visibleItems.length
    : 0;
  const lowest = visibleItems.length
    ? visibleItems.reduce((current, item) => item.average < current.average ? item : current)
    : undefined;
  const highest = visibleItems.length
    ? visibleItems.reduce((current, item) => item.average > current.average ? item : current)
    : undefined;
  const tabs = domain === "TITULADOS"
    ? [
        { key: "hard", label: "Hard skills" },
        { key: "soft", label: "Soft skills" },
        { key: "satisfaccion", label: "Satisfacción y pertinencia" },
        { key: "malla", label: "Malla y asignaturas" },
      ]
    : [
        { key: "hard", label: "Hard skills" },
        { key: "soft", label: "Soft skills" },
      ];
  if (printAll && domain === "TITULADOS")
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <PageHeading title="Brechas de competencias" description="Competencias, satisfacción, pertinencia y malla curricular." tone={tone} />
        {satisfaction && !printAll && <FilterToolbar summary={satisfaction} onQueryChange={setFilterQuery} />}
        {(["hard", "soft"] as const).map((key) => {
          const group = tabGroup(key);
          const groupItems = items.filter((item) => item.group === group).sort((a, b) => b.average - a.average);
          return <section key={key} className="print-tab-section"><h2 className="title-card mb-3">{key === "hard" ? "Hard skills" : "Soft skills"}</h2><CompetencePrintGroup items={groupItems} group={group ?? ""} tone={tone} /></section>;
        })}
        <section className="print-tab-section"><h2 className="title-card mb-3">Satisfacción y pertinencia</h2><SatisfactionPanelView summary={satisfaction} /></section>
        <section className="print-tab-section"><h2 className="title-card mb-3">Malla y asignaturas</h2><CurriculumPanel summary={curriculum} /></section>
      </div>
    );
  if (activeTab === "satisfaccion" || activeTab === "malla")
    return (
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <PageHeading
            title="Brechas de competencias"
            description={
              activeTab === "malla"
                ? "Aspectos útiles, oportunidades de mejora y asignaturas relevantes de la carrera."
                : "Satisfacción global y pertinencia con el mercado laboral."
            }
            tone={tone}
          />
        </div>
        <DatasetSelect
          datasets={datasets}
          value={datasetId}
          onChange={setDatasetId}
          loading={datasetsLoading}
        />
        {domain === "TITULADOS" && (satisfaction ?? curriculum) && (
          <FilterToolbar
            summary={(satisfaction ?? curriculum)!}
            onQueryChange={setFilterQuery}
          />
        )}
        <Tabs
          value={activeTab}
          onValueChange={(key) => {
            setActiveTab(key);
            const group = tabGroup(key);
            if (group) setActiveGroup(group);
          }}
        >
          <TabsList variant="line" className="w-full justify-start">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        {activeTab === "satisfaccion" ? (
          <SatisfactionPanelView summary={satisfaction} />
        ) : (
          <CurriculumPanel summary={curriculum} />
        )}
      </div>
    );
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <PageHeading
          title="Brechas de competencias"
        description={
          domain === "EMPLEADORES"
            ? "Medias y desviaciones estándar por competencia. Los valores no observados se excluyen del cálculo."
            : "Medias y desviaciones estándar por competencia."
        }
          tone={tone}
        />
      </div>
      <DatasetSelect
        datasets={datasets}
        value={datasetId}
        onChange={setDatasetId}
        loading={datasetsLoading}
      />
      {domain === "TITULADOS" && !printAll && (satisfaction || curriculum) && (
        <FilterToolbar
          summary={(satisfaction ?? curriculum)!}
          onQueryChange={setFilterQuery}
        />
      )}
      {loading && (
        <StatusPanel
          kind="loading"
          title="Cargando competencias"
          description="Consultando las valoraciones del dataset."
        />
      )}
      {error && (
        <StatusPanel
          kind="warning"
          title="No se pudo cargar competencias"
          description={error}
        />
      )}
      {!loading && !error && !datasetId && (
        <StatusPanel
          kind="info"
          title="Sin dataset seleccionado"
          description="Selecciona o importa un dataset para mostrar la tabla."
        />
      )}
      {items.length > 0 && (
        <>
          <Tabs
            value={activeTab}
            onValueChange={(key) => {
              setActiveTab(key);
              const group = tabGroup(key);
              if (group) setActiveGroup(group);
            }}
          >
            <TabsList variant="line" className="w-full justify-start">
              {tabs.map((tab) => {
                const group = tabGroup(tab.key);
                const available =
                  Boolean(group) ||
                  (domain === "TITULADOS" &&
                    (tab.key === "satisfaccion" || tab.key === "malla"));
                return (
                  <TabsTrigger key={tab.key} value={tab.key} disabled={!available}>
                    {tab.label}
                    {!available && (
                      <span className="text-[10px] uppercase tracking-wide">
                        Próximamente
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
          {!tabGroup(activeTab) ? (
            <StatusPanel
              kind="info"
              title="Sección preparada"
              description="Esta pestaña forma parte del prototipo, pero todavía no existe un endpoint con los datos necesarios para mostrarla."
            />
          ) : (
            <>
              <div className="competence-kpi-grid grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="h-full"><KpiCard
                  label="Competencias evaluadas"
                  value={String(visibleItems.length)}
                  detail={`${groupDisplayName(activeGroup)} evaluadas`}
                  icon={ListChecks}
                  tone={tone}
                /></div>
                <div className="h-full"><KpiCard
                  label={`Promedio de ${groupDisplayName(activeGroup)}`}
                  value={average ? `${formatDecimal(average)} de 5` : "—"}
                  detail={`Promedio de las ${visibleItems.length} competencias`}
                  icon={BarChart3}
                  tone={tone}
                /></div>
                <div className="h-full"><KpiCard
                  label="Competencia más baja"
                  value={lowest ? formatDecimal(lowest.average) : "—"}
                  detail={lowest?.name ?? "Sin datos"}
                  icon={TrendingDown}
                  tone={tone}
                /></div>
                <div className="h-full"><KpiCard
                  label="Competencia más alta"
                  value={highest ? formatDecimal(highest.average) : "—"}
                  detail={highest?.name ?? "Sin datos"}
                  icon={TrendingUp}
                  tone={tone}
                /></div>
              </div>
              <div className="grid items-start gap-6 lg:grid-cols-12">
                <CompetenceHeatmap
                  items={visibleItems}
                  className="lg:col-span-7"
                />
                <CompetenceRadarView
                  items={visibleItems}
                  className="lg:col-span-5"
                />
              </div>
              <CompetenceStatsTableView
                items={visibleItems}
                group={groupLabel(activeGroup)}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

function CurriculumPanel({ summary }: { summary: AnalyticsSummary | null }) {
  if (!summary)
    return (
      <StatusPanel
        kind="loading"
        title="Cargando malla y asignaturas"
        description="Consultando las respuestas de selección múltiple."
      />
    );
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <CurriculumCardView
        title="Aspectos de la Carrera que resultaron útiles"
        field="aspectos_utiles"
        summary={summary}
        tone="blue"
      />
      <CurriculumCardView
        title="Aspectos de la Carrera que pueden mejorarse"
        field="aspectos_mejorables"
        summary={summary}
        tone="orange"
      />
      <CurriculumCardView
        title="Asignaturas que dieron ventaja competitiva"
        field="asignaturas_ventaja"
        summary={summary}
        tone="teal"
      />
      <CurriculumCardView
        title="Asignaturas percibidas poco útiles o desactualizadas"
        field="asignaturas_poco_utiles"
        summary={summary}
        tone="orange"
      />
    </div>
  );
}



function CompetencePrintGroup({ items, group, tone }: { items: Competence[]; group: string; tone: Tone }) {
  const average = items.length ? items.reduce((sum, item) => sum + item.average, 0) / items.length : 0;
  const lowest = items.length ? items.reduce((current, item) => item.average < current.average ? item : current) : undefined;
  const highest = items.length ? items.reduce((current, item) => item.average > current.average ? item : current) : undefined;
  return <>
    <div className="competence-kpi-grid grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="h-full"><KpiCard label="Competencias evaluadas" value={String(items.length)} detail={`${groupDisplayName(group)} evaluadas`} icon={ListChecks} tone={tone} /></div>
      <div className="h-full"><KpiCard label={`Promedio de ${groupDisplayName(group)}`} value={average ? `${formatDecimal(average)} de 5` : "—"} detail={`Promedio de las ${items.length} competencias`} icon={BarChart3} tone={tone} /></div>
      <div className="h-full"><KpiCard label="Competencia más baja" value={lowest ? formatDecimal(lowest.average) : "—"} detail={lowest?.name ?? "Sin datos"} icon={TrendingDown} tone={tone} /></div>
      <div className="h-full"><KpiCard label="Competencia más alta" value={highest ? formatDecimal(highest.average) : "—"} detail={highest?.name ?? "Sin datos"} icon={TrendingUp} tone={tone} /></div>
    </div>
    <div className="print-competence-matrix">
      <CompetenceHeatmap items={items} />
    </div>
    <div className="print-competence-radar">
      <CompetenceRadarView items={items} />
    </div>
    <CompetenceStatsTableView items={items} group={group} />
  </>;
}

function formatDecimal(value: number, digits = 2) {
  return value.toFixed(digits).replace(".", ",");
}

function formatPercentValue(value: number, digits = 1) {
  return `${value.toFixed(digits).replace(".", ",")} %`;
}

function parseInteger(value: string, fallback: number) {
  if (value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}
function groupLabel(group: string) {
  return group === "HARD_SKILL"
    ? "Hard skills"
    : group === "SOFT_SKILL"
      ? "Soft skills"
      : group
          .replaceAll("_", " ")
          .toLowerCase()
          .replace(/\b\w/g, (letter) => letter.toUpperCase());
}




export function SimulationPage() {
  const {
    datasets,
    datasetId,
    setDatasetId,
    loading: datasetsLoading,
  } = useDatasets("TITULADOS");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [variable, setVariable] = useState("area_posgrado_interes");
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [sampleSize, setSampleSize] = useState(100);
  const [sampleSizeInput, setSampleSizeInput] = useState("100");
  const [repetitions, setRepetitions] = useState(1000);
  const [repetitionsInput, setRepetitionsInput] = useState("1000");
  const [seed, setSeed] = useState(42);
  const [seedInput, setSeedInput] = useState("42");
  const [result, setResult] = useState<Simulation | null>(null);
  const [scenarioPercentages, setScenarioPercentages] = useState<Record<string, number> | null>(null);
  const [executedRun, setExecutedRun] = useState<SimulationRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const simulationAbortRef = useRef<AbortController | null>(null);
  const simulationRequestRef = useRef(0);
  const sampleSizeValid = Number.isInteger(sampleSize) && sampleSize >= 1 && sampleSize <= 10000;
  const repetitionsValid = Number.isInteger(repetitions) && repetitions >= 1 && repetitions <= 5000;
  const seedValid = Number.isInteger(seed);
  const parametersValid = sampleSizeValid && repetitionsValid && seedValid;
  useEffect(() => {
    if (!datasetId) return;
    apiRequest<AnalyticsSummary>(
      `/analytics/titulados/summary?datasetId=${encodeURIComponent(datasetId)}&fields=${encodeURIComponent(variable)}`,
    )
      .then((next) => {
        setSummary(next);
        setWeights({});
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : String(cause)),
      );
  }, [datasetId, variable]);
  async function run() {
    if (!parametersValid || !datasetId) {
      setError("Revisa los parámetros: deben ser números enteros válidos dentro de los límites indicados.");
      return;
    }
    const distribution = summary?.distributions[variable];
    if (!distribution) return;
    const categories = simulationCategories(variable, distribution.counts);
    const observedWeights = categories.map((category) => weights[category] ?? distribution.counts[category] ?? 0);
    const total = observedWeights.reduce((sum, value) => sum + value, 0);
    const adjusted = categories.some(
      (category) => weights[category] !== undefined && weights[category] !== distribution.counts[category],
    );
    const nextScenarioPercentages = adjusted
      ? Object.fromEntries(categories.map((category, index) => [category, (observedWeights[index] * 100) / total]))
      : null;
    simulationAbortRef.current?.abort();
    const controller = new AbortController();
    simulationAbortRef.current = controller;
    const requestId = ++simulationRequestRef.current;
    setLoading(true);
    setError(null);
    try {
      const nextResult = await apiRequest<Simulation>("/analytics/simulation/multinomial", {
          method: "POST",
          body: JSON.stringify({
            categories,
            probabilities: observedWeights.map((value) => value / total),
            observedCounts: categories.map((category) => distribution.counts[category] ?? 0),
            sampleSize,
            repetitions,
            seed,
          }),
          signal: controller.signal,
        });
      if (requestId !== simulationRequestRef.current) return;
      setResult(nextResult);
      setScenarioPercentages(nextScenarioPercentages);
      setExecutedRun({
        result: nextResult,
        datasetId,
        variable,
        variableLabel: simulationVariableLabel(variable),
        observedTotal: distribution.validCount,
        datasetName: datasets.find((dataset) => dataset.id === datasetId)?.displayName ?? datasetId ?? "No especificado",
        observedProbabilities: Object.fromEntries(categories.map((category) => [category, (distribution.counts[category] ?? 0) / Math.max(distribution.validCount, 1)])),
        usedProbabilities: Object.fromEntries(categories.map((category, index) => [category, observedWeights[index] / Math.max(total, 1)])),
        adjusted,
        categoryLabel: simulationCategoryLabel,
        weights: { ...weights },
        scenarioPercentages: nextScenarioPercentages,
      });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (requestId === simulationRequestRef.current) setLoading(false);
    }
  }
  useEffect(() => {
    if (!summary?.distributions[variable] || !datasetId || !parametersValid) return;
    const timeout = window.setTimeout(() => void run(), 250);
    return () => window.clearTimeout(timeout);
  }, [summary, datasetId, variable, weights, sampleSize, repetitions, seed, parametersValid]);
  return (
      <div className="simulation-screen-page mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <PageHeading
          title="Simulación de escenarios"
          description="Escenarios hipotéticos mediante muestreo Monte Carlo con transformada inversa."
          tone="titulados"
        />
        <div className="flex flex-wrap items-center gap-2">
          <SimulationDownloadMenu run={executedRun} />
        </div>
      </div>
      <DatasetSelect
        datasets={datasets}
        value={datasetId}
        onChange={setDatasetId}
        loading={datasetsLoading}
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
        <Card className="h-fit rounded-xl border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="title-card">Parámetros de la simulación</CardTitle>
            <CardDescription>Se recalcula automáticamente. No es una predicción.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="label-default grid gap-1">
              Variable a simular
              <Select value={variable} onValueChange={setVariable}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="area_posgrado_interes">Área de posgrado de interés</SelectItem>
                  <SelectItem value="nivel_posgrado_interes">Nivel de posgrado de interés</SelectItem>
                  <SelectItem value="modalidad_posgrado">Modalidad preferida</SelectItem>
                  <SelectItem value="financiamiento_posgrado_estimado">Fuente de financiamiento estimada</SelectItem>
                  <SelectItem value="interes_posgrado">Interés en posgrado</SelectItem>
                  <SelectItem value="situacion_laboral_actual">Estado laboral</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="label-default grid gap-1">
              Personas a simular (N)
              <Input className="w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" type="number" min="1" max="10000" step="1" value={sampleSizeInput} aria-invalid={!sampleSizeValid} onChange={(event) => setSampleSizeInput(event.target.value)} onBlur={() => setSampleSize(parseInteger(sampleSizeInput, sampleSize))} />
              {!sampleSizeValid && <span className="text-xs text-destructive">Usa un entero entre 1 y 10.000.</span>}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="label-default grid gap-1">
                Réplicas (R)
                <Input className="control" type="number" min="1" max="5000" step="1" value={repetitionsInput} aria-invalid={!repetitionsValid} onChange={(event) => setRepetitionsInput(event.target.value)} onBlur={() => setRepetitions(parseInteger(repetitionsInput, repetitions))} />
                {!repetitionsValid && <span className="text-xs text-destructive">Entre 1 y 5.000.</span>}
              </label>
              <label className="label-default grid gap-1">
                Semilla
                <div className="flex gap-1">
                  <Input className="control min-w-0 flex-1" type="number" step="1" value={seedInput} aria-invalid={!seedValid} onChange={(event) => setSeedInput(event.target.value)} onBlur={() => setSeed(parseInteger(seedInput, seed))} />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button type="button" variant="outline" size="icon" className="size-8" aria-label="Volver a sortear" onClick={() => { const nextSeed = Math.floor(Math.random() * 2147483647) + 1; setSeed(nextSeed); setSeedInput(String(nextSeed)); }}>
                          <Dices className="size-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Volver a sortear</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </label>
            </div>
            {summary && <SimulationWeights variable={variable} distribution={summary.distributions[variable]} weights={weights} setWeights={setWeights} />}
            <p className="rounded-md bg-surface-container-low p-2 text-xs text-ink-600">Las probabilidades parten de las frecuencias observadas y se pueden ajustar con los controles.</p>
          </CardContent>
        </Card>
        <div className="space-y-5">
          {result ? <SimulationDistribution result={result} observedTotal={executedRun?.observedTotal ?? summary?.distributions[variable]?.validCount ?? 0} loading={loading} /> : <StatusPanel kind="info" title="Calculando simulación" description="La distribución se generará automáticamente con su rango del 95 % de las repeticiones." />}
        </div>
      </div>
      {error && (
        <StatusPanel
          kind="warning"
          title="No se pudo ejecutar la simulación"
          description={error}
        />
      )}
      {result && <SimulationComparisonTable result={result} observedTotal={executedRun?.observedTotal ?? summary?.distributions[variable]?.validCount ?? 0} scenarioPercentages={executedRun?.scenarioPercentages ?? scenarioPercentages} />}
      {executedRun && (
        <div className="print-only print-page simulation-pdf-page space-y-3" aria-label="Versión de impresión de la simulación">
          <h2 className="headline-page">Simulación de escenarios: {executedRun.variableLabel}</h2>
          <p className="text-sm text-ink-600">Dataset: {executedRun.datasetName} · Generado: {new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", dateStyle: "short" }).format(new Date())}</p>
          <p className="text-sm font-semibold text-amber-800">Escenario hipotético, no es una predicción</p>
          <div className="simulation-pdf-parameters grid grid-cols-6 gap-2 rounded-lg bg-surface-container-low p-3 text-xs">
            <span><strong>Variable</strong><br />{executedRun.variableLabel}</span>
            <span><strong>Personas (N)</strong><br />{executedRun.result.sampleSize}</span>
            <span><strong>Réplicas (R)</strong><br />{executedRun.result.repetitions}</span>
            <span><strong>Semilla</strong><br />{executedRun.result.seed}</span>
            <span><strong>Probabilidades</strong><br />{executedRun.adjusted ? "Ajustadas manualmente" : "Observadas"}</span>
            <span><strong>Método</strong><br />Monte Carlo por transformada inversa</span>
          </div>
          <div className="rounded-lg border border-border-line p-3 text-xs">
            <strong>Probabilidades {executedRun.adjusted ? "observadas y usadas" : "observadas"}</strong>
            <div className="mt-1 grid grid-cols-2 gap-x-5 gap-y-1">
              {executedRun.result.categories.map((category) => (
                <span key={category.category}>
                  {executedRun.categoryLabel(category.category)}: {simulationPercent((executedRun.observedProbabilities[category.category] ?? 0) * 100)}
                  {executedRun.adjusted && ` → ${simulationPercent((executedRun.usedProbabilities[category.category] ?? 0) * 100)}`}
                </span>
              ))}
            </div>
          </div>
          <SimulationDistribution result={executedRun.result} observedTotal={executedRun.observedTotal} loading={false} />
          <SimulationComparisonTable result={executedRun.result} observedTotal={executedRun.observedTotal} scenarioPercentages={executedRun.scenarioPercentages} />
          <div className="simulation-pdf-notes border-t border-surface-container-high pt-2 text-xs text-ink-700">
            <p>El rango del 95 % es el intervalo en que cayeron el 95 % de las réplicas. No es un intervalo de confianza.</p>
            <p className="font-semibold text-amber-800">Base observada n = {executedRun.observedTotal}: muestra muy pequeña.</p>
            <p>Semilla: {executedRun.result.seed}. Permite repetir exactamente el resultado.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function displayLaborLabel(label: string) {
  const normalized = label.toLocaleLowerCase("es-BO");
  return normalized.includes("no trabaja") || normalized.includes("no trabajo") || normalized.includes("busqueda") || normalized.includes("desemple")
    ? "Sin empleo"
    : label;
}

function normalizeAnalyticLabel(value: string) {
  return value.toLocaleLowerCase("es-BO").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[‐‑‒–—-]/g, "-").replace(/\s*-\s*/g, "-").replace(/\s+/g, " ").trim();
}

function groupDisplayName(group: string) {
  return group === "HARD_SKILL" || group === "Hard skills" ? "hard skills" : group === "SOFT_SKILL" || group === "Soft skills" ? "soft skills" : groupLabel(group).toLowerCase();
}


export function UnavailableAnalyticPage({
  title,
  description,
  domain,
  items,
}: {
  title: string;
  description: string;
  domain: Domain;
  items: string[];
}) {
  const tone: Tone = domain === "TITULADOS" ? "titulados" : "empleadores";
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeading title={title} description={description} tone={tone} />
      <Card>
        <CardHeader>
          <CardTitle className="title-card flex items-center gap-2">
            <FlaskConical className="size-5" />
            Funcionalidad pendiente de contrato
          </CardTitle>
          <CardDescription>
            La ruta está preparada, pero el backend todavía no expone los datos
            necesarios para mostrar resultados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <StatusPanel
            kind="info"
            title="No disponible todavía"
            description="No se muestran valores manuales ni simulados como si fueran resultados reales."
          />
          {items.map((item) => (
            <div
              key={item}
              className="rounded-lg border border-border-line bg-slate-50 p-3 text-sm text-ink-600"
            >
              {item}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

