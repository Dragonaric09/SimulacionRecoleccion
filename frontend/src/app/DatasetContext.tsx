import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiRequest } from "@/api/client";
import type { DatasetSummary } from "@/features/encuesta/api";

export type DatasetDomain = "TITULADOS" | "EMPLEADORES";

type DatasetContextValue = {
  datasets: Record<DatasetDomain, DatasetSummary[]>;
  activeIds: Record<DatasetDomain, string | undefined>;
  setActiveDataset: (domain: DatasetDomain, id?: string) => void;
  refreshDatasets: () => void;
};

const DatasetContext = createContext<DatasetContextValue | null>(null);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [allDatasets, setAllDatasets] = useState<DatasetSummary[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeIds, setActiveIds] = useState<Record<DatasetDomain, string | undefined>>(() => ({
    TITULADOS:
      localStorage.getItem("simulacionem.activeDatasetId.TITULADOS") ??
      localStorage.getItem("simulacionem.activeDatasetId") ??
      undefined,
    EMPLEADORES: localStorage.getItem("simulacionem.activeDatasetId.EMPLEADORES") ?? undefined,
  }));

  useEffect(() => {
    apiRequest<DatasetSummary[]>("/datasets").then(setAllDatasets).catch(() => setAllDatasets([]));
  }, [refreshKey]);

  useEffect(() => {
    if (!allDatasets.length) return;
    setActiveIds((current) => {
      const next = { ...current };
      (['TITULADOS', 'EMPLEADORES'] as DatasetDomain[]).forEach((domain) => {
        const available = allDatasets.filter((dataset) => dataset.surveyType === domain);
        if (!available.some((dataset) => dataset.id === next[domain])) {
          next[domain] = available.at(-1)?.id;
        }
      });
      return next;
    });
  }, [allDatasets]);

  const datasets = useMemo(() => ({
    TITULADOS: allDatasets.filter((dataset) => dataset.surveyType === "TITULADOS"),
    EMPLEADORES: allDatasets.filter((dataset) => dataset.surveyType === "EMPLEADORES"),
  }), [allDatasets]);

  const setActiveDataset = (domain: DatasetDomain, id?: string) => {
    setActiveIds((current) => ({ ...current, [domain]: id }));
    if (id) {
      localStorage.setItem(`simulacionem.activeDatasetId.${domain}`, id);
      localStorage.setItem("simulacionem.activeDatasetId", id);
    } else {
      localStorage.removeItem(`simulacionem.activeDatasetId.${domain}`);
      if (localStorage.getItem("simulacionem.activeDatasetId") === activeIds[domain])
        localStorage.removeItem("simulacionem.activeDatasetId");
    }
    Object.keys(localStorage)
      .filter((key) => key.startsWith("simulacionem.tituladosFilters.") || key.startsWith("simulacionem.empleadoresFilters."))
      .forEach((key) => localStorage.removeItem(key));
    window.dispatchEvent(new CustomEvent("simulacionem:dataset-changed", { detail: { domain, id } }));
  };

  return (
    <DatasetContext.Provider value={{ datasets, activeIds, setActiveDataset, refreshDatasets: () => setRefreshKey((key) => key + 1) }}>
      {children}
    </DatasetContext.Provider>
  );
}

export function useDatasetContext() {
  const context = useContext(DatasetContext);
  if (!context) throw new Error("useDatasetContext debe usarse dentro de DatasetProvider");
  return context;
}
