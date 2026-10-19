import { useEffect, useState } from "react";
import { apiRequest } from "@/api/client";
import type { AnalyticsSummary } from "../api";
import type { EmploymentDashboard, EmploymentProfile } from "../shared/analyticsTypes";

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
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));
    const query = `?datasetId=${encodeURIComponent(datasetId)}${filterQuery}`;
    apiRequest<EmploymentDashboard>(`/analytics/titulados/employment/dashboard${query}`, { signal: controller.signal })
      .then((dashboard) => {
        if (!cancelled) {
          setState((current) => ({
            ...current,
            summary: dashboard.summary,
            profile: dashboard.profile,
            unemploymentSummary: dashboard.unemploymentSummary,
            firstEmploymentSummary: dashboard.firstEmploymentSummary,
            entrepreneurshipSummary: dashboard.entrepreneurshipSummary,
          }));
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted && !cancelled) {
          setState((current) => ({ ...current, error: cause instanceof Error ? cause.message : String(cause) }));
        }
      })
      .finally(() => {
        if (!cancelled) setState((current) => ({ ...current, loading: false }));
      });
    return () => { cancelled = true; controller.abort(); };
  }, [datasetId, filterQuery]);

  return state;
}
