import { useDatasetContext } from "@/app/DatasetContext";
import type { DatasetSummary } from "@/features/encuesta/api";
import { FilterToolbar } from "@/components/analytics/FilterToolbar";
import { KpiCard } from "@/components/analytics/KpiCard";
import { StatusPanel } from "@/components/analytics/StatusPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalyticsSummary, CategoryDistribution } from "../api";
import { apiRequest } from "@/api/client";
import type { Domain, Tone } from "./analyticsTypes";
import { useEffect, useState } from "react";

/* Este módulo agrupa primitives y su hook para mantener una única implementación compartida. */
/* eslint-disable react-refresh/only-export-components */

export function useDatasets(domain: Domain) {
  const { datasets: datasetGroups, activeIds, setActiveDataset } = useDatasetContext();
  return {
    datasets: datasetGroups[domain],
    datasetId: activeIds[domain],
    setDatasetId: (id?: string) => setActiveDataset(domain, id),
    loading: false,
  };
}

export function PageHeading({ title, description, tone: _tone }: { title: string; description: string; tone: Tone }) {
  void _tone;
  return (
    <div className="space-y-2">
      <h1 className="headline-page">{title}</h1>
      <p className="max-w-2xl text-sm text-ink-600">{description}</p>
    </div>
  );
}

export function DatasetSelect({ datasets: _datasets, value: _value, onChange: _onChange, loading: _loading }: {
  datasets: DatasetSummary[];
  value?: string;
  onChange: (id?: string) => void;
  loading: boolean;
}) {
  void _datasets;
  void _value;
  void _onChange;
  void _loading;
  return null;
}

export function DistributionCard({ title, distribution, tone }: { title: string; distribution: CategoryDistribution; tone: Tone }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="title-card">{title}</CardTitle>
        <CardDescription>Conteo y porcentaje · n = {distribution.validCount}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.entries(distribution.counts).map(([key, count]) => (
          <div key={key} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span>{key}</span>
              <span className="tabular-nums">{count} · {formatPercent(distribution.percentages[key] ?? 0)}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div className={`h-full rounded-full ${tone === "titulados" ? "bg-titulados" : "bg-empleadores"}`} style={{ width: `${distribution.percentages[key]}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(".", ",")} %`;
}

export function DatasetAnalyticsPage({ title, description, domain, endpoint, fields, cards }: {
  title: string;
  description: string;
  domain: Domain;
  endpoint: string;
  fields?: string;
  cards: { key: string; label: string }[];
}) {
  const tone: Tone = domain === "TITULADOS" ? "titulados" : "empleadores";
  const { datasets, datasetId, setDatasetId, loading: datasetsLoading } = useDatasets(domain);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
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
    apiRequest<AnalyticsSummary>(`${endpoint}?datasetId=${encodeURIComponent(datasetId)}${suffix}${domain === "TITULADOS" ? filterQuery : ""}`)
      .then(setSummary)
      .catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setLoading(false));
  }, [datasetId, endpoint, fields, domain, filterQuery]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeading title={title} description={description} tone={tone} />
      <DatasetSelect datasets={datasets} value={datasetId} onChange={setDatasetId} loading={datasetsLoading} />
      {loading && <StatusPanel kind="loading" title="Cargando datos" description="Consultando el dataset seleccionado." />}
      {error && <StatusPanel kind="warning" title="No se pudo cargar la pantalla" description={error} />}
      {!loading && !error && !summary && <StatusPanel kind="info" title={`Sin dataset de ${domain.toLowerCase()}`} description="Importa un dataset compatible para habilitar esta vista." />}
      {summary && (
        <>
          {domain === "TITULADOS" && <FilterToolbar summary={summary} onQueryChange={setFilterQuery} />}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => <KpiCard key={card.key} label={card.label} value={formatMetric(summary, card.key)} detail={summary.distributions[card.key] ? `${summary.distributions[card.key].validCount} respuestas` : "Dato numérico"} note={`n = ${summary.distributions[card.key]?.validCount ?? summary.validResponses}`} tone={tone} />)}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {Object.entries(summary.distributions).map(([key, distribution]) => <DistributionCard key={key} title={key} distribution={distribution} tone={tone} />)}
          </div>
        </>
      )}
    </div>
  );
}

export function formatMetric(summary: AnalyticsSummary, key: string) {
  const distribution = summary.distributions[key];
  if (distribution) return `${distribution.validCount}`;
  return summary.numericAverages[key] === undefined ? "—" : String(summary.numericAverages[key]);
}

export function labelFor(key: string) {
  return key.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
