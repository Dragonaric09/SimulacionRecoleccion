import { useEffect, useState } from "react";
import { apiRequest } from "@/api/client";
import type { AnalyticsSummary } from "../api";
import type { Competence, Domain } from "../shared/analyticsTypes";

export function useCompetenceData(domain: Domain, datasetId?: string, filterQuery = "") {
  const [items, setItems] = useState<Competence[]>([]);
  const [satisfaction, setSatisfaction] = useState<AnalyticsSummary | null>(null);
  const [curriculum, setCurriculum] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!datasetId) {
      setItems([]);
      setSatisfaction(null);
      setCurriculum(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const satisfactionRequest = domain === "TITULADOS"
      ? apiRequest<AnalyticsSummary>(`/analytics/titulados/satisfaction?datasetId=${encodeURIComponent(datasetId)}${filterQuery}`)
      : Promise.resolve(null);
    const curriculumRequest = domain === "TITULADOS"
      ? apiRequest<AnalyticsSummary>(`/analytics/titulados/curriculum?datasetId=${encodeURIComponent(datasetId)}${filterQuery}`)
      : Promise.resolve(null);
    Promise.all([
      apiRequest<Competence[]>(`/analytics/competencies/gaps?datasetId=${encodeURIComponent(datasetId)}${domain === "TITULADOS" ? filterQuery : ""}`),
      satisfactionRequest,
      curriculumRequest,
    ])
      .then(([nextItems, nextSatisfaction, nextCurriculum]) => {
        setItems(nextItems);
        setSatisfaction(nextSatisfaction);
        setCurriculum(nextCurriculum);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => setLoading(false));
  }, [datasetId, domain, filterQuery]);

  return { items, satisfaction, curriculum, loading, error };
}
