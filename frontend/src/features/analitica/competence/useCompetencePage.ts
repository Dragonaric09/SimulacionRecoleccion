import { useEffect, useMemo, useState } from "react";
import type { Domain, Tone } from "../shared/analyticsTypes";
import { useDatasets } from "../shared/AnalyticsPrimitives";
import { useCompetenceData } from "./useCompetenceData";

export function useCompetencePage(domain: Domain) {
  const tone: Tone = domain === "TITULADOS" ? "titulados" : "empleadores";
  const { datasets, datasetId, setDatasetId, loading: datasetsLoading } = useDatasets(domain);
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

  const groups = useMemo(() => [...new Set(items.map((item) => item.group))], [items]);
  const tabGroup = (tab: string) =>
    tab === "hard"
      ? groups.find((group) => group.toLowerCase().includes("hard"))
      : tab === "soft"
        ? groups.find((group) => group.toLowerCase().includes("soft"))
        : undefined;
  const visibleItems = useMemo(
    () => items.filter((item) => item.group === activeGroup).sort((a, b) => b.average - a.average),
    [items, activeGroup],
  );
  const average = visibleItems.length
    ? visibleItems.reduce((sum, item) => sum + item.average, 0) / visibleItems.length
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

  return {
    tone,
    datasets,
    datasetId,
    setDatasetId,
    datasetsLoading,
    filterQuery,
    setFilterQuery,
    activeGroup,
    setActiveGroup,
    activeTab,
    setActiveTab,
    items,
    satisfaction,
    curriculum,
    loading,
    error,
    groups,
    tabGroup,
    visibleItems,
    average,
    lowest,
    highest,
    tabs,
  };
}
