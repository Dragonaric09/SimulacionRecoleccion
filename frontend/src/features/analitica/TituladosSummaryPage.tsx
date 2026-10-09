import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, GraduationCap, Users } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartContainer,
} from "@/components/ui/chart";
import { Cell, Pie, PieChart } from "recharts";
import { apiRequest } from "@/api/client";
import type { DatasetSummary } from "@/features/encuesta/api";
import type { AnalyticsSummary, CategoryDistribution } from "./api";

const fields =
  "situacion_laboral_actual,interes_posgrado,sector_trabajo,anio_titulacion";

export function TituladosSummaryPage() {
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [datasetId, setDatasetId] = useState<string | undefined>(
    () => localStorage.getItem("simulacionem.activeDatasetId") ?? undefined,
  );
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [datasetsReady, setDatasetsReady] = useState(false);

  useEffect(() => {
    apiRequest<DatasetSummary[]>("/datasets")
      .then((items) => {
        const titulados = items.filter(
          (item) => item.surveyType === "TITULADOS",
        );
        setDatasets(titulados);
        if (!datasetId || !titulados.some((item) => item.id === datasetId))
          setDatasetId(titulados.at(-1)?.id);
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : String(cause)),
      )
      .finally(() => setDatasetsReady(true));
  }, [datasetId]);

  useEffect(() => {
    if (!datasetsReady) return;
    if (!datasetId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    apiRequest<AnalyticsSummary>(
      `/analytics/titulados/summary?datasetId=${encodeURIComponent(datasetId)}&fields=${encodeURIComponent(fields)}`,
    )
      .then(setSummary)
      .catch((cause) => {
        const message = cause instanceof Error ? cause.message : String(cause);
        if (message.includes("HTTP 404")) {
          localStorage.removeItem("simulacionem.activeDatasetId");
          setDatasetId(undefined);
          setSummary(null);
        }
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [datasetId, datasetsReady]);

  const laboral = summary?.distributions.situacion_laboral_actual;
  const posgrado = summary?.distributions.interes_posgrado;
  const trabajo = laboral
    ? firstCount(laboral, ["Trabaja en una organización", "Trabaja"])
    : null;
  const interes = posgrado ? firstCount(posgrado, ["Sí", "SI", "Si"]) : null;
  const medianYear = summary?.numericMedians.anio_titulacion;
  const yearsSince = medianYear ? new Date().getFullYear() - medianYear : null;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 pt-1 md:flex-row md:items-end">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge tone="titulados">Titulados</Badge>
            <span className="caption-meta text-ink-600">
              Resultados descriptivos del dataset seleccionado
            </span>
          </div>
          <h1 className="headline-page tracking-tight">
            Resumen general: titulados
          </h1>
          <p className="max-w-2xl text-sm text-ink-600">
            Indicadores de inserción laboral, formación e interés de posgrado.
          </p>
        </div>
        <label className="label-default grid gap-1 text-ink-600">
          Dataset
          <Select
            value={datasetId}
            onValueChange={(value) => {
              setDatasetId(value || undefined);
              if (value)
                localStorage.setItem("simulacionem.activeDatasetId", value);
            }}
          >
            <SelectTrigger
              className="min-w-56"
              aria-label="Dataset de titulados"
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
      {summary && (
        <FilterToolbar count={`${summary.validResponses} respuestas válidas`} />
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Titulados encuestados"
              value={String(summary.validResponses)}
              detail={`${summary.validResponses} de ${summary.totalResponses}`}
              note={`n = ${summary.validResponses}`}
              icon={Users}
              tone="titulados"
            />
            <KpiCard
              label="Con trabajo"
              value={formatCount(workValue(trabajo), laboral?.validCount ?? 0)}
              detail={formatPercent(
                workValue(trabajo),
                laboral?.validCount ?? 0,
              )}
              note={`n = ${laboral?.validCount ?? 0}`}
              icon={BriefcaseBusiness}
              tone="titulados"
            />
            <KpiCard
              label="Mediana desde titulación"
              value={yearsSince === null ? "—" : `${yearsSince} años`}
              detail={
                medianYear === undefined
                  ? "No disponible"
                  : `Año mediano: ${medianYear}`
              }
              note={`n = ${medianYear === undefined ? 0 : summary.validResponses}`}
              icon={GraduationCap}
              tone="titulados"
            />
            <KpiCard
              label="Interesados en posgrado"
              value={formatCount(workValue(interes), posgrado?.validCount ?? 0)}
              detail={formatPercent(
                workValue(interes),
                posgrado?.validCount ?? 0,
              )}
              note={`n = ${posgrado?.validCount ?? 0}`}
              icon={GraduationCap}
              tone="titulados"
            />
          </div>
          <div className="grid items-start gap-6 lg:grid-cols-12">
            <EmploymentCard distribution={laboral} />
            <PostgraduateCard distribution={posgrado} />
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
                {chartData.map((entry, index) => (
                  <Cell key={entry.label} fill={colorForEmployment(index)} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
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
                    ({distribution?.percentages[label] ?? 0}%)
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

function PostgraduateCard({
  distribution,
}: {
  distribution?: CategoryDistribution;
}) {
  const entries = useMemo(
    () => Object.entries(distribution?.counts ?? {}),
    [distribution],
  );
  return (
    <Card className="h-fit rounded-xl border-0 shadow-sm lg:col-span-7">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="title-card">
              Interés en estudios de posgrado
            </CardTitle>
            <CardDescription>
              Personas interesadas en continuar su formación{" "}
              <span className="whitespace-nowrap">
                · n = {distribution?.validCount ?? 0}
              </span>
            </CardDescription>
          </div>
          <Badge tone="neutral">Respuesta Sí/No</Badge>
        </div>
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
                      {booleanLabel(label)}
                    </span>
                    <span className="tabular-nums whitespace-nowrap font-medium">
                      {count} de {distribution?.validCount ?? 0}{" "}
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
                        backgroundColor: index === 0 ? "#1f6fb5" : "#94a3b8",
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

function colorForEmployment(index: number) {
  return ["#1f6fb5", "#14a39a", "#94a3b8", "#f2a33a"][index % 4];
}
function booleanLabel(value: string) {
  if (value.toLowerCase() === "true") return "Sí";
  if (value.toLowerCase() === "false") return "No";
  return value;
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
function formatPercent(value: number | null, total: number) {
  return value === null
    ? "No disponible"
    : `${total ? ((value / total) * 100).toFixed(2) : 0}%`;
}
