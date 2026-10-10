import { useState } from "react";
import { FilterToolbar } from "@/components/analytics/FilterToolbar";
import { StatusPanel } from "@/components/analytics/StatusPanel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatasetSelect, PageHeading, useDatasets } from "../shared/AnalyticsPrimitives";
import { countMatching } from "./employmentHelpers";
import { useTituladosEmploymentAnalytics } from "./useTituladosEmploymentAnalytics";
import { EmploymentTabContent } from "../RestAnalyticPages";

export function EmploymentProfilePage({ printAll = false }: { printAll?: boolean } = {}) {
  const { datasets, datasetId, setDatasetId, loading: datasetsLoading } = useDatasets("TITULADOS");
  const [activeTab, setActiveTab] = useState("perfil");
  const [filterQuery, setFilterQuery] = useState("");
  const { summary, profile, unemploymentSummary, firstEmploymentSummary, entrepreneurshipSummary, loading, error } = useTituladosEmploymentAnalytics(datasetId, filterQuery);
  const labor = summary?.distributions.situacion_laboral_actual;
  const sectors = summary?.distributions.sector_trabajo_actual ?? summary?.distributions.sector_trabajo;
  const unemployed = labor ? countMatching(labor, ["no trabaja", "no trabajo", "búsqueda", "desemple"]) : null;
  const points = profile?.cohortPoints ?? [];
  const tabs = [
    { key: "perfil", label: "Perfil" },
    { key: "trabajo", label: "Trabajo actual" },
    { key: "desempleo", label: "Sin empleo" },
    { key: "primer-empleo", label: "Primer empleo" },
    { key: "emprendimiento", label: "Emprendimiento" },
  ];
  const contentProps = { summary: summary!, profile: { ...(profile ?? { datasetId: "", validResponses: 0, cohortPoints: [] }), cohortPoints: points }, labor, sectors, unemployed, unemploymentSummary, firstEmploymentSummary, entrepreneurshipSummary };

  return (
    <div className="employment-profile-root mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <PageHeading title="Perfil y empleabilidad" description="Situación laboral y sectores de inserción de las personas tituladas." tone="titulados" />
      </div>
      <DatasetSelect datasets={datasets} value={datasetId} onChange={setDatasetId} loading={datasetsLoading} />
      {summary && !printAll && <FilterToolbar summary={summary} onQueryChange={setFilterQuery} />}
      {loading && <StatusPanel kind="loading" title="Cargando perfil" description="Consultando la situación laboral y el sector de trabajo." />}
      {error && <StatusPanel kind="warning" title="No se pudo cargar el perfil" description={error} />}
      {!loading && !error && !summary && <StatusPanel kind="info" title="Sin dataset de titulados" description="Importa un CSV de titulados desde Cargar datos para ver este perfil." />}
      {summary && (
        <>
          {!printAll && <Tabs value={activeTab} onValueChange={setActiveTab}><TabsList variant="line" className="grid w-full grid-cols-5 border-b border-border-line bg-transparent">{tabs.map((tab) => <TabsTrigger key={tab.key} value={tab.key} className="min-w-0 px-2 text-center text-sm">{tab.label}</TabsTrigger>)}</TabsList></Tabs>}
          {printAll ? tabs.map((tab) => <section key={tab.key} className="print-tab-section"><h2 className="title-card mb-3">{tab.label}</h2><EmploymentTabContent tab={tab.key} {...contentProps} /></section>) : <EmploymentTabContent tab={activeTab} {...contentProps} />}
        </>
      )}
    </div>
  );
}
