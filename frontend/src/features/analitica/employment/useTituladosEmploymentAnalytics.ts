import { useEffect, useState } from "react";
import { apiRequest } from "@/api/client";
import type { AnalyticsSummary } from "../api";
import type { EmploymentProfile } from "../shared/analyticsTypes";

type EmploymentAnalyticsState = {
  summary: AnalyticsSummary | null;
  profile: EmploymentProfile | null;
  unemploymentSummary: AnalyticsSummary | null;
  firstEmploymentSummary: AnalyticsSummary | null;
  entrepreneurshipSummary: AnalyticsSummary | null;
  loading: boolean;
  error: string | null;
};

export function useTituladosEmploymentAnalytics(datasetId?: string, filterQuery = ""): EmploymentAnalyticsState {
  const [state, setState] = useState<EmploymentAnalyticsState>({
    summary: null,
    profile: null,
    unemploymentSummary: null,
    firstEmploymentSummary: null,
    entrepreneurshipSummary: null,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!datasetId) {
      setState((current) => ({ ...current, summary: null, profile: null, unemploymentSummary: null, firstEmploymentSummary: null, entrepreneurshipSummary: null, loading: false, error: null }));
      return;
    }
    let cancelled = false;
    setState((current) => ({ ...current, loading: true, error: null }));
    const query = `?datasetId=${encodeURIComponent(datasetId)}${filterQuery}`;
    Promise.all([
      apiRequest<AnalyticsSummary>(`/analytics/titulados/employment${query}`),
      apiRequest<EmploymentProfile>(`/analytics/titulados/employment/profile${query}`),
      apiRequest<AnalyticsSummary>(`/analytics/titulados/employment/unemployment${query}`),
      apiRequest<AnalyticsSummary>(`/analytics/titulados/employment/first-employment${query}`),
      apiRequest<AnalyticsSummary>(`/analytics/titulados/employment/entrepreneurship${query}`),
    ]).then(([summary, profile, unemploymentSummary, firstEmploymentSummary, entrepreneurshipSummary]) => {
      if (!cancelled) setState({ summary, profile, unemploymentSummary, firstEmploymentSummary, entrepreneurshipSummary, loading: false, error: null });
    }).catch((cause) => {
      if (!cancelled) setState((current) => ({ ...current, loading: false, error: cause instanceof Error ? cause.message : String(cause) }));
    });
    return () => { cancelled = true; };
  }, [datasetId, filterQuery]);

  return state;
}
