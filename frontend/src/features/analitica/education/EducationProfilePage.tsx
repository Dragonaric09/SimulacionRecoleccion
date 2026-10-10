import { useEffect, useState } from "react";
import { apiRequest } from "@/api/client";
import { FilterToolbar } from "@/components/analytics/FilterToolbar";
import { StatusPanel } from "@/components/analytics/StatusPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalyticsSummary, CategoryDistribution } from "../api";
import { DatasetSelect, useDatasets } from "../shared/AnalyticsPrimitives";
import { DivergingAgreementCard, FormationActiveCard, NominalListCard, OrdinalColumnsCard, StackedFundingCard } from "./EducationCharts";

export function EducationProfilePage({ printAll = false }: { printAll?: boolean } = {}) {
  const { datasets, datasetId, setDatasetId, loading: datasetsLoading } = useDatasets("TITULADOS");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
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
    apiRequest<AnalyticsSummary>(`/analytics/titulados/education?datasetId=${encodeURIComponent(datasetId)}${filterQuery}`)
      .then(setSummary)
      .catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setLoading(false));
  }, [datasetId, filterQuery]);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <DatasetSelect datasets={datasets} value={datasetId} onChange={setDatasetId} loading={datasetsLoading} />
      {summary && !printAll && <FilterToolbar summary={summary} onQueryChange={setFilterQuery} />}
      {loading && <StatusPanel kind="loading" title="Cargando formación" description="Consultando las respuestas académicas del dataset." />}
      {error && <StatusPanel kind="warning" title="No se pudo cargar formación" description={error} />}
      {!loading && !error && !summary && <StatusPanel kind="info" title="Sin dataset de titulados" description="Importa un CSV de titulados desde Cargar datos para ver esta sección." />}
      {summary && <>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="cursado">Posgrado cursado</TabsTrigger>
            <TabsTrigger value="interes">Interés en posgrado</TabsTrigger>
            <TabsTrigger value="opinion">Opinión sobre el posgrado</TabsTrigger>
          </TabsList>
        </Tabs>
        {printAll ? <>
          <section className="print-tab-section"><h2 className="title-card mb-3">Posgrado cursado</h2><EducationCompletedPanel summary={summary} /></section>
          <section className="print-tab-section"><h2 className="title-card mb-3">Interés en posgrado</h2><EducationInterestPanel summary={summary} /></section>
          <section className="print-tab-section"><h2 className="title-card mb-3">Opinión sobre el posgrado</h2><EducationOpinionPanel summary={summary} /></section>
        </> : <>
          {activeTab === "cursado" && <EducationCompletedPanel summary={summary} />}
          {activeTab === "interes" && <EducationInterestPanel summary={summary} />}
          {activeTab === "opinion" && <EducationOpinionPanel summary={summary} />}
        </>}
      </>}
    </div>
  );
}

function EducationCompletedPanel({ summary }: { summary: AnalyticsSummary }) {
  const active = summary.distributions.tiene_formacion_complementaria;
  const level = summary.distributions.formacion_complementaria_nivel;
  const yes = active ? booleanCount(active, true) : 0;
  return <div className="grid items-stretch gap-4 lg:grid-cols-2">
    <FormationActiveCard yes={yes} total={summary.validResponses} />
    <OrdinalColumnsCard title="Nivel más alto cursado" description={`Orden natural · n = ${level?.validCount ?? 0}`} distribution={level} levels={["Diplomado", "Especialidad", "Maestría", "Doctorado", "Posdoctorado"]} />
    <NominalListCard title="Institución donde lo cursó" description="Distribución de instituciones" distribution={summary.distributions.institucion_formacion_complementaria} forceBars />
    <StackedFundingCard title="Fuente principal de financiamiento" description="Financiamiento del posgrado cursado" distribution={summary.distributions.financiamiento_posgrado_cursado} />
  </div>;
}

function EducationInterestPanel({ summary }: { summary: AnalyticsSummary }) {
  const interest = summary.distributions.interes_posgrado;
  const interested = interest ? booleanCount(interest, true) : 0;
  const level = summary.distributions.nivel_posgrado_interes;
  const area = summary.distributions.area_posgrado_interes;
  const modality = summary.distributions.modalidad_posgrado;
  const institution = summary.distributions.institucion_posgrado_interes;
  return <div className="grid items-stretch gap-4 lg:grid-cols-2">
    <FormationActiveCard yes={interested} total={summary.validResponses} title="Interés en posgrado" />
    <OrdinalColumnsCard title="Nivel de posgrado de interés" description={`Orden natural · n = ${level?.validCount ?? 0}`} distribution={level} levels={["Diplomado", "Especialidad", "Maestría", "Doctorado", "Posdoctorado"]} />
    <NominalListCard title="Áreas de interés" description="Varias respuestas posibles" distribution={area} forceBars />
    <StackedFundingCard title="Fuente de financiamiento estimada" description="Financiamiento previsto" distribution={summary.distributions.financiamiento_posgrado_estimado} />
    <NominalListCard title="Modalidad preferida" description="Preferencias de cursado" distribution={modality} />
    <NominalListCard title="Organización preferida" description="Institución donde realizaría el posgrado" distribution={institution} />
  </div>;
}

function EducationOpinionPanel({ summary }: { summary: AnalyticsSummary }) {
  const opinion = summary.distributions.valoracion_formacion_1;
  return <Card className="rounded-xl border border-border-line shadow-sm">
    <CardHeader>
      <CardTitle className="title-card">Opinión sobre el posgrado de la FCyT (n = {opinion?.validCount ?? 0})</CardTitle>
      <CardDescription>“Los programas de posgrado de la FCyT responden a las necesidades del medio profesional actual”</CardDescription>
    </CardHeader>
    <CardContent><DivergingAgreementCard distribution={opinion} /></CardContent>
  </Card>;
}

function booleanCount(distribution: CategoryDistribution, expected: boolean) {
  const target = expected ? ["true", "sí", "si"] : ["false", "no"];
  const key = Object.keys(distribution.counts).find((label) => target.includes(label.toLocaleLowerCase("es-BO")));
  return key ? distribution.counts[key] : 0;
}
