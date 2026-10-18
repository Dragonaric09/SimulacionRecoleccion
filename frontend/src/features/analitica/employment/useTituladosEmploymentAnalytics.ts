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
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));
    const query = `?datasetId=${encodeURIComponent(datasetId)}${filterQuery}`;
    let settled = 0;
    const finish = () => {
      settled += 1;
      if (settled === 5 && !cancelled) setState((current) => ({ ...current, loading: false }));
    };
    const run = <T,>(request: Promise<T>, apply: (data: T) => Partial<EmploymentAnalyticsState>) => {
      request.then((data) => {
        if (!cancelled) setState((current) => ({ ...current, ...apply(data) }));
      }).catch((cause) => {
        if (!controller.signal.aborted && !cancelled) {
          setState((current) => ({ ...current, error: cause instanceof Error ? cause.message : String(cause) }));
        }
      }).finally(finish);
    };
    run(apiRequest<AnalyticsSummary>(`/analytics/titulados/employment${query}`, { signal: controller.signal }), (summary) => ({ summary }));
    run(apiRequest<EmploymentProfile>(`/analytics/titulados/employment/profile${query}`, { signal: controller.signal }), (profile) => ({ profile }));
    run(apiRequest<AnalyticsSummary>(`/analytics/titulados/employment/unemployment${query}`, { signal: controller.signal }), (unemploymentSummary) => ({ unemploymentSummary }));
    run(apiRequest<AnalyticsSummary>(`/analytics/titulados/employment/first-employment${query}`, { signal: controller.signal }), (firstEmploymentSummary) => ({ firstEmploymentSummary }));
    run(apiRequest<AnalyticsSummary>(`/analytics/titulados/employment/entrepreneurship${query}`, { signal: controller.signal }), (entrepreneurshipSummary) => ({ entrepreneurshipSummary }));
    return () => { cancelled = true; controller.abort(); };
  }, [datasetId, filterQuery]);

  return state;
}
