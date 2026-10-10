import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  BriefcaseBusiness,
  Download,
  FlaskConical,
  GraduationCap,
  Info,
  Inbox,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { apiRequest } from "@/api/client";
import { Badge } from "@/components/analytics/Badge";
import { ExportActions } from "@/components/analytics/ExportActions";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  CartesianGrid,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DatasetSummary } from "@/features/encuesta/api";
import type { AnalyticsSummary, CategoryDistribution } from "./api";
import { contrastTextColor } from "@/lib/utils";

type Domain = "TITULADOS" | "EMPLEADORES";
type Tone = "titulados" | "empleadores";
type Competence = {
  code: string;
  name: string;
  group: string;
  validCount: number;
  average: number;
  standardDeviation: number | null;
  median: number;
  modalLevel: number;
  levelCounts: Record<string, number>;
};
type Cross = {
  validCount: number;
  rowCategories: string[];
  columnCategories: string[];
  counts: Record<string, Record<string, number>>;
  percentages: Record<string, Record<string, number>>;
  smallSample: boolean;
};
type CrossMetric = "count" | "rowPercent" | "columnPercent";
type ChiResult = {
  estadistico: number;
  gradosLibertad: number;
  pValor: number;
  alfa: number;
  rechazaIndependencia: boolean;
};
type Simulation = {
  sampleSize: number;
  repetitions: number;
  seed: number;
  categories: {
    category: string;
    observedCount: number;
    observedPercentage: number;
    simulatedMean: number;
    lower95: number;
    upper95: number;
    standardDeviation: number;
  }[];
};
type EmploymentProfile = {
  datasetId: string;
  validResponses: number;
  cohortPoints: { graduationYear: number; professionalYears: number }[];
};

export function EmploymentProfilePage() {
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
  const [yearMax, setYearMax] = useState<number | undefined>();
  const [laborFilter, setLaborFilter] = useState("todos");
  const [sectorFilter, setSectorFilter] = useState("todos");
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
    const query = `?datasetId=${encodeURIComponent(datasetId)}`;
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
  }, [datasetId]);
  const labor = summary?.distributions.situacion_laboral_actual;
  const sectors = summary?.distributions.sector_trabajo;
  const unemployed = labor
    ? countMatching(labor, ["no trabaja", "no trabajo", "búsqueda", "desemple"])
    : null;
  const points = (profile?.cohortPoints ?? []).filter(
    (point) => yearMax === undefined || point.graduationYear <= yearMax,
  );
  const tabs = [
    {
      key: "perfil",
      label: "Perfil",
    },
    {
      key: "trabajo",
      label: "Trabajo actual",
    },
    {
      key: "desempleo",
      label: "Sin empleo",
    },
    {
      key: "primer-empleo",
      label: "Primer empleo",
    },
    {
      key: "emprendimiento",
      label: "Emprendimiento",
    },
  ];
  const resetFilters = () => {
    setYearMax(undefined);
    setLaborFilter("todos");
    setSectorFilter("todos");
  };
  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <PageHeading
          title={`Perfil y empleabilidad (n = ${summary?.validResponses ?? "—"})`}
          description="Situación laboral y sectores de inserción de las personas tituladas."
          tone="titulados"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm">
            <Info />
            Definiciones
          </Button>
          <ExportActions />
        </div>
      </div>
      <DatasetSelect
        datasets={datasets}
        value={datasetId}
        onChange={setDatasetId}
        loading={datasetsLoading}
      />
      {summary && (
        <EmploymentFilters
          summary={summary}
          sectors={sectors}
          yearMax={yearMax}
          setYearMax={setYearMax}
          laborFilter={laborFilter}
          setLaborFilter={setLaborFilter}
          sectorFilter={sectorFilter}
          setSectorFilter={setSectorFilter}
          onReset={resetFilters}
        />
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
            <TabsList
              variant="line"
              className="grid w-full grid-cols-3 border-b border-border-line bg-transparent"
            >
              {tabs.map((tab) => {
                return (
                  <TabsTrigger
                    key={tab.key}
                    value={tab.key}
                    className="w-full min-w-0 flex-none px-2 text-center text-sm data-[state=active]:font-semibold after:!left-1/6 after:!right-1/6 after:!w-auto after:!translate-x-0"
                  >
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
          <EmploymentTabContent
            tab={activeTab}
            summary={summary}
            profile={{
              ...(profile ?? {
                datasetId: "",
                validResponses: 0,
                cohortPoints: [],
              }),
              cohortPoints: points,
            }}
            labor={labor}
            sectors={sectors}
            unemployed={unemployed}
            unemploymentSummary={unemploymentSummary}
            firstEmploymentSummary={firstEmploymentSummary}
            entrepreneurshipSummary={entrepreneurshipSummary}
          />
        </>
      )}
    </div>
  );
}

function EmploymentFilters({
  summary,
  sectors,
  yearMax,
  setYearMax,
  laborFilter,
  setLaborFilter,
  sectorFilter,
  setSectorFilter,
  onReset,
}: {
  summary: AnalyticsSummary;
  sectors?: CategoryDistribution;
  yearMax?: number;
  setYearMax: (value?: number) => void;
  laborFilter: string;
  setLaborFilter: (value: string) => void;
  sectorFilter: string;
  setSectorFilter: (value: string) => void;
  onReset: () => void;
}) {
  const years = Object.keys(summary.numericAverages).includes("anio_titulacion")
    ? [2018, 2023]
    : [2018, 2023];
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-line bg-surface-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 rounded-lg border border-border-line bg-surface-container-low px-3 py-1.5 text-xs">
          <span className="font-semibold text-ink-900">Año titulación:</span>
          <span className="font-medium tabular-nums text-titulados">
            {years[0]} - {yearMax ?? years[1]}
          </span>
          <Slider
            className="w-20"
            min={years[0]}
            max={years[1]}
            value={[yearMax ?? years[1]]}
            onValueChange={([value]) =>
              setYearMax(value === years[1] ? undefined : value)
            }
          />
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-border-line bg-surface-container-low px-3 py-1.5 text-xs">
          <span className="font-semibold text-ink-900">Estado laboral:</span>
          <Select value={laborFilter} onValueChange={setLaborFilter}>
            <SelectTrigger className="h-8 w-auto border-0 bg-transparent px-1 font-medium shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              {Object.keys(
                summary.distributions.situacion_laboral_actual?.counts ?? {},
              ).map((key) => (
                <SelectItem key={key} value={key}>
                  {key}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex items-center gap-2 rounded-lg border border-border-line bg-surface-container-low px-3 py-1.5 text-xs">
          <span className="font-semibold text-ink-900">Sector:</span>
          <Select value={sectorFilter} onValueChange={setSectorFilter}>
            <SelectTrigger className="h-8 w-auto max-w-48 border-0 bg-transparent px-1 font-medium shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los sectores</SelectItem>
              {Object.keys(sectors?.counts ?? {}).map((key) => (
                <SelectItem key={key} value={key}>
                  {key}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <Button variant="ghost" size="sm" onClick={onReset}>
          <SlidersHorizontal />
          Limpiar filtros
        </Button>
      </div>
      <div className="flex items-center gap-2 text-xs text-ink-600">
        <span className="size-2 rounded-full bg-status-success" />
        Mostrando{" "}
        <strong className="tabular-nums text-ink-900">
          {summary.validResponses} de {summary.totalResponses}
        </strong>{" "}
        respuestas
      </div>
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
        <SenioritySegmentationCard
          points={profile?.cohortPoints ?? []}
          className="lg:col-span-5"
        />
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <EmploymentDonutCard
          distribution={labor}
          total={summary.validResponses}
        />
        <ProfileDistributionCard
          title="Sector de inserción laboral"
          description="Distribución sectorial de las personas tituladas ocupadas"
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
  const origin = topDistributionEntry(summary?.distributions.origen_emprendimiento);
  const deliverable = topDistributionEntry(summary?.distributions.entregable_emprendimiento);
  const financing = topDistributionEntry(summary?.distributions.financiamiento_emprendimiento);
  const satisfaction = topDistributionEntry(summary?.distributions.satisfaccion_emprendimiento);
  const importance = topDistributionEntry(summary?.distributions.importancia_formacion_emprendimiento);

  return (
    <Card className="rounded-xl border border-border-line shadow-sm">
      <CardHeader className="border-b border-border-line">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="title-card">
              Emprendimiento propio e iniciativas independientes (n = {total})
            </CardTitle>
            <CardDescription>
              Características, financiamiento, satisfacción e impacto formativo
            </CardDescription>
          </div>
          <span className="rounded-md bg-teal-50 px-3 py-1 text-xs font-semibold tabular-nums text-teal-700">
            n = {total}
          </span>
        </div>
      </CardHeader>
      {total ? (
        <CardContent className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
          <div>
            <h3 className="mb-4 text-sm font-semibold text-ink-900">
              Origen y fuentes de financiamiento
            </h3>
            <div className="rounded-lg border border-border-line bg-slate-50 p-4">
              <EntrepreneurshipValue label="Origen del emprendimiento" entry={origin} />
              <EntrepreneurshipValue label="Tipo de producto/entregable" entry={deliverable} />
              <EntrepreneurshipValue label="Financiamiento inicial" entry={financing} />
            </div>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold text-ink-900">
              Valoración formativa y satisfacción
            </h3>
            <div className="space-y-4">
              <EntrepreneurshipBar label="Nivel de satisfacción con el emprendimiento" entry={satisfaction} color="#2fa866" />
              <EntrepreneurshipBar label="Importancia de la formación universitaria" entry={importance} color="#1f6fb5" />
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

function EntrepreneurshipValue({
  label,
  entry,
}: {
  label: string;
  entry: { label: string; count: number; total: number; percent: number } | null;
}) {
  return (
    <div className="grid gap-1 py-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:items-start">
      <span className="text-sm text-ink-600">{label}:</span>
      <strong className="text-sm text-ink-900">
        {entry ? `${entry.label} (${entry.count} de ${entry.total}, ${entry.percent}%)` : "—"}
      </strong>
    </div>
  );
}

function EntrepreneurshipBar({
  label,
  entry,
  color,
}: {
  label: string;
  entry: { label: string; count: number; total: number; percent: number } | null;
  color: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>{label}</span>
        <strong style={{ color }}>
          {entry ? `${entry.label}: ${entry.count} de ${entry.total} (${entry.percent}%)` : "—"}
        </strong>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
        <div className="h-full rounded-full" style={{ width: `${entry?.percent ?? 0}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function topDistributionEntry(distribution?: CategoryDistribution) {
  const entry = Object.entries(distribution?.counts ?? {}).sort(([, left], [, right]) => right - left)[0];
  if (!entry || !distribution?.validCount) return null;
  const [label, count] = entry;
  return {
    label: booleanLabel(label),
    count,
    percent: Math.round((count * 1000) / distribution.validCount) / 10,
    total: distribution.validCount,
  };
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
  const timingEntries = Object.entries(timing?.counts ?? {}).sort(
    ([left], [right]) => firstEmploymentTimingOrder(left) - firstEmploymentTimingOrder(right),
  );
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
      <CardContent className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
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
              Tiempo hasta el primer empleo (orden natural)
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
      <CardContent className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
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
              Razones por las que no trabaja (ordenadas)
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
      <CardContent className="grid gap-x-6 gap-y-8 border-t border-surface-container-high pt-5 lg:grid-cols-2">
        <MiniDistribution
          title="Rubro de la empresa (barras ordenadas)"
          distribution={rubro}
        />
        <MiniDistribution
          title="Remuneración mensual líquida (orden natural)"
          distribution={remuneration}
          accent="teal"
        />
        <MiniDistribution
          title="Áreas dentro de la organización"
          distribution={areas}
          note="Varias respuestas posibles"
        />
        <StackedRelevanceCard distribution={relevance} />
      </CardContent>
    </Card>
  );
}

function MiniDistribution({
  title,
  distribution,
  accent = "blue",
  note,
}: {
  title: string;
  distribution?: CategoryDistribution;
  accent?: "blue" | "teal";
  note?: string;
}) {
  const entries = Object.entries(distribution?.counts ?? {}).sort(
    ([, a], [, b]) => b - a,
  );
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        {note && <span className="text-xs text-ink-600">{note}</span>}
      </div>
      {entries.length ? (
        <div className="space-y-3">
          {entries.map(([label, count]) => {
            const percentage = distribution?.percentages[label] ?? 0;
            return (
              <div key={label} className="space-y-1">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="min-w-0 break-words">{label}</span>
                  <span className="whitespace-nowrap tabular-nums font-semibold">
                    {count} de {distribution?.validCount} ({percentage}%)
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                  <div
                    className={`h-full rounded-full ${accent === "teal" ? "bg-empleadores" : "bg-titulados"}`}
                    style={{ width: `${percentage}%` }}
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
  );
}

function StackedRelevanceCard({
  distribution,
}: {
  distribution?: CategoryDistribution;
}) {
  const entries = Object.entries(distribution?.counts ?? {});
  const total = distribution?.validCount ?? 0;
  const colors = ["#1f6fb5", "#7db1dd", "#f2a33a", "#d64545"];
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink-900">
          Pertinencia de formación para el cargo
        </h3>
        <Info className="size-4 text-ink-600" />
      </div>
      {entries.length ? (
        <>
          <div className="flex h-5 overflow-hidden rounded-md bg-surface-container-high">
            {entries.map(([label, count], index) => {
              const percentage = total ? (count / total) * 100 : 0;
              return (
                <div
                  key={label}
                  className="h-full"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: colors[index % colors.length],
                  }}
                  title={`${label}: ${count} (${percentage.toFixed(1)}%)`}
                />
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-600">
            {entries.map(([label], index) => (
              <span key={label} className="flex items-center gap-1">
                <i
                  className="size-2 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                {label} ({distribution?.percentages[label]}%)
              </span>
            ))}
          </div>
        </>
      ) : (
        <Empty className="py-6">
          <EmptyTitle>Sin respuestas disponibles</EmptyTitle>
        </Empty>
      )}
    </div>
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
  const yearMin = years.length ? Math.min(...years) : 0;
  const yearMax = years.length ? Math.max(...years) : 1;
  const chartData = points.map((point) => ({
    graduationYear: point.graduationYear,
    professionalYears: point.professionalYears,
  }));
  const chartConfig = {
    professionalYears: {
      label: "Años de vida profesional",
      color: "#1f6fb5",
    },
  };
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
            <div className="overflow-x-auto rounded-lg border border-border-line bg-slate-50 p-2">
              <ChartContainer
                config={chartConfig}
                className="h-64 min-w-[620px] w-full aspect-auto"
              >
                <ScatterChart margin={{ top: 18, right: 18, bottom: 12, left: 8 }}>
                  <CartesianGrid stroke="#dbe4ee" strokeDasharray="2 4" />
                  <XAxis
                    type="number"
                    dataKey="graduationYear"
                    domain={[yearMin - 0.5, yearMax + 0.5]}
                    tick={{ fill: "#0f172a", fontSize: 11 }}
                    tickCount={Math.min(10, Math.max(2, yearMax - yearMin + 1))}
                  />
                  <YAxis
                    type="number"
                    dataKey="professionalYears"
                    domain={[0, "auto"]}
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    width={28}
                  />
                  <ReferenceLine
                    y={mean}
                    stroke="#ef4444"
                    strokeDasharray="5 4"
                    label={{ value: `Media ${mean.toFixed(1)} años`, fill: "#ef4444", fontSize: 11, position: "insideTopLeft" }}
                  />
                  <ReferenceLine
                    y={median}
                    stroke="#14a39a"
                    strokeDasharray="3 4"
                    label={{ value: `Mediana ${median.toFixed(1)} años`, fill: "#0f766e", fontSize: 11, position: "insideBottomLeft" }}
                  />
                  <Scatter
                    name="Titulado individual"
                    data={chartData}
                    dataKey="professionalYears"
                    fill="#1f6fb5"
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </ScatterChart>
              </ChartContainer>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-600">
              <span>
                <i className="mr-1 inline-block size-2 rounded-full bg-titulados" />
                Titulado individual
              </span>
              <span>
                <i className="mr-1 inline-block w-4 border-t-2 border-dashed border-red-500" />
                Media
              </span>
              <span>
                <i className="mr-1 inline-block w-4 border-t-2 border-dashed border-teal-600" />
                Mediana
              </span>
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
  return (
    <div className="grid items-stretch gap-4 md:grid-cols-3">
      <ProfileStatCard
        title="Media de vida profesional"
        value={average}
        footer={
          deviation == null
            ? "Desviación no disponible"
            : `± ${deviation.toFixed(1)} años desviación estándar`
        }
        n={summary.validResponses}
      />
      <ProfileStatCard
        title="Mediana de vida profesional"
        value={median}
        footer={`P50 de ${summary.validResponses} respuestas`}
        n={summary.validResponses}
      />
      <ProfileStatCard
        title="Desviación estándar"
        value={deviation}
        footer={
          deviation == null
            ? "Se requieren al menos 2 valores"
            : `Rango observado en la muestra`
        }
        n={summary.validResponses}
      />
    </div>
  );
}

function ProfileStatCard({
  title,
  value,
  footer,
  n,
}: {
  title: string;
  value?: number | null;
  footer: string;
  n: number;
}) {
  return (
    <Card className="rounded-xl border border-border-line shadow-sm">
      <CardContent className="flex h-full flex-col justify-between p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <span className="caption-bold uppercase tracking-wider text-ink-600">
            {title}
          </span>
          <span className="flex size-7 items-center justify-center rounded bg-titulados-active text-titulados">
            {title.includes("Desviación") ? "σ" : "◷"}
          </span>
        </div>
        <div className="mb-2 flex items-baseline gap-1.5">
          <span className="text-3xl font-bold leading-none tabular-nums text-ink-900">
            {value == null ? "—" : value.toFixed(1)}
          </span>
          <span className="text-sm font-medium text-ink-600">años</span>
        </div>
        <div className="flex items-center justify-between border-t border-surface-container-high pt-2 text-[11px] text-ink-600">
          <span>{footer}</span>
          <span className="font-bold tabular-nums text-titulados">n = {n}</span>
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
        <div className="rounded-lg border border-border-line bg-slate-50 p-3">
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
              {percent(junior).toFixed(1)}%
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
              {percent(consolidated).toFixed(1)}%
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

export function EducationProfilePage() {
  const {
    datasets,
    datasetId,
    setDatasetId,
    loading: datasetsLoading,
  } = useDatasets("TITULADOS");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [activeTab, setActiveTab] = useState("cursado");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!datasetId) {
      setSummary(null);
      return;
    }
    setLoading(true);
    setError(null);
    apiRequest<AnalyticsSummary>(
      `/analytics/titulados/education?datasetId=${encodeURIComponent(datasetId)}`,
    )
      .then(setSummary)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : String(cause)),
      )
      .finally(() => setLoading(false));
  }, [datasetId]);
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <PageHeading
        title="Formación continua"
        description="Seguimiento de formación complementaria e interés en estudios de posgrado."
        tone="titulados"
      />
      <DatasetSelect
        datasets={datasets}
        value={datasetId}
        onChange={setDatasetId}
        loading={datasetsLoading}
      />
      {summary && (
        <FilterToolbar
          count={`${summary.validResponses} de ${summary.totalResponses} respuestas`}
        />
      )}
      {loading && (
        <StatusPanel
          kind="loading"
          title="Cargando formación"
          description="Consultando las respuestas académicas del dataset."
        />
      )}
      {error && (
        <StatusPanel
          kind="warning"
          title="No se pudo cargar formación"
          description={error}
        />
      )}
      {!loading && !error && !summary && (
        <StatusPanel
          kind="info"
          title="Sin dataset de titulados"
          description="Importa un CSV de titulados desde Cargar datos para ver esta sección."
        />
      )}
      {summary && (
        <>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList variant="line" className="w-full justify-start">
              <TabsTrigger value="cursado">Posgrado cursado</TabsTrigger>
              <TabsTrigger value="interes">Interés en posgrado</TabsTrigger>
              <TabsTrigger value="opinion">Opinión sobre el posgrado</TabsTrigger>
            </TabsList>
          </Tabs>
          {activeTab === "cursado" && (
            <EducationCompletedPanel summary={summary} />
          )}
          {activeTab === "interes" && (
            <EducationInterestPanel summary={summary} />
          )}
          {activeTab === "opinion" && (
            <EducationOpinionPanel summary={summary} />
          )}
        </>
      )}
    </div>
  );
}

function EducationCompletedPanel({ summary }: { summary: AnalyticsSummary }) {
  const active = summary.distributions.tiene_formacion_complementaria;
  const level = summary.distributions.formacion_complementaria_nivel;
  const total = active?.validCount ?? level?.validCount ?? 0;
  const yes = active ? booleanCount(active, true) : 0;
  return (
    <>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(220px,0.7fr)_minmax(0,1.3fr)]">
        <KpiCard
          label="Formación complementaria activa"
          value={`${yes} de ${summary.validResponses}`}
          detail={`${formatPercentage(yes, summary.validResponses)} de la muestra total`}
          note={`Base total evaluada: n = ${summary.validResponses}`}
          icon={GraduationIcon}
          tone="titulados"
        />
        <ProfileDistributionCard
          title={`Nivel más alto cursado (n = ${level?.validCount ?? 0})`}
          description="Orden natural"
          distribution={level}
        />
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ProfileDistributionCard
          title={`Institución donde lo cursó (n = ${summary.distributions.institucion_formacion_complementaria?.validCount ?? total})`}
          description="Distribución de instituciones"
          distribution={summary.distributions.institucion_formacion_complementaria}
        />
        <ProfileDistributionCard
          title={`Fuente principal de financiamiento (n = ${summary.distributions.financiamiento_posgrado_cursado?.validCount ?? total})`}
          description="Financiamiento del posgrado cursado"
          distribution={summary.distributions.financiamiento_posgrado_cursado}
        />
      </div>
    </>
  );
}

function EducationInterestPanel({ summary }: { summary: AnalyticsSummary }) {
  const interest = summary.distributions.interes_posgrado;
  const interested = interest ? booleanCount(interest, true) : 0;
  const interestTotal = interest?.validCount ?? 0;
  const level = summary.distributions.nivel_posgrado_interes;
  const area = summary.distributions.area_posgrado_interes;
  const modality = summary.distributions.modalidad_posgrado;
  const institution = summary.distributions.institucion_posgrado_interes;
  const topLevel = topDistributionEntry(level);
  const topModality = topDistributionEntry(modality);
  const areaRows = distributionRows(area);
  const areaMentions = areaRows.reduce((total, row) => total + row.count, 0);
  const topTwoArea = areaRows.slice(0, 2).reduce((total, row) => total + row.count, 0);
  return (
    <>
      <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Interés en posgrado"
          value={`${interested} de ${summary.validResponses}`}
          detail={`${formatPercentage(interested, summary.validResponses)} de la muestra total`}
          note={`n = ${interestTotal}`}
          icon={GraduationIcon}
          tone="titulados"
        />
        <KpiCard
          label="Nivel predilecto"
          value={topLevel?.label ?? "—"}
          detail={topLevel ? `${topLevel.count} de ${topLevel.total} interesados` : "Sin respuestas"}
          note={`n = ${level?.validCount ?? 0}`}
          icon={GraduationIcon}
          tone="titulados"
        />
        <KpiCard
          label="Concentración temática"
          value="Top 2 acumulado"
          detail={`${topTwoArea} de ${areaMentions} menciones`}
          note={areaMentions ? `${formatPercentage(topTwoArea, areaMentions)} acumulado` : "Sin respuestas"}
          icon={GraduationIcon}
          tone="titulados"
        />
        <KpiCard
          label="Modalidad preferida"
          value={topModality?.label ?? "—"}
          detail={topModality ? `${topModality.count} de ${topModality.total} interesados` : "Sin respuestas"}
          note={`n = ${modality?.validCount ?? 0}`}
          icon={GraduationIcon}
          tone="titulados"
        />
      </div>
      <EducationAreaPanel distribution={area} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ProfileDistributionCard
          title="Nivel de posgrado de interés"
          description="Orden natural"
          distribution={level}
        />
        <ProfileDistributionCard
          title="Modalidad preferida"
          description="Preferencias de cursado"
          distribution={modality}
        />
        <ProfileDistributionCard
          title="Organización preferida"
          description="Institución donde realizaría el posgrado"
          distribution={institution}
        />
        <ProfileDistributionCard
          title="Fuente de financiamiento"
          description="Financiamiento estimado"
          distribution={summary.distributions.financiamiento_posgrado_estimado}
        />
      </div>
    </>
  );
}

function EducationAreaPanel({ distribution }: { distribution?: CategoryDistribution }) {
  const rows = distributionRows(distribution);
  const totalMentions = rows.reduce((total, row) => total + row.count, 0);
  const totalBase = distribution?.validCount ?? 0;
  let accumulated = 0;
  const enriched = rows.map((row) => {
    accumulated += row.count;
    return { ...row, accumulated, accumulatedPercent: totalMentions ? (accumulated * 100) / totalMentions : 0 };
  });
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.9fr)]">
      <Card className="rounded-xl border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="title-card">Distribución de demanda por área temática y porcentaje acumulado (Pareto)</CardTitle>
              <CardDescription>Frecuencia absoluta y % acumulado de menciones · n = {totalBase} interesados</CardDescription>
            </div>
            <span className="text-xs text-ink-600">{totalMentions} menciones</span>
          </div>
        </CardHeader>
        <CardContent>
          {enriched.length ? (
            <ParetoAreaChart rows={enriched} totalBase={totalBase} />
          ) : (
            <Empty className="py-8"><EmptyTitle>Sin áreas disponibles</EmptyTitle></Empty>
          )}
        </CardContent>
      </Card>
      <Card className="rounded-xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="title-card">Tabla de frecuencias</CardTitle>
          <CardDescription>Áreas temáticas seleccionadas con opción múltiple · n = {totalBase}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table className="text-xs">
            <TableHeader><TableRow><TableHead>Área temática</TableHead><TableHead className="text-right">fi</TableHead><TableHead className="text-right">fr (%)</TableHead><TableHead className="text-right">Fi</TableHead><TableHead className="text-right">Fr (%)</TableHead></TableRow></TableHeader>
            <TableBody>
              {enriched.map((row) => <TableRow key={row.label}><TableCell className="whitespace-normal">{row.label}</TableCell><TableCell className="text-right tabular-nums">{row.count}</TableCell><TableCell className="text-right tabular-nums">{row.percent.toFixed(1)}</TableCell><TableCell className="text-right tabular-nums">{row.accumulated}</TableCell><TableCell className="text-right tabular-nums">{row.accumulatedPercent.toFixed(1)}</TableCell></TableRow>)}
              <TableRow><TableCell className="font-semibold">Total menciones</TableCell><TableCell className="text-right font-semibold tabular-nums">{totalMentions}</TableCell><TableCell className="text-right font-semibold tabular-nums">100,0</TableCell><TableCell className="text-right font-semibold tabular-nums">{totalMentions}</TableCell><TableCell className="text-right font-semibold tabular-nums">100,0</TableCell></TableRow>
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-ink-600">Las frecuencias pueden superar n porque la pregunta permite varias respuestas.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ParetoAreaChart({
  rows,
  totalBase,
}: {
  rows: { label: string; count: number; percent: number; accumulated: number; accumulatedPercent: number }[];
  totalBase: number;
}) {
  const width = 760;
  const height = 300;
  const left = 52;
  const right = 48;
  const top = 28;
  const bottom = 78;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const maxCount = Math.max(...rows.map((row) => row.count), 1);
  const slot = chartWidth / rows.length;
  const barWidth = Math.min(58, slot * 0.58);
  const point = (index: number, value: number) => ({
    x: left + slot * index + slot / 2,
    y: top + chartHeight - (value / 100) * chartHeight,
  });
  const linePoints = rows
    .map((row, index) => {
      const current = point(index, row.accumulatedPercent);
      return `${current.x},${current.y}`;
    })
    .join(" ");
  const yGrid = [0, 20, 40, 60, 80, 100];

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto min-w-[620px] w-full" role="img" aria-label="Pareto de áreas de posgrado">
        {yGrid.map((value) => {
          const y = top + chartHeight - (value / 100) * chartHeight;
          return (
            <g key={value}>
              <line x1={left} x2={width - right} y1={y} y2={y} stroke="#d7e0e8" strokeDasharray="2 4" />
              <text x={width - right + 8} y={y + 4} fontSize="10" fill="#64748b">{value}%</text>
            </g>
          );
        })}
        <line
          x1={left}
          x2={width - right}
          y1={top + chartHeight * 0.2}
          y2={top + chartHeight * 0.2}
          stroke="#f59e0b"
          strokeDasharray="5 4"
          opacity="0.75"
        />
        <text x={width - right - 4} y={top + chartHeight * 0.2 - 6} textAnchor="end" fontSize="10" fill="#d97706">80%</text>
        {rows.map((row, index) => {
          const x = left + slot * index + (slot - barWidth) / 2;
          const barHeight = (row.count / maxCount) * chartHeight;
          const y = top + chartHeight - barHeight;
          return (
            <g key={row.label}>
              <rect x={x} y={y} width={barWidth} height={barHeight} rx="2" fill="#1f6fb5" />
              <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" fontSize="13" fontWeight="700" fill="#0f3f6d">{row.count}</text>
              <text x={x + barWidth / 2} y={height - 45} textAnchor="middle" fontSize="10.5" fontWeight="500" fill="#334155">
                {shortAreaLabel(row.label).map((line, lineIndex) => (
                  <tspan key={line} x={x + barWidth / 2} dy={lineIndex === 0 ? 0 : 12}>{line}</tspan>
                ))}
              </text>
            </g>
          );
        })}
        <polyline points={linePoints} fill="none" stroke="#f59e0b" strokeWidth="2.5" />
        {rows.map((row, index) => {
          const current = point(index, row.accumulatedPercent);
          return (
            <g key={`${row.label}-point`}>
              <circle cx={current.x} cy={current.y} r="5" fill="#fff" stroke="#c2410c" strokeWidth="2.5" />
              <rect x={current.x - 22} y={current.y - 29} width="44" height="17" rx="4" fill="#fff" stroke="#fed7aa" strokeWidth="1" opacity="0.96" />
              <text x={current.x} y={current.y - 17} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#9a3412">{row.accumulatedPercent.toFixed(1)}%</text>
            </g>
          );
        })}
        <text x={left} y={height - 10} fontSize="10" fill="#64748b">Menciones individuales (fi)</text>
        <line x1={width - 260} x2={width - 238} y1={height - 14} y2={height - 14} stroke="#f59e0b" strokeWidth="2.5" />
        <text x={width - 232} y={height - 10} fontSize="10" fill="#64748b">% acumulado (Pareto)</text>
        <text x={width - right} y={height - 10} textAnchor="end" fontSize="10" fill="#64748b">n = {totalBase} interesados</text>
      </svg>
    </div>
  );
}

function shortAreaLabel(label: string): string[] {
  const value = label.toLocaleLowerCase("es-BO");
  if (value.includes("inteligencia artificial") || value.includes("machine learning")) return ["IA", "y ML"];
  if (value.includes("ciberseguridad")) return ["Ciberseg."];
  if (value.includes("ciencia de datos")) return ["Ciencia", "de Datos"];
  if (value.includes("big data")) return ["Big Data"];
  if (value.includes("base de datos") || value.includes("bases de datos")) return ["Bases", "de Datos"];
  if (value.includes("cloud")) return ["Cloud/", "DevOps"];
  if (value.includes("software")) return ["Ing.", "Software"];
  if (value.includes("robótica") || value.includes("robotica")) return ["Robótica"];
  const words = label.trim().split(/\s+/);
  return words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : [label];
}

function distributionRows(distribution?: CategoryDistribution) {
  return Object.entries(distribution?.counts ?? {})
    .map(([label, count]) => ({ label: booleanLabel(label), count, percent: distribution?.percentages[label] ?? 0, total: distribution?.validCount ?? 0 }))
    .sort((left, right) => right.count - left.count);
}

function EducationOpinionPanel({ summary }: { summary: AnalyticsSummary }) {
  const opinion = summary.distributions.valoracion_formacion_1;
  return (
    <Card className="rounded-xl border border-border-line shadow-sm">
      <CardHeader>
        <CardTitle className="title-card">
          Opinión sobre el posgrado de la FCyT (n = {opinion?.validCount ?? 0})
        </CardTitle>
        <CardDescription>
          “Los programas de posgrado de la FCyT responden a las necesidades del medio profesional actual”
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LikertStatement
          number=""
          title=""
          distribution={opinion}
          showSummary={false}
        />
        <LikertLegend />
        <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-ink-600">
          <span>Escala Likert de 4 niveles balanceada</span>
          <span>Base total de la muestra: n = {opinion?.validCount ?? 0}</span>
        </div>
      </CardContent>
    </Card>
  );
}

const UsersIcon = Users;
const WorkIcon = BriefcaseBusiness;
const GraduationIcon = GraduationCap;

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
  return (
    <Card className={`h-fit rounded-xl border-0 shadow-sm ${className}`}>
      <CardHeader>
        <CardTitle className="title-card">{title}</CardTitle>
        <CardDescription>
          {description}{" "}
          <span className="whitespace-nowrap">
            · n = {distribution?.validCount ?? 0}
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
                        ({percent}%)
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
                              ? "#14a39a"
                              : "#94a3b8",
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
          <ChartContainer
            config={chartConfig}
            className="absolute inset-0 aspect-square"
          >
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="label"
                innerRadius={48}
                outerRadius={68}
                stroke="none"
              >
                {chartData.map((entry) => (
                  <Cell key={entry.label} fill={laborColor(entry.label)} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="absolute inset-0 m-auto flex size-24 flex-col items-center justify-center rounded-full bg-white">
            <span className="title-card tabular-nums">
              {occupiedPercent.toFixed(1)}%
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
                <span className="break-words">{label}</span>
              </div>
              <span className="tabular-nums whitespace-nowrap font-semibold">
                {count}{" "}
                <span className="caption-meta text-ink-600">
                  ({distribution?.percentages[label] ?? 0}%)
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

function unemploymentReasonColor(index: number) {
  return ["#f2a33a", "#1f6fb5", "#94a3b8", "#14a39a", "#8c57d3"][index % 5];
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
        <DistributionBars distribution={distribution} />
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
                  ({distribution?.percentages[label]}%)
                </span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
      <CardContent className="flex justify-between border-t border-surface-container-high py-3 text-xs text-ink-600">
        <span>
          {entries
            .map(([label]) => `${label}: ${distribution?.percentages[label]}%`)
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
        <strong className="text-ink-900">Muestra T</strong>
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
          DE: ± {deviation == null ? "—" : `${deviation.toFixed(1)}a`}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-600">
        Media:{" "}
        <strong className="text-base tabular-nums text-ink-900">
          {average == null ? "—" : average.toFixed(1)}
        </strong>{" "}
        años{" "}
        <span>
          Mediana:{" "}
          <strong className="text-base tabular-nums text-ink-900">
            {median == null ? "—" : median.toFixed(1)}
          </strong>{" "}
          años
        </span>
      </div>
    </div>
  );
}

function DistributionBars({
  distribution,
}: {
  distribution?: CategoryDistribution;
}) {
  return Object.entries(distribution?.counts ?? {}).length ? (
    <div className="space-y-3">
      {Object.entries(distribution?.counts ?? {}).map(([label, count]) => {
        const percentage = distribution?.percentages[label] ?? 0;
        return (
          <div key={label} className="space-y-1">
            <div className="flex justify-between gap-3 text-sm">
              <span>{label}</span>
              <span className="tabular-nums whitespace-nowrap">
                {count} de {distribution?.validCount} ({percentage}%)
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
  return `${total ? ((value / total) * 100).toFixed(1).replace(".", ",") : 0}%`;
}

function firstEmploymentTimingOrder(label: string) {
  const normalized = label
    .toLocaleLowerCase("es-BO")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (normalized.includes("antes") || normalized.includes("ya trabajaba")) return 0;
  if (normalized.includes("menos de 6")) return 1;
  if (normalized.includes("6 a 12")) return 2;
  if (normalized.includes("mas de 1")) return 3;
  return 10;
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

export function DatasetAnalyticsPage({
  title,
  description,
  domain,
  endpoint,
  fields,
  cards,
}: {
  title: string;
  description: string;
  domain: Domain;
  endpoint: string;
  fields?: string;
  cards: { key: string; label: string }[];
}) {
  const tone: Tone = domain === "TITULADOS" ? "titulados" : "empleadores";
  const {
    datasets,
    datasetId,
    setDatasetId,
    loading: datasetsLoading,
  } = useDatasets(domain);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!datasetId) {
      setSummary(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const suffix = fields ? `&fields=${encodeURIComponent(fields)}` : "";
    apiRequest<AnalyticsSummary>(
      `${endpoint}?datasetId=${encodeURIComponent(datasetId)}${suffix}`,
    )
      .then(setSummary)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : String(cause)),
      )
      .finally(() => setLoading(false));
  }, [datasetId, endpoint, fields]);
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeading title={title} description={description} tone={tone} />
      <DatasetSelect
        datasets={datasets}
        value={datasetId}
        onChange={setDatasetId}
        loading={datasetsLoading}
      />
      {loading && (
        <StatusPanel
          kind="loading"
          title="Cargando datos"
          description="Consultando el dataset seleccionado."
        />
      )}
      {error && (
        <StatusPanel
          kind="warning"
          title="No se pudo cargar la pantalla"
          description={error}
        />
      )}
      {!loading && !error && !summary && (
        <StatusPanel
          kind="info"
          title={`Sin dataset de ${domain.toLowerCase()}`}
          description="Importa un dataset compatible para habilitar esta vista."
        />
      )}
      {summary && (
        <>
          <FilterToolbar
            count={`${summary.validResponses} respuestas válidas`}
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <KpiCard
                key={card.key}
                label={card.label}
                value={formatMetric(summary, card.key)}
                detail={
                  summary.distributions[card.key]
                    ? `${summary.distributions[card.key].validCount} respuestas`
                    : "Dato numérico"
                }
                note={`n = ${summary.distributions[card.key]?.validCount ?? summary.validResponses}`}
                tone={tone}
              />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {Object.entries(summary.distributions).map(
              ([key, distribution]) => (
                <DistributionCard
                  key={key}
                  title={labelFor(key)}
                  distribution={distribution}
                  tone={tone}
                />
              ),
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function CompetencePage({ domain }: { domain: Domain }) {
  const tone: Tone = domain === "TITULADOS" ? "titulados" : "empleadores";
  const {
    datasets,
    datasetId,
    setDatasetId,
    loading: datasetsLoading,
  } = useDatasets(domain);
  const [items, setItems] = useState<Competence[]>([]);
  const [satisfaction, setSatisfaction] = useState<AnalyticsSummary | null>(
    null,
  );
  const [curriculum, setCurriculum] = useState<AnalyticsSummary | null>(null);
  const [activeGroup, setActiveGroup] = useState("");
  const [activeTab, setActiveTab] = useState("hard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!datasetId) {
      setItems([]);
      setSatisfaction(null);
      setCurriculum(null);
      setActiveGroup("");
      return;
    }
    setLoading(true);
    setError(null);
    const satisfactionRequest =
      domain === "TITULADOS"
        ? apiRequest<AnalyticsSummary>(
            `/analytics/titulados/satisfaction?datasetId=${encodeURIComponent(datasetId)}`,
          )
        : Promise.resolve(null);
    const curriculumRequest =
      domain === "TITULADOS"
        ? apiRequest<AnalyticsSummary>(
            `/analytics/titulados/curriculum?datasetId=${encodeURIComponent(datasetId)}`,
          )
        : Promise.resolve(null);
    Promise.all([
      apiRequest<Competence[]>(
        `/analytics/competencies/gaps?datasetId=${encodeURIComponent(datasetId)}`,
      ),
      satisfactionRequest,
      curriculumRequest,
    ])
      .then(([next, nextSatisfaction, nextCurriculum]) => {
        setItems(next);
        setSatisfaction(nextSatisfaction);
        setCurriculum(nextCurriculum);
        const firstHard = next.find((item) =>
          item.group.toLowerCase().includes("hard"),
        );
        const firstSoft = next.find((item) =>
          item.group.toLowerCase().includes("soft"),
        );
        setActiveTab(firstHard ? "hard" : firstSoft ? "soft" : "hard");
        setActiveGroup((firstHard ?? firstSoft ?? next[0])?.group ?? "");
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : String(cause)),
      )
      .finally(() => setLoading(false));
  }, [datasetId, domain]);
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
  const tabs = [
    { key: "hard", label: "Hard skills" },
    { key: "soft", label: "Soft skills" },
    { key: "satisfaccion", label: "Satisfacción y pertinencia" },
    { key: "malla", label: "Malla y asignaturas" },
  ];
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
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm">
              <Info />
              Definiciones
            </Button>
            <ExportActions />
          </div>
        </div>
        <DatasetSelect
          datasets={datasets}
          value={datasetId}
          onChange={setDatasetId}
          loading={datasetsLoading}
        />
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
          <SatisfactionPanel summary={satisfaction} />
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
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm">
            <Info />
            Definiciones
          </Button>
          <ExportActions />
        </div>
      </div>
      <DatasetSelect
        datasets={datasets}
        value={datasetId}
        onChange={setDatasetId}
        loading={datasetsLoading}
      />
      {items.length > 0 && (
        <FilterToolbar
          count={`${items[0]?.validCount ?? 0} respuestas válidas`}
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
              <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <KpiCard
                  label="Competencias evaluadas"
                  value={String(visibleItems.length)}
                  detail={groupLabel(activeGroup)}
                  note={`n = ${visibleItems[0]?.validCount ?? 0}`}
                  icon={GraduationIcon}
                  tone={tone}
                />
                <KpiCard
                  label="Media de la dimensión"
                  value={average ? formatDecimal(average) : "—"}
                  detail="Escala de 1 a 5"
                  note="Promedio de competencias"
                  icon={WorkIcon}
                  tone={tone}
                />
                <KpiCard
                  label="Muestra"
                  value={String(visibleItems[0]?.validCount ?? 0)}
                  detail="Respuestas válidas"
                  icon={UsersIcon}
                  tone={tone}
                />
              </div>
              <div className="grid items-start gap-6 lg:grid-cols-12">
                <CompetenceMatrix
                  items={visibleItems}
                  className="lg:col-span-7"
                />
                <CompetenceRadar
                  items={visibleItems}
                  className="lg:col-span-5"
                />
              </div>
              <CompetenceStatsTable
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

function CompetenceMatrix({
  items,
  className = "",
}: {
  items: Competence[];
  className?: string;
}) {
  const columnMaxima = [1, 2, 3, 4, 5].reduce<Record<number, number>>(
    (maxima, level) => {
      maxima[level] = Math.max(
        1,
        ...items.map((item) => item.levelCounts[String(level)] ?? 0),
      );
      return maxima;
    },
    {},
  );

  return (
    <Card className={`rounded-xl border-0 shadow-sm ${className}`}>
      <CardHeader>
        <CardTitle className="title-card">
          Mapa de calor: Nivel de preparación técnica percibida
        </CardTitle>
        <CardDescription>
          Distribución de frecuencias por nivel de la escala Likert · n ={" "}
          {items[0]?.validCount ?? 0}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="min-w-[820px] text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-ink-600">
                <th className="w-56 p-2 text-left">Competencia técnica</th>
                {[1, 2, 3, 4, 5].map((level) => (
                  <th
                    key={level}
                    className={`rounded p-2 text-center ${level <= 2 ? "bg-red-50 text-red-700" : level === 3 ? "bg-slate-100 text-ink-600" : "bg-blue-50 text-titulados"}`}
                  >
                    {level}
                    <br />
                    <span className="font-normal normal-case">
                      {level === 1
                        ? "Muy insuf."
                        : level === 2
                          ? "Insuf."
                          : level === 3
                            ? "Aceptable"
                            : level === 4
                              ? "Suficiente"
                              : "Muy suf."}
                    </span>
                  </th>
                ))}
                <th className="p-2 text-right">Total</th>
                <th className="p-2 text-right">Media</th>
                <th className="p-2 text-right">DE</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.code} className="border-t border-slate-100">
                  <td
                    className="max-w-56 whitespace-normal break-words p-2 font-medium leading-tight text-ink-900"
                    title={item.name}
                  >
                    {matrixCompetenceName(item.name)}
                  </td>
                  {[1, 2, 3, 4, 5].map((current) => (
                    (() => {
                      const count = item.levelCounts[String(current)] ?? 0;
                      return (
                        <td
                          key={current}
                          className="p-2 text-center font-semibold transition-[background-color,color] duration-300 ease-out"
                          style={{
                            backgroundColor: matrixBackground(
                              current,
                              count,
                              columnMaxima[current],
                            ),
                            color: contrastTextColor(
                              matrixBackground(
                                current,
                                count,
                                columnMaxima[current],
                              ),
                            ),
                          }}
                        >
                          {count}
                        </td>
                      );
                    })()
                  ))}
                  <td className="tabular-nums p-2 text-right font-semibold">
                    {item.validCount}
                  </td>
                  <td className="tabular-nums p-2 text-right font-semibold">
                    {formatDecimal(item.average)}
                  </td>
                  <td className="tabular-nums p-2 text-right">
                    {item.standardDeviation == null || item.validCount < 2
                      ? "n/d"
                      : formatDecimal(item.standardDeviation)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-surface-container-high pt-3 text-xs text-ink-600">
          <span className="font-semibold">Escala:</span>
          <span>
            <i className="mr-1 inline-block size-3 rounded bg-red-200" />1 Muy
            insuficiente
          </span>
          <span>
            <i className="mr-1 inline-block size-3 rounded bg-slate-200" />3
            Aceptable
          </span>
          <span>
            <i className="mr-1 inline-block size-3 rounded bg-blue-200" />5 Muy
            suficiente
          </span>
        </div>
      </CardContent>
    </Card>
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
      <CurriculumCard
        title="Aspectos de la Carrera que resultaron útiles"
        field="aspectos_utiles"
        summary={summary}
        tone="blue"
      />
      <CurriculumCard
        title="Aspectos de la Carrera que pueden mejorarse"
        field="aspectos_mejorables"
        summary={summary}
        tone="orange"
      />
      <CurriculumCard
        title="Asignaturas que dieron ventaja competitiva"
        field="asignaturas_ventaja"
        summary={summary}
        tone="teal"
      />
      <CurriculumCard
        title="Asignaturas percibidas poco útiles o desactualizadas"
        field="asignaturas_poco_utiles"
        summary={summary}
        tone="orange"
      />
    </div>
  );
}

function CurriculumCard({
  title,
  field,
  summary,
  tone,
}: {
  title: string;
  field: string;
  summary: AnalyticsSummary;
  tone: "blue" | "orange" | "teal";
}) {
  const distribution = summary.distributions[field];
  const entries = Object.entries(distribution?.counts ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  const colors = { blue: "#2878bd", orange: "#ed552f", teal: "#18a39a" };
  const total = distribution?.validCount ?? 0;
  return (
    <Card className="gap-3 rounded-xl border-0 py-4 shadow-sm">
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="title-card">{title}</CardTitle>
            <CardDescription>
              Nota: Pregunta de opción múltiple (Varias respuestas posibles, n ={" "}
              {total})
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" aria-label={`Exportar ${title}`}>
            <Download className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.length ? (
          entries.map(([label, count]) => (
            <div key={label} className="space-y-1">
              <div className="flex items-end justify-between gap-3 text-xs">
                <span className="min-w-0 font-semibold text-ink-900">
                  {label}
                </span>
                <span className="shrink-0 tabular-nums text-ink-600">
                  {distribution?.percentages[label]}% ({count})
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${distribution?.percentages[label] ?? 0}%`,
                    backgroundColor: colors[tone],
                  }}
                />
              </div>
            </div>
          ))
        ) : (
          <Empty className="py-6">
            <EmptyTitle>Sin respuestas disponibles</EmptyTitle>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}

function SatisfactionPanel({ summary }: { summary: AnalyticsSummary | null }) {
  const satisfaction = summary?.distributions.satisfaccion_formacion;
  const concordance =
    summary?.distributions.concordancia_formacion_requerimientos;
  if (!summary)
    return (
      <StatusPanel
        kind="loading"
        title="Cargando satisfacción y pertinencia"
        description="Consultando las respuestas del dataset seleccionado."
      />
    );
  return (
    <Card className="gap-3 rounded-xl border-0 py-4 shadow-sm">
      <CardHeader className="pb-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="title-card">
              Satisfacción global y pertinencia con el mercado laboral
            </CardTitle>
            <CardDescription>
              Distribución de respuestas en escala Likert de 4 niveles de
              acuerdo (n = {summary.validResponses})
            </CardDescription>
          </div>
          <Button variant="ghost" size="icon" aria-label="Exportar vista">
            <Download className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <LikertLegend />
        <LikertStatement
          number="1."
          title="Satisfacción global con la formación recibida en la carrera"
          distribution={satisfaction}
          showSummary={false}
        />
        <LikertStatement
          number="2."
          title="Concordancia entre la formación académica y los requerimientos del mercado laboral"
          distribution={concordance}
          showSummary={false}
        />
      </CardContent>
    </Card>
  );
}

function LikertLegend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-lg bg-surface-container-low px-3 py-2.5 text-xs font-medium text-ink-700">
      <span>
        <i className="mr-1.5 inline-block size-3 rounded bg-[#ed552f]" />
        Totalmente en desacuerdo
      </span>
      <span>
        <i className="mr-1.5 inline-block size-3 rounded bg-[#f3a487]" />
        En desacuerdo
      </span>
      <span>
        <i className="mr-1.5 inline-block size-3 rounded bg-[#7db1dd]" />
        De acuerdo
      </span>
      <span>
        <i className="mr-1.5 inline-block size-3 rounded bg-[#1f6fb5]" />
        Totalmente de acuerdo
      </span>
    </div>
  );
}

function LikertStatement({
  number,
  title,
  distribution,
  showSummary = true,
}: {
  number: string;
  title: string;
  distribution?: CategoryDistribution;
  showSummary?: boolean;
}) {
  const entries = orderedLikertEntries(distribution);
  const colors = ["#ed552f", "#f3a487", "#7db1dd", "#1f6fb5"];
  const total = distribution?.validCount ?? 0;
  const favorable = favorableCount(distribution);
  return (
    <div className="space-y-2 border-t border-surface-container-high pt-5 first:border-t-0 first:pt-0">
      {(showSummary || number || title) && (
        <div className="flex flex-col justify-between gap-1 md:flex-row md:items-center">
          <span className="font-semibold text-ink-900">
            {number} {title}
          </span>
          {showSummary && (
            <span className="text-xs text-ink-600">
              {favorablePercentage(distribution)}% De acuerdo + Totalmente de acuerdo
            </span>
          )}
        </div>
      )}
      {entries.length ? (
        <>
          <div className="flex h-11 overflow-hidden rounded-lg">
            {entries.map(([label, count], index) => (
              <div
                key={label}
                className="flex min-w-0 items-center justify-center px-1 text-xs font-semibold"
                style={{
                  width: `${distribution?.percentages[label] ?? 0}%`,
                  backgroundColor: colors[index],
                  color: contrastTextColor(colors[index]),
                }}
                title={`${label}: ${count} (${distribution?.percentages[label]}%)`}
              >
                {(distribution?.percentages[label] ?? 0) >= 8
                  ? `${count} (${distribution?.percentages[label]}%)`
                  : ""}
              </div>
            ))}
          </div>
          <div className="flex justify-between px-1 text-xs text-ink-600">
            <span>
              Desacuerdo (niveles 1 + 2): {total - favorable} ({formatPercentage(total - favorable, total)})
            </span>
            <span>
              De acuerdo + Totalmente de acuerdo: {favorable} ({favorablePercentage(distribution)}%)
            </span>
          </div>
        </>
      ) : (
        <Empty className="py-6">
          <EmptyTitle>Sin respuestas disponibles</EmptyTitle>
        </Empty>
      )}
    </div>
  );
}

function orderedLikertEntries(distribution?: CategoryDistribution) {
  const entries = Object.entries(distribution?.counts ?? {});
  const hasRecognizedLevel = entries.some(([label]) => likertLevel(label) > 0);
  return hasRecognizedLevel
    ? entries.sort(([a], [b]) => likertLevel(a) - likertLevel(b))
    : entries;
}
function likertLevel(label: string) {
  const normalized = label
    .toLocaleLowerCase("es-BO")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const numericLevel = Number.parseInt(normalized.match(/^\s*(\d+)/)?.[1] ?? "", 10);
  if (Number.isInteger(numericLevel) && numericLevel >= 1 && numericLevel <= 4) return numericLevel;
  if (normalized.includes("desacuerdo")) {
    return normalized.includes("totalmente") || normalized.includes("muy") ? 1 : 2;
  }
  if (normalized.includes("acuerdo")) {
    return normalized.includes("totalmente") || normalized.includes("muy") ? 4 : 3;
  }
  return 0;
}
function favorableCount(distribution?: CategoryDistribution) {
  const entries = orderedLikertEntries(distribution);
  const hasRecognizedLevel = entries.some(([label]) => likertLevel(label) > 0);
  return entries
    .filter(([label], index) => {
      const level = likertLevel(label);
      return hasRecognizedLevel ? level === 3 || level === 4 : index >= 2;
    })
    .reduce((sum, [, count]) => sum + count, 0);
}
function favorablePercentage(distribution?: CategoryDistribution) {
  const total = distribution?.validCount ?? 0;
  return total
    ? ((favorableCount(distribution) / total) * 100).toFixed(1).replace(".", ",")
    : "—";
}

function CompetenceStatsTable({
  items,
  group,
}: {
  items: Competence[];
  group: string;
}) {
  const globalAverage = items.length
    ? items.reduce((sum, item) => sum + item.average, 0) / items.length
    : 0;
  return (
    <Card className="rounded-xl border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="title-card">
              Estadísticos por competencia técnica
            </CardTitle>
            <CardDescription>
              Ordenados descendentemente por media · {group} · n = {items[0]?.validCount ?? 0}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm">
            Σ Ver fórmulas estadísticas
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="min-w-[760px] text-sm">
            <thead>
              <tr className="bg-surface-container-low text-xs text-ink-600">
                <th className="rounded-l-lg p-3 text-left">
                  Competencia / Disciplina
                </th>
                <th className="p-3 text-right">
                  n<br />
                  válido
                </th>
                <th className="p-3 text-right">
                  Media
                </th>
                <th className="p-3 text-right">
                  Desv. estándar
                </th>
                <th className="p-3 text-right">
                  Mediana
                  <br />
                  (Me)
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.code}
                  className="border-b border-surface-container-high"
                >
                  <td className="p-3 font-medium text-ink-900">{item.name}</td>
                  <td className="tabular-nums p-3 text-right">
                    {item.validCount}
                  </td>
                  <td
                    className={`tabular-nums p-3 text-right font-semibold ${item.average < 2.5 ? "text-red-600" : "text-titulados"}`}
                  >
                    {formatDecimal(item.average)}
                  </td>
                  <td className="tabular-nums p-3 text-right">
                    {item.standardDeviation == null || item.validCount < 2
                      ? "n/d"
                      : formatDecimal(item.standardDeviation)}
                  </td>
                  <td className="tabular-nums p-3 text-right">
                    {formatDecimal(item.median)}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        <div className="mt-4 flex flex-col justify-between gap-3 rounded-lg bg-surface-container-low p-3 text-xs text-ink-600 sm:flex-row">
          <strong className="whitespace-nowrap text-ink-900">
            Media global {group}: {formatDecimal(globalAverage)}
          </strong>
        </div>
      </CardContent>
    </Card>
  );
}

function formatDecimal(value: number, digits = 2) {
  return value.toFixed(digits).replace(".", ",");
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
function matrixCompetenceName(name: string) {
  return name;
}

function matrixBackground(level: number, count: number, columnMaximum: number) {
  const intensity = count / Math.max(1, columnMaximum);
  const alpha = 0.08 + intensity * 0.52;
  const color =
    level <= 2
      ? "248, 113, 113"
      : level === 3
        ? "148, 163, 184"
        : level === 4
          ? "96, 165, 250"
          : "59, 130, 246";
  return `rgba(${color}, ${alpha.toFixed(3)})`;
}

function CompetenceRadar({
  items,
  className = "",
}: {
  items: Competence[];
  className?: string;
}) {
  const plotted = items.slice(0, 8);
  const chartData = plotted.map((item) => ({
    subject: `${radarLabel(item.name)} (${formatDecimal(item.average)})`,
    average: item.average,
    name: item.name,
  }));
  const chartConfig = {
    average: { label: "Media observada", color: "#1f6fb5" },
  };
  return (
    <Card
      className={`min-w-0 overflow-hidden rounded-xl border-0 shadow-sm ${className}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="title-card">Media por competencia</CardTitle>
            <CardDescription>
              Escala continua de 1,0 a 5,0
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {plotted.length ? (
          <div className="flex min-w-0 flex-col items-center">
            <ChartContainer
              config={chartConfig}
              className="h-[380px] w-full max-w-[520px] aspect-auto"
            >
              <RadarChart data={chartData} outerRadius="60%">
                <PolarGrid stroke="#cbd5e1" strokeDasharray="2 2" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={<RadarTick />}
                />
                <PolarRadiusAxis
                  domain={[0, 5]}
                  tick={false}
                  axisLine={false}
                />
                <Radar
                  name="Media observada"
                  dataKey="average"
                  stroke="#1f6fb5"
                  fill="#1f6fb5"
                  fillOpacity={0.24}
                  strokeWidth={2.25}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
              </RadarChart>
            </ChartContainer>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-5 border-t border-surface-container-high pt-3 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-ink-900">
                <i className="h-1.5 w-4 rounded-sm bg-titulados" />
                Media observada
              </span>
            </div>
          </div>
        ) : (
          <Empty className="py-8">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Inbox />
              </EmptyMedia>
              <EmptyTitle>Sin competencias disponibles</EmptyTitle>
              <EmptyDescription>
                No hay datos suficientes para mostrar este radar.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </CardContent>
    </Card>
  );
}

type RadarTickProps = {
  x?: number;
  y?: number;
  textAnchor?: "start" | "middle" | "end";
  payload?: { value?: string };
};

function RadarTick({
  x = 0,
  y = 0,
  textAnchor = "middle",
  payload,
}: RadarTickProps) {
  const value = String(payload?.value ?? "");
  if (value.length <= 22) {
    return (
      <text x={x} y={y} textAnchor={textAnchor} fill="#0f172a" fontSize={10} fontWeight={600}>
        {value}
      </text>
    );
  }

  const words = value.split(" ");
  const score = words.pop() ?? "";
  const midpoint = Math.ceil(words.join(" ").length / 2);
  let splitAt = 0;
  let distance = Number.POSITIVE_INFINITY;
  words.forEach((_, index) => {
    const candidate = words.slice(0, index + 1).join(" ");
    const candidateDistance = Math.abs(candidate.length - midpoint);
    if (candidateDistance < distance) {
      distance = candidateDistance;
      splitAt = index + 1;
    }
  });
  const firstLine = words.slice(0, splitAt).join(" ");
  const secondLine = `${words.slice(splitAt).join(" ")} ${score}`.trim();

  return (
    <text x={x} y={y} textAnchor={textAnchor} fill="#0f172a" fontSize={10} fontWeight={600}>
      <tspan x={x} dy="-0.55em">
        {firstLine}
      </tspan>
      <tspan x={x} dy="1.1em">
        {secondLine}
      </tspan>
    </text>
  );
}

function radarLabel(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("programación")) return "Programación";
  if (normalized.includes("bases")) return "Bases de datos";
  if (normalized.includes("requisitos")) return "Requisitos y modelado";
  if (normalized.includes("análisis")) return "Análisis de datos";
  if (normalized.includes("gestión")) return "Gestión de proyectos";
  if (normalized.includes("redes")) return "Redes";
  if (normalized.includes("seguridad")) return "Seguridad";
  if (normalized.includes("cloud")) return "Cloud / DevOps";
  return name;
}

export function FinancingCompletePage() {
  const {
    datasets,
    datasetId,
    setDatasetId,
    loading: datasetsLoading,
  } = useDatasets("TITULADOS");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [cross, setCross] = useState<Cross | null>(null);
  const [chi, setChi] = useState<ChiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [includeTotals, setIncludeTotals] = useState(true);
  const [colorHeatmap, setColorHeatmap] = useState(false);
  const rowField = "financiamiento_posgrado_estimado";
  const [columnField, setColumnField] = useState("nivel_posgrado_interes");
  const financingColumns = [
    { key: "nivel_posgrado_interes", label: "Nivel de posgrado de interés" },
    { key: "area_posgrado_interes", label: "Área de interés" },
    { key: "modalidad_posgrado", label: "Modalidad" },
  ];
  useEffect(() => {
    if (!datasetId) {
      setSummary(null);
      setCross(null);
      setChi(null);
      return;
    }
    setError(null);
    Promise.all([
      apiRequest<AnalyticsSummary>(
        "/analytics/titulados/financing?datasetId=" +
          encodeURIComponent(datasetId),
      ),
      apiRequest<Cross>(
        "/analytics/crosses?datasetId=" +
          encodeURIComponent(datasetId) +
          "&rowField=" +
          rowField +
          "&columnField=" +
          columnField,
      ),
    ])
      .then(async ([nextSummary, nextCross]) => {
        setSummary(nextSummary);
        setCross(nextCross);
        const frequencies = nextCross.rowCategories.map((row) =>
          nextCross.columnCategories.map(
            (column) => nextCross.counts[row]?.[column] ?? 0,
          ),
        );
        try {
          setChi(
            await apiRequest<ChiResult>("/analitica/chi-cuadrado", {
              method: "POST",
              body: JSON.stringify({ frecuencias: frequencies, alfa: 0.05 }),
            }),
          );
        } catch {
          setChi(null);
        }
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : String(cause)),
      );
  }, [datasetId, columnField]);
  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <PageHeading
          title={`Financiamiento${summary ? ` (n = ${summary.validResponses})` : ""}`}
          description="Fuente estimada para financiar estudios de posgrado y su relación con el nivel de interés."
          tone="titulados"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm">
            <Info />
            Definiciones
          </Button>
        </div>
      </div>
      <DatasetSelect
        datasets={datasets}
        value={datasetId}
        onChange={setDatasetId}
        loading={datasetsLoading}
      />
      {error && (
        <StatusPanel
          kind="warning"
          title="No se pudo cargar financiamiento"
          description={error}
        />
      )}
      {summary && (
        <DistributionCard
          title="Fuente de financiamiento estimada para posgrado"
          distribution={
            summary.distributions.financiamiento_posgrado_estimado ?? {
              validCount: 0,
              counts: {},
              percentages: {},
            }
          }
          tone="titulados"
        />
      )}
      <Card className="rounded-xl border-0 shadow-sm">
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <span className="label-default text-ink-600">
            FILAS (Y):{" "}
            <strong className="text-ink-900">
              Fuente de financiamiento estimada
            </strong>
          </span>
          <label className="label-default flex items-center gap-2">
            COLUMNAS (X):
            <Select value={columnField} onValueChange={setColumnField}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {financingColumns.map((field) => (
                  <SelectItem key={field.key} value={field.key}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-600">
            <Checkbox
              checked={includeTotals}
              onCheckedChange={(checked) => setIncludeTotals(checked === true)}
            />{" "}
            Totales
          </label>
          <label className="flex items-center gap-2 text-sm text-ink-600">
            <Checkbox
              checked={colorHeatmap}
              onCheckedChange={(checked) => setColorHeatmap(checked === true)}
            />{" "}
            Aplicar mapa de calor
          </label>
        </CardContent>
      </Card>
      {cross && (
        <>
          <CrossTable
            cross={cross}
            includeTotals={includeTotals}
            colorHeatmap={colorHeatmap}
            metric="count"
          />
          <div className="w-full">
            <ChiSquareCard result={chi} cross={cross} />
          </div>
        </>
      )}
    </div>
  );
}

function expectedFrequencyWarning(cross: Cross) {
  const total = cross.validCount;
  if (!total) return null;
  const rowTotals = cross.rowCategories.map((row) =>
    cross.columnCategories.reduce(
      (sum, column) => sum + (cross.counts[row]?.[column] ?? 0),
      0,
    ),
  );
  const columnTotals = cross.columnCategories.map((column) =>
    cross.rowCategories.reduce(
      (sum, row) => sum + (cross.counts[row]?.[column] ?? 0),
      0,
    ),
  );
  const totalCells = cross.rowCategories.length * cross.columnCategories.length;
  const lowCells = rowTotals.reduce(
    (count, rowTotal) =>
      count +
      columnTotals.reduce(
        (innerCount, columnTotal) =>
          innerCount + ((rowTotal * columnTotal) / total < 5 ? 1 : 0),
        0,
      ),
    0,
  );
  return { lowCells, totalCells };
}
function ChiSquareCard({
  result,
  cross,
}: {
  result: ChiResult | null;
  cross: Cross;
}) {
  const warning = expectedFrequencyWarning(cross);
  const reason = !cross.validCount
    ? "No hay celdas con observaciones válidas para evaluar."
    : cross.rowCategories.length < 2
      ? `La matriz solo tiene ${cross.rowCategories.length} categoría de fila; se requieren al menos 2.`
      : cross.columnCategories.length < 2
        ? `La matriz solo tiene ${cross.columnCategories.length} categoría de columna; se requieren al menos 2.`
        : "No se pudo completar el cálculo de χ² para esta matriz.";
  return (
    <Card className="gap-2 rounded-xl border-0 shadow-sm">
      <CardHeader className="grid-cols-[1fr_auto] gap-x-4 gap-y-1 pb-0">
        <CardTitle className="title-card">
          Prueba de independencia (χ²)
        </CardTitle>
        <div className="flex flex-col items-end gap-1">
          <Badge tone="neutral">
            {result
              ? result.rechazaIndependencia
                ? "p < α"
                : "p ≥ α"
              : "α = 0,05"}
          </Badge>
          {result && <span className="text-xs text-ink-600">α = 0,05</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {result ? (
          <>
            <div>
              {warning?.lowCells ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <strong>Aviso de validez:</strong> {warning.lowCells} de{" "}
                  {warning.totalCells} celdas tienen frecuencia esperada menor a
                  5; el resultado es orientativo.
                </div>
              ) : null}
            </div>
            <div className="grid items-center gap-4 md:grid-cols-3">
              <div>
                <p className="display-kpi tabular-nums text-ink-900">
                  p = {result.pValor.toFixed(3).replace(".", ",")}
                </p>
              </div>
              <div className="rounded-lg bg-surface-container-low p-4">
                <span className="caption-meta">χ² calculado</span>
                <p className="title-card tabular-nums">
                  {result.estadistico.toFixed(2).replace(".", ",")}
                </p>
              </div>
              <div className="rounded-lg bg-surface-container-low p-4">
                <span className="caption-meta">Grados de libertad</span>
                <p className="title-card tabular-nums">
                  {result.gradosLibertad}
                </p>
              </div>
            </div>
            <p className="text-xs text-ink-600">
              Prueba asintótica de Pearson para la tabla de contingencia.
            </p>
          </>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <strong>No aplicable:</strong> {reason}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function FinancingPage() {
  const {
    datasets,
    datasetId,
    setDatasetId,
    loading: datasetsLoading,
  } = useDatasets("TITULADOS");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [cross, setCross] = useState<Cross | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowField, setRowField] = useState("financiamiento_posgrado_estimado");
  const [columnField, setColumnField] = useState("nivel_posgrado_interes");
  useEffect(() => {
    if (!datasetId) {
      setSummary(null);
      return;
    }
    setLoading(true);
    setError(null);
    apiRequest<AnalyticsSummary>(
      `/analytics/titulados/financing?datasetId=${encodeURIComponent(datasetId)}`,
    )
      .then(setSummary)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : String(cause)),
      )
      .finally(() => setLoading(false));
  }, [datasetId]);
  async function loadCross() {
    if (!datasetId || rowField === columnField) return;
    setLoading(true);
    setError(null);
    try {
      setCross(
        await apiRequest<Cross>(
          `/analytics/crosses?datasetId=${encodeURIComponent(datasetId)}&rowField=${encodeURIComponent(rowField)}&columnField=${encodeURIComponent(columnField)}`,
        ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void loadCross();
  }, [datasetId, rowField, columnField]);
  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <PageHeading
          title={`Financiamiento${summary ? ` (n = ${summary.validResponses})` : ""}`}
          description="Fuente estimada para financiar estudios de posgrado y su relación con el nivel de interés."
          tone="titulados"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm">
            <Info />
            Definiciones
          </Button>
          <ExportActions />
        </div>
      </div>
      <DatasetSelect
        datasets={datasets}
        value={datasetId}
        onChange={setDatasetId}
        loading={datasetsLoading}
      />
      {error && (
        <StatusPanel
          kind="warning"
          title="No se pudo cargar financiamiento"
          description={error}
        />
      )}
      {loading && (
        <StatusPanel
          kind="loading"
          title="Cargando financiamiento"
          description="Consultando las respuestas del dataset."
        />
      )}
      {summary && (
        <>
          <DistributionCard
            title="Fuente de financiamiento estimada para posgrado"
            distribution={
              summary.distributions.financiamiento_posgrado_estimado ?? {
                validCount: 0,
                counts: {},
                percentages: {},
              }
            }
            tone="titulados"
          />
          <Card className="rounded-xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="title-card">
                Cruce: financiamiento vs. nivel de posgrado
              </CardTitle>
              <CardDescription>
                Selecciona las variables y genera la tabla de contingencia.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="label-default grid gap-1">
                Filas
                <Select value={rowField} onValueChange={setRowField}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="financiamiento_posgrado_estimado">
                      Fuente de financiamiento estimada
                    </SelectItem>
                    <SelectItem value="financiamiento_posgrado_cursado">
                      Financiamiento del posgrado cursado
                    </SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <label className="label-default grid gap-1">
                Columnas
                <Select value={columnField} onValueChange={setColumnField}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nivel_posgrado_interes">
                      Nivel de posgrado de interés
                    </SelectItem>
                    <SelectItem value="area_posgrado_interes">
                      Área de interés
                    </SelectItem>
                    <SelectItem value="modalidad_posgrado">
                      Modalidad
                    </SelectItem>
                  </SelectContent>
                </Select>
              </label>
              <Button
                onClick={loadCross}
                disabled={loading || !datasetId || rowField === columnField}
              >
                Generar tabla
              </Button>
            </CardContent>
          </Card>
          {cross && (
            <CrossTable
              cross={cross}
              includeTotals
              colorHeatmap={false}
              metric="count"
            />
          )}
        </>
      )}
    </div>
  );
}

export function CrossExportPage({ domain }: { domain: Domain }) {
  const tone: Tone = domain === "TITULADOS" ? "titulados" : "empleadores";
  const {
    datasets,
    datasetId,
    setDatasetId,
    loading: datasetsLoading,
  } = useDatasets(domain);
  const [rowField, setRowField] = useState(
    domain === "TITULADOS" ? "situacion_laboral_actual" : "tipo_organizacion",
  );
  const [columnField, setColumnField] = useState(
    domain === "TITULADOS" ? "interes_posgrado" : "tamano_organizacion",
  );
  const [cross, setCross] = useState<Cross | null>(null);
  const [includeTotals, setIncludeTotals] = useState(true);
  const [metric, setMetric] = useState<CrossMetric>("count");
  const [colorHeatmap, setColorHeatmap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx" | "png">(
    "csv",
  );
  const [activeView, setActiveView] = useState<"table" | "bars">("table");
  const fields =
    domain === "TITULADOS"
      ? [
          { key: "edad_rango", label: "Rango de edad", group: "Perfil" },
          { key: "genero", label: "Género", group: "Perfil" },
          {
            key: "segmento_titulacion",
            label: "Segmento (Junior / Consolidado)",
            group: "Perfil",
          },
          {
            key: "situacion_laboral_actual",
            label: "Estado laboral",
            group: "Perfil",
          },
          { key: "sector_trabajo", label: "Sector laboral", group: "Perfil" },
          {
            key: "tiene_formacion_complementaria",
            label: "Formación complementaria (Sí/No)",
            group: "Formación",
          },
          {
            key: "interes_posgrado",
            label: "Interés en posgrado (Sí/No)",
            group: "Formación",
          },
          {
            key: "nivel_posgrado_interes",
            label: "Nivel de posgrado de interés",
            group: "Formación",
          },
          {
            key: "area_posgrado_interes",
            label: "Área de interés",
            group: "Formación",
          },
          {
            key: "modalidad_posgrado",
            label: "Modalidad preferida",
            group: "Formación",
          },
          {
            key: "financiamiento_posgrado_estimado",
            label: "Fuente de financiamiento estimada",
            group: "Formación",
          },
          {
            key: "rubro_trabajo_actual",
            label: "Rubro de la organización",
            group: "Trabajo",
          },
          {
            key: "antiguedad_trabajo",
            label: "Antigüedad en el trabajo",
            group: "Trabajo",
          },
          {
            key: "remuneracion_rango",
            label: "Remuneración mensual",
            group: "Trabajo",
          },
          {
            key: "primera_experiencia_laboral",
            label: "¿Es su primer empleo? (Sí/No)",
            group: "Trabajo",
          },
        ]
      : [
          {
            key: "tipo_organizacion",
            label: "Tipo de organización",
            group: "Perfil",
          },
          {
            key: "tamano_organizacion",
            label: "Tamaño de organización",
            group: "Perfil",
          },
          {
            key: "rubro_organizacion",
            label: "Rubro de la organización",
            group: "Perfil",
          },
          {
            key: "contrato_titulados_ultimos_5_anios",
            label: "Contratación reciente",
            group: "Perfil",
          },
        ];
  const fieldGroups = Array.from(
    new Set(fields.map((field) => field.group)),
  ).map((group) => ({
    group,
    fields: fields.filter((field) => field.group === group),
  }));
  async function loadCross() {
    if (!datasetId || rowField === columnField) return;
    setLoading(true);
    setError(null);
    try {
      setCross(
        await apiRequest<Cross>(
          `/analytics/crosses?datasetId=${encodeURIComponent(datasetId)}&rowField=${encodeURIComponent(rowField)}&columnField=${encodeURIComponent(columnField)}`,
        ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void loadCross();
  }, [datasetId, rowField, columnField]);
  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <PageHeading
          title={`Cruces bivariados y exportación${cross ? ` (n = ${cross.validCount})` : ""}`}
          description="Configura una matriz de frecuencias y revisa su distribución en tabla o barras."
          tone={tone}
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm">
            <Info />
            Definiciones
          </Button>
        </div>
      </div>
      <DatasetSelect
        datasets={datasets}
        value={datasetId}
        onChange={setDatasetId}
        loading={datasetsLoading}
      />
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card className="rounded-xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="title-card flex items-center justify-between">
                Configurar cruce{" "}
                <SlidersHorizontal className="size-4 text-ink-600" />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="label-default grid gap-1">
                Variable de filas
                <Select value={rowField} onValueChange={setRowField}>
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldGroups.map(({ group, fields: groupFields }) => (
                      <SelectGroup
                        key={group}
                        className="border-t border-border-line px-1 first:border-t-0"
                      >
                        <SelectLabel className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-ink-600">
                          {group}
                        </SelectLabel>
                        {groupFields.map((field) => (
                          <SelectItem
                            key={field.key}
                            value={field.key}
                            disabled={field.key === columnField}
                            className="data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45"
                          >
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="label-default grid gap-1">
                Variable de columnas
                <Select value={columnField} onValueChange={setColumnField}>
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldGroups.map(({ group, fields: groupFields }) => (
                      <SelectGroup
                        key={group}
                        className="border-t border-border-line px-1 first:border-t-0"
                      >
                        <SelectLabel className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-ink-600">
                          {group}
                        </SelectLabel>
                        {groupFields.map((field) => (
                          <SelectItem
                            key={field.key}
                            value={field.key}
                            disabled={field.key === rowField}
                            className="data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45"
                          >
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <div className="space-y-3 border-t border-border-line pt-3 text-xs text-ink-600">
                <p className="caption-bold text-ink-600">MÉTRICA DE CELDA</p>
                <RadioGroup
                  value={metric}
                  onValueChange={(value) => setMetric(value as CrossMetric)}
                  className="gap-2"
                >
                  <label className="flex items-start gap-2">
                    <RadioGroupItem value="count" />
                    <span>
                      Frecuencia absoluta
                      <br />
                      (conteos)
                    </span>
                  </label>
                  {activeView === "table" && (
                    <>
                      <label className="flex items-center gap-2">
                        <RadioGroupItem value="rowPercent" />
                        <span>% por fila</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <RadioGroupItem value="columnPercent" />
                        <span>% por columna</span>
                      </label>
                    </>
                  )}
                  {activeView === "bars" && (
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="rowPercent" />
                      <span>% por fila</span>
                    </label>
                  )}
                </RadioGroup>
                <div
                  className={
                    activeView === "table"
                      ? "space-y-2 border-t border-border-line pt-3"
                      : "hidden"
                  }
                >
                  <p className="caption-bold text-ink-600">
                    OPCIONES DE CÁLCULO
                  </p>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={includeTotals}
                      onCheckedChange={(checked) =>
                        setIncludeTotals(checked === true)
                      }
                    />
                    <span>Incluir marginales (totales)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={colorHeatmap}
                      onCheckedChange={(checked) =>
                        setColorHeatmap(checked === true)
                      }
                    />
                    <span>Colorear mapa de calor</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="title-card">Exportar resultados</CardTitle>
              <CardDescription>
                Selecciona un formato para descargar la matriz.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <Select
                    value={exportFormat}
                    onValueChange={(value) =>
                      setExportFormat(value as "csv" | "xlsx" | "png")
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">Tabla CSV</SelectItem>
                      <SelectItem value="xlsx">Libro Excel (XLSX)</SelectItem>
                      <SelectItem value="png">Gráfico PNG</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="icon"
                  className="size-9"
                  variant="secondary"
                  title="Descargar"
                  aria-label="Descargar"
                  onClick={() => {
                    if (!cross) return;
                    if (exportFormat === "csv") exportCrossCsv(cross);
                    else if (exportFormat === "xlsx") exportCrossExcel(cross);
                    else exportCrossPng(cross);
                  }}
                  disabled={!cross}
                >
                  <Download />
                </Button>
              </div>
              {cross && (
                <p className="border-t border-border-line pt-3 text-xs text-ink-600">
                  Registros incluidos: <strong>{cross.validCount}</strong>
                  <br />
                  Cruce: {labelFor(rowField)} vs. {labelFor(columnField)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="min-w-0 space-y-4">
          <Tabs
            value={activeView}
            onValueChange={(view) => {
              setActiveView(view as "table" | "bars");
              if (view === "bars" && metric === "columnPercent") {
                setMetric("count");
              }
            }}
          >
            <TabsList variant="line" className="w-full justify-start text-xs">
              <TabsTrigger value="table">Tabla</TabsTrigger>
              <TabsTrigger value="bars">Barras comparativas</TabsTrigger>
            </TabsList>
          </Tabs>
          {loading && (
            <StatusPanel
              kind="loading"
              title="Calculando cruce"
              description="Actualizando la matriz con las variables seleccionadas."
            />
          )}
          {error && (
            <StatusPanel
              kind="warning"
              title="No se pudo calcular el cruce"
              description={error}
            />
          )}
          {cross ? (
            activeView === "bars" ? (
              <CrossBars
                cross={cross}
                metric={metric}
                totalResponses={
                  datasets.find((dataset) => dataset.id === datasetId)
                    ?.rowsValid
                }
              />
            ) : (
              <CrossTable
                cross={cross}
                totalResponses={
                  datasets.find((dataset) => dataset.id === datasetId)
                    ?.rowsValid
                }
                includeTotals={includeTotals}
                colorHeatmap={colorHeatmap}
                metric={metric}
              />
            )
          ) : (
            <StatusPanel
              kind="info"
              title="Genera una matriz de cruce"
              description="Selecciona las variables de filas y columnas para mostrar la tabla bivariada."
            />
          )}
        </div>
      </div>
    </div>
  );
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
  const [repetitions, setRepetitions] = useState(1000);
  const [seed, setSeed] = useState(42);
  const [result, setResult] = useState<Simulation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sampleSizeValid = Number.isInteger(sampleSize) && sampleSize >= 1 && sampleSize <= 100000;
  const repetitionsValid = Number.isInteger(repetitions) && repetitions >= 1 && repetitions <= 100000;
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
    if (!parametersValid) {
      setError("Revisa los parámetros: deben ser números enteros válidos dentro de los límites indicados.");
      return;
    }
    const distribution = summary?.distributions[variable];
    if (!distribution) return;
    const categories = Object.keys(distribution.counts);
    const observedWeights = categories.map((category) => weights[category] ?? distribution.counts[category]);
    const total = observedWeights.reduce((sum, value) => sum + value, 0);
    setLoading(true);
    setError(null);
    try {
      setResult(
        await apiRequest<Simulation>("/analytics/simulation/multinomial", {
          method: "POST",
          body: JSON.stringify({
            categories,
            probabilities: observedWeights.map((value) => value / total),
            observedCounts: categories.map((category) => distribution.counts[category]),
            sampleSize,
            repetitions,
            seed,
          }),
        }),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <PageHeading
          title={`Simulación de escenarios${summary ? ` (n = ${summary.validResponses})` : ""}`}
          description="Escenarios hipotéticos mediante muestreo Monte Carlo con transformada inversa."
          tone="titulados"
        />
        <Badge tone="titulados">Algoritmo: Monte Carlo</Badge>
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
            <CardDescription>La suma se normaliza automáticamente al 100 %. No es una predicción.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="label-default grid gap-1">
              Variable discreta
              <Select value={variable} onValueChange={setVariable}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="area_posgrado_interes">Área de posgrado de interés</SelectItem>
                  <SelectItem value="nivel_posgrado_interes">Nivel de posgrado de interés</SelectItem>
                  <SelectItem value="modalidad_posgrado">Modalidad preferida</SelectItem>
                  <SelectItem value="interes_posgrado">Interés en posgrado</SelectItem>
                  <SelectItem value="situacion_laboral_actual">Estado laboral</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="label-default grid gap-1">
              Muestra sintética (N)
              <Input className="w-full [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" type="number" min="1" max="100000" step="1" value={sampleSize} aria-invalid={!sampleSizeValid} onChange={(event) => setSampleSize(parseInteger(event.target.value, sampleSize))} />
              {!sampleSizeValid && <span className="text-xs text-destructive">Usa un entero entre 1 y 100.000.</span>}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="label-default grid gap-1">
                Réplicas (R)
                <Input className="control" type="number" min="1" max="100000" step="1" value={repetitions} aria-invalid={!repetitionsValid} onChange={(event) => setRepetitions(parseInteger(event.target.value, repetitions))} />
                {!repetitionsValid && <span className="text-xs text-destructive">Entre 1 y 100.000.</span>}
              </label>
              <label className="label-default grid gap-1">
                Semilla (seed)
                <Input className="control" type="number" step="1" value={seed} aria-invalid={!seedValid} onChange={(event) => setSeed(parseInteger(event.target.value, seed))} />
              </label>
            </div>
            {summary && <SimulationWeights distribution={summary.distributions[variable]} weights={weights} setWeights={setWeights} />}
            <Button className="w-full" onClick={run} disabled={!summary || loading || !parametersValid}>
              {loading ? "Ejecutando…" : "Ejecutar simulación"}
            </Button>
            <p className="rounded-md bg-surface-container-low p-2 text-xs text-ink-600">Las probabilidades iniciales se toman de las frecuencias observadas y pueden ajustarse antes de ejecutar.</p>
          </CardContent>
        </Card>
        <div className="space-y-5">
          {result ? <SimulationDistribution result={result} observedTotal={summary?.distributions[variable]?.validCount ?? 0} /> : <StatusPanel kind="info" title="Ejecuta una simulación" description="Configura los parámetros y genera la distribución simulada con su intervalo de confianza del 95 %." />}
        </div>
      </div>
      {error && (
        <StatusPanel
          kind="warning"
          title="No se pudo ejecutar la simulación"
          description={error}
        />
      )}
      {result && <SimulationComparisonTable result={result} observedTotal={summary?.distributions[variable]?.validCount ?? 0} />}
    </div>
  );
}

function SimulationWeights({
  distribution,
  weights,
  setWeights,
}: {
  distribution?: CategoryDistribution;
  weights: Record<string, number>;
  setWeights: Dispatch<SetStateAction<Record<string, number>>>;
}) {
  if (!distribution) return null;
  const entries = Object.entries(distribution.counts);
  return (
    <div className="space-y-3 rounded-lg bg-surface-container-low p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="caption-bold text-ink-700">Ajustar probabilidades (opcional)</p>
        <Button variant="link" size="xs" onClick={() => setWeights({})}>Restablecer</Button>
      </div>
      <p className="text-xs text-ink-600">La suma se normaliza automáticamente al 100 %.</p>
      {entries.map(([label, count]) => {
        const value = weights[label] ?? count;
        return (
          <label key={label} className="grid gap-1 text-xs">
            <span className="flex justify-between gap-2"><span className="truncate">{label}</span><strong>{value}</strong></span>
            <Slider min={0} max={Math.max(10, Math.max(...entries.map(([, item]) => item)) * 2)} step={1} value={[value]} onValueChange={(next) => setWeights((current) => ({ ...current, [label]: next[0] ?? value }))} />
          </label>
        );
      })}
    </div>
  );
}

function SimulationDistribution({ result, observedTotal }: { result: Simulation; observedTotal: number }) {
  return (
    <Card className="rounded-xl border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="title-card">Distribución simulada e Intervalo de Confianza (95%)</CardTitle>
            <CardDescription>Media estimada y límites del intervalo por categoría.</CardDescription>
          </div>
          <Badge tone="neutral">n = {observedTotal} · N = {result.sampleSize}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {result.categories.map((category) => (
          <div key={category.category} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium">{category.category}</span>
              <span className="whitespace-nowrap tabular-nums text-primary">{formatDecimal(category.simulatedMean)}% <span className="text-xs text-ink-600">[IC 95%: {formatDecimal(category.lower95)}% – {formatDecimal(category.upper95)}%]</span></span>
            </div>
            <div className="relative h-5 rounded bg-surface-container-low">
              <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-primary/75" style={{ width: `${category.simulatedMean}%` }} />
              <div className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-ink-900" style={{ left: `${category.lower95}%`, width: `${Math.max(0, category.upper95 - category.lower95)}%` }} />
              <span className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" style={{ left: `${category.simulatedMean}%` }} />
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-5 border-t border-border-line pt-3 text-xs text-ink-600">
          <span><i className="mr-1 inline-block size-2 rounded-sm bg-primary" />Media estimada</span>
          <span><i className="mr-1 inline-block h-0.5 w-4 bg-ink-900 align-middle" />Límites IC 95%</span>
          <span className="ml-auto">{result.repetitions.toLocaleString("es-BO")} réplicas · semilla {result.seed}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SimulationComparisonTable({ result, observedTotal }: { result: Simulation; observedTotal: number }) {
  return (
    <Card className="rounded-xl border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="title-card">Tabla comparativa de frecuencias y variabilidad</CardTitle>
            <CardDescription>Frecuencias observadas, medias simuladas e intervalos de confianza.</CardDescription>
          </div>
          <Badge tone="neutral">n = {observedTotal}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table className="min-w-[760px] text-sm">
          <TableHeader><TableRow className="bg-surface-container-low"><TableHead>Categoría</TableHead><TableHead className="text-right">Frecuencia obs. (n)</TableHead><TableHead className="text-right">% observado</TableHead><TableHead className="text-right">% simulado (media)</TableHead><TableHead className="text-right">Rango 95 % (IC)</TableHead><TableHead className="text-right">Desv. est. (s)</TableHead></TableRow></TableHeader>
          <TableBody>
            {result.categories.map((category) => (
              <TableRow key={category.category}>
                <TableCell className="font-medium">{category.category}</TableCell>
                <TableCell className="text-right tabular-nums">{category.observedCount}</TableCell>
                <TableCell className="text-right tabular-nums">{formatDecimal(category.observedPercentage)}%</TableCell>
                <TableCell className="text-right tabular-nums text-primary">{formatDecimal(category.simulatedMean)}%</TableCell>
                <TableCell className="text-right tabular-nums">[{formatDecimal(category.lower95)}% – {formatDecimal(category.upper95)}%]</TableCell>
                <TableCell className="text-right tabular-nums">{category.standardDeviation == null ? "—" : `${formatDecimal(category.standardDeviation)}%`}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-surface-container-low font-semibold"><TableCell>Total muestral</TableCell><TableCell className="text-right tabular-nums">{result.categories.reduce((sum, category) => sum + category.observedCount, 0)}</TableCell><TableCell className="text-right tabular-nums">100,0%</TableCell><TableCell className="text-right tabular-nums">100,0%</TableCell><TableCell className="text-right">—</TableCell><TableCell className="text-right">—</TableCell></TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
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

function useDatasets(domain: Domain) {
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [datasetId, setDatasetIdState] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiRequest<DatasetSummary[]>("/datasets")
      .then((items) => {
        const filtered = items.filter((item) => item.surveyType === domain);
        setDatasets(filtered);
        const stored = localStorage.getItem("simulacionem.activeDatasetId");
        setDatasetIdState(
          filtered.some((item) => item.id === stored)
            ? (stored ?? undefined)
            : filtered.at(-1)?.id,
        );
      })
      .finally(() => setLoading(false));
  }, [domain]);
  const setDatasetId = (id?: string) => {
    setDatasetIdState(id);
    if (id) localStorage.setItem("simulacionem.activeDatasetId", id);
  };
  return { datasets, datasetId, setDatasetId, loading };
}
function PageHeading({
  title,
  description,
  tone,
}: {
  title: string;
  description: string;
  tone: Tone;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <p className="caption-bold uppercase tracking-wider text-ink-600">
          SimulacionEM
        </p>
        <Badge tone={tone}>
          {tone === "titulados" ? "Titulados" : "Empleadores"}
        </Badge>
      </div>
      <h1 className="headline-page">{title}</h1>
      <p className="max-w-2xl text-sm text-ink-600">{description}</p>
    </div>
  );
}
function DatasetSelect({
  datasets,
  value,
  onChange,
  loading,
}: {
  datasets: DatasetSummary[];
  value?: string;
  onChange: (id?: string) => void;
  loading: boolean;
}) {
  const selectedDataset = datasets.find((dataset) => dataset.id === value);
  return (
    <div className="flex w-full flex-wrap items-center gap-3">
      <label className="label-default grid w-full max-w-sm gap-1 text-ink-600">
        Dataset
        <Select
          value={value}
          disabled={loading}
          onValueChange={(nextValue) => onChange(nextValue || undefined)}
        >
          <SelectTrigger
            className="w-full min-w-0 max-w-full"
            title={
              selectedDataset
                ? `${selectedDataset.sourceFileName} · ${selectedDataset.rowsValid} válidas`
                : "Seleccionar dataset"
            }
          >
            <SelectValue placeholder="Seleccionar dataset" />
          </SelectTrigger>
          <SelectContent>
            {datasets.map((dataset) => (
              <SelectItem key={dataset.id} value={dataset.id}>
                {dataset.sourceFileName} · {dataset.rowsValid} válidas
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
    </div>
  );
}
function DistributionCard({
  title,
  distribution,
  tone,
}: {
  title: string;
  distribution: CategoryDistribution;
  tone: Tone;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="title-card">{labelFor(title)}</CardTitle>
        <CardDescription>
          Conteo y porcentaje · n = {distribution.validCount}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(distribution.counts).map(([key, count]) => (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{key}</span>
              <span className="tabular-nums">
                {count} · {distribution.percentages[key]}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${tone === "titulados" ? "bg-titulados" : "bg-empleadores"}`}
                style={{ width: `${distribution.percentages[key]}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
function CrossTable({
  cross,
  totalResponses,
  includeTotals,
  colorHeatmap,
  metric,
}: {
  cross: Cross;
  totalResponses?: number;
  includeTotals: boolean;
  colorHeatmap: boolean;
  metric: CrossMetric;
}) {
  const columnTotal = (column: string) =>
    cross.rowCategories.reduce(
      (sum, row) => sum + (cross.counts[row]?.[column] ?? 0),
      0,
    );
  const rowTotal = (row: string) =>
    cross.columnCategories.reduce(
      (sum, column) => sum + (cross.counts[row]?.[column] ?? 0),
      0,
    );
  const columnPercent = (row: string, column: string) => {
    const total = columnTotal(column);
    return total ? ((cross.counts[row]?.[column] ?? 0) * 100) / total : 0;
  };
  const cellValue = (row: string, column: string) =>
    metric === "count"
      ? (cross.counts[row]?.[column] ?? 0)
      : metric === "rowPercent"
        ? (cross.percentages[row]?.[column] ?? 0)
        : columnPercent(row, column);
  const max = Math.max(
    1,
    ...cross.rowCategories.flatMap((row) =>
      cross.columnCategories.map((column) => cellValue(row, column)),
    ),
  );
  const formatValue = (value: number) =>
    metric === "count"
      ? String(value)
      : `${value.toFixed(1).replace(".", ",")}%`;
  const metricLabel =
    metric === "count"
      ? "Frecuencia absoluta (conteos)"
      : metric === "rowPercent"
        ? "% por fila"
        : "% por columna";
  const marginalPercent = (value: number) =>
    cross.validCount
      ? `${((value * 100) / cross.validCount).toFixed(1).replace(".", ",")}%`
      : "0,0%";
  const labelColumnWidth = Math.min(
    44,
    Math.max(28, 58 - cross.columnCategories.length * 5),
  );
  const valueColumnCount = cross.columnCategories.length + (includeTotals ? 1 : 0);
  const valueColumnWidth = (100 - labelColumnWidth) / valueColumnCount;
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="title-card">Vista previa de matriz</CardTitle>
          <CardDescription className="shrink-0 text-right">
            {metricLabel.replace(" (conteos)", "")} · n = {cross.validCount}
            {totalResponses != null ? ` de ${totalResponses}` : ""}
            {cross.smallSample ? " · muestra reducida" : ""}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="min-w-0 overflow-x-auto">
        <Table className="min-w-[620px] table-fixed text-sm">
          <colgroup>
            <col style={{ width: `${labelColumnWidth}%` }} />
            {cross.columnCategories.map((column) => (
              <col
                key={column}
                style={{ width: `${valueColumnWidth}%` }}
              />
            ))}
            {includeTotals && <col style={{ width: `${valueColumnWidth}%` }} />}
          </colgroup>
          <TableHeader>
            <TableRow className="bg-surface-container-low hover:bg-surface-container-low">
              <TableHead className="min-w-[210px] whitespace-nowrap p-2 text-left">
                Fila
              </TableHead>
              {cross.columnCategories.map((column) => (
                <TableHead
                  key={column}
                  className="whitespace-normal break-words p-2 text-right leading-tight"
                >
                  {booleanLabel(column)}
                </TableHead>
              ))}
              {includeTotals && (
                <TableHead className="w-20 break-words p-2 text-right">
                  Total fila
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {cross.rowCategories.map((row) => (
              <TableRow key={row} className="border-t hover:bg-transparent">
                <TableCell className="min-w-[210px] whitespace-nowrap p-2 font-medium">
                  {booleanLabel(row)}
                </TableCell>
                {cross.columnCategories.map((column) => {
                  const value = cellValue(row, column);
                  const intensity = value / max;
                  return (
                    <TableCell
                      key={column}
                      className="tabular-nums p-2 text-right font-medium transition-[background-color,color] duration-300 ease-out"
                      style={
                        colorHeatmap
                          ? {
                              backgroundColor: `rgba(31,111,181,${0.08 + intensity * 0.75})`,
                              color: contrastTextColor(
                                `rgba(31,111,181,${0.08 + intensity * 0.75})`,
                              ),
                            }
                          : undefined
                      }
                    >
                      {formatValue(value)}
                    </TableCell>
                  );
                })}
                {includeTotals && (
                  <TableCell className="tabular-nums bg-surface-container-low p-2 text-right font-semibold">
                    {metric === "count"
                      ? rowTotal(row)
                      : metric === "rowPercent"
                        ? "100,0%"
                        : marginalPercent(rowTotal(row))}
                  </TableCell>
                )}
              </TableRow>
            ))}
            {includeTotals && (
              <TableRow className="border-t-2 bg-surface-container-low font-semibold hover:bg-surface-container-low">
                <TableCell className="whitespace-nowrap p-2">
                  Total columna
                </TableCell>
                {cross.columnCategories.map((column) => (
                  <TableCell
                    key={column}
                    className="tabular-nums p-2 text-right"
                  >
                    {metric === "count"
                      ? columnTotal(column)
                      : metric === "columnPercent"
                        ? "100,0%"
                        : marginalPercent(columnTotal(column))}
                  </TableCell>
                ))}
                <TableCell className="tabular-nums p-2 text-right">
                  {metric === "count" ? cross.validCount : "100,0%"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {colorHeatmap && (
          <div className="mt-4 border-t border-surface-container-high pt-3 text-xs text-ink-600">
            <div className="flex items-center justify-between">
              <span>Escala de {metricLabel}</span>
              <span>
                0 ·{" "}
                {metric === "count"
                  ? max
                  : `${max.toFixed(1).replace(".", ",")}%`}
              </span>
            </div>
            <div
              className="mt-1 h-2 rounded-full"
              style={{
                background:
                  "linear-gradient(to right, rgba(31,111,181,0.08), rgba(31,111,181,0.83))",
              }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
function formatMetric(summary: AnalyticsSummary, key: string) {
  const distribution = summary.distributions[key];
  if (distribution) return `${distribution.validCount}`;
  return summary.numericAverages[key] === undefined
    ? "—"
    : String(summary.numericAverages[key]);
}
function labelFor(key: string) {
  return key
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function downloadFile(content: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
function exportCrossCsv(cross: Cross) {
  const rows = [
    ["Fila", ...cross.columnCategories.map(booleanLabel)],
    ...cross.rowCategories.map((row) => [
      booleanLabel(row),
      ...cross.columnCategories.map((column) =>
        String(cross.counts[row]?.[column] ?? 0),
      ),
    ]),
  ];
  downloadFile(
    rows
      .map((row) =>
        row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","),
      )
      .join("\n"),
    "cruce.csv",
    "text/csv;charset=utf-8",
  );
}
function exportCrossExcel(cross: Cross) {
  const rows = [
    ["Fila", ...cross.columnCategories.map(booleanLabel)],
    ...cross.rowCategories.map((row) => [
      booleanLabel(row),
      ...cross.columnCategories.map((column) =>
        String(cross.counts[row]?.[column] ?? 0),
      ),
    ]),
  ];
  const html = `<table>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</table>`;
  downloadFile(
    `<!doctype html><html><body>${html}</body></html>`,
    "cruce.xls",
    "application/vnd.ms-excel",
  );
}
function exportCrossPng(cross: Cross) {
  const width = 900;
  const height = Math.max(180, (cross.rowCategories.length + 1) * 42 + 40);
  const headers = ["Fila", ...cross.columnCategories.map(booleanLabel)];
  const rows = [
    headers,
    ...cross.rowCategories.map((row) => [
      booleanLabel(row),
      ...cross.columnCategories.map((column) =>
        String(cross.counts[row]?.[column] ?? 0),
      ),
    ]),
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="white"/>${rows.map((row, rowIndex) => row.map((cell, columnIndex) => `<text x="${20 + columnIndex * (width / headers.length)}" y="${35 + rowIndex * 42}" font-family="Arial" font-size="14" fill="#0f172a">${cell}</text>`).join("")).join("")}</svg>`;
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(image, 0, 0);
    canvas.toBlob(
      (blob) => blob && downloadFile(blob, "cruce.png", "image/png"),
    );
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
function CrossBars({
  cross,
  metric,
  totalResponses,
}: {
  cross: Cross;
  metric: CrossMetric;
  totalResponses?: number;
}) {
  const colors = [
    "#1f6fb5",
    "#7db1dd",
    "#173f67",
    "#8b5bd1",
    "#ed552f",
    "#18a39a",
  ];
  const total = cross.validCount || 1;
  const rowTotal = (row: string) =>
    cross.columnCategories.reduce(
      (sum, column) => sum + (cross.counts[row]?.[column] ?? 0),
      0,
    );
  const maxRowTotal = Math.max(1, ...cross.rowCategories.map(rowTotal));
  const rowPercent = (row: string, column: string) =>
    cross.percentages[row]?.[column] ?? 0;
  const valueLabel = (row: string, column: string, value: number) =>
    metric === "rowPercent"
      ? `${rowPercent(row, column).toFixed(1).replace(".", ",")}%`
      : String(value);
  const subtitle =
    metric === "rowPercent" ? "% por fila" : "Frecuencia absoluta";
  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="title-card">
            Distribución agregada por categoría
          </CardTitle>
          <CardDescription className="shrink-0 text-right">
            {subtitle} · n = {cross.validCount}
            {totalResponses != null ? ` de ${totalResponses}` : ""}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {cross.rowCategories.map((row) => {
          const totalRow = rowTotal(row);
          return (
            <div key={row} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate font-medium text-ink-900">
                  {booleanLabel(row)} (n = {totalRow})
                </span>
                <span className="shrink-0 text-ink-600">
                  {((totalRow * 100) / total).toFixed(1).replace(".", ",")}% del
                  total
                </span>
              </div>
              {totalRow > 0 ? (
                <Progress
                  value={(totalRow * 100) / maxRowTotal}
                  className="bg-surface-container-high"
                >
                  <div className="flex h-full w-full">
                    {cross.columnCategories.map((column, index) => {
                      const value = cross.counts[row]?.[column] ?? 0;
                      if (value <= 0) return null;
                      const width = (value * 100) / totalRow;
                      return (
                        <div
                          key={column}
                          className="flex min-w-0 items-center justify-center px-1 text-[10px] font-semibold"
                          style={{
                            width: width + "%",
                            backgroundColor: colors[index % colors.length],
                            color: contrastTextColor(colors[index % colors.length]),
                          }}
                          title={
                            booleanLabel(column) +
                            ": " +
                            valueLabel(row, column, value)
                          }
                        >
                          <span className="truncate">
                            {width >= 10
                              ? valueLabel(row, column, value)
                              : ""}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </Progress>
              ) : (
                <Empty className="min-h-12 py-2">
                  <EmptyTitle>Sin respuestas</EmptyTitle>
                </Empty>
              )}
            </div>
          );
        })}
        <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-surface-container-high pt-3 text-[11px] text-ink-600">
          {cross.columnCategories.map((column, index) => (
            <span key={column} className="flex items-center gap-1">
              <i
                className="size-2 rounded-sm"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              {booleanLabel(column)}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
