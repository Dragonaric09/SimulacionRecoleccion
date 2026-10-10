import type { CategoryDistribution } from "../api";
import { displayLaborLabel as sharedDisplayLaborLabel, normalizeAnalyticsLabel } from "../shared/analyticsLabels";
import { formatPercentage } from "../shared/analyticsFormatters";

export const laborColors = {
  organization: "#1f6fb5",
  entrepreneurship: "#14a39a",
  unemployed: "#f2a33a",
} as const;

export function countMatching(distribution: CategoryDistribution, fragments: string[], excluded: string[] = []) {
  return Object.entries(distribution.counts)
    .filter(([label]) => fragments.some((fragment) => normalizeAnalyticsLabel(label).includes(normalizeAnalyticsLabel(fragment))) && !excluded.some((fragment) => normalizeAnalyticsLabel(label).includes(normalizeAnalyticsLabel(fragment))))
    .reduce((total, [, count]) => total + count, 0);
}

export function laborColor(label: string) {
  const normalized = normalizeAnalyticsLabel(label);
  if (normalized.includes("emprend")) return laborColors.entrepreneurship;
  if (normalized.includes("busqueda") || normalized.includes("desemple") || normalized.includes("no trabaja") || normalized.includes("sin empleo")) return laborColors.unemployed;
  return laborColors.organization;
}

export const displayLaborLabel = sharedDisplayLaborLabel;
export { formatPercentage };
