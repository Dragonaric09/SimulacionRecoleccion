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

export function unemploymentReasonColor() {
  return "#1f6fb5";
}

export function majorityLabel(distribution?: CategoryDistribution) {
  const entry = Object.entries(distribution?.counts ?? {}).sort(([, a], [, b]) => b - a)[0];
  return entry?.[0] ?? "—";
}

export function booleanCount(distribution: CategoryDistribution, value: boolean) {
  const key = Object.keys(distribution.counts).find((item) => item.toLowerCase() === String(value));
  return key ? distribution.counts[key] : 0;
}

export function booleanLabel(value: string) {
  if (value.toLowerCase() === "true") return "Sí";
  if (value.toLowerCase() === "false") return "No";
  const normalized = value.trim().replace(/\s+/g, " ").toLocaleLowerCase("es-BO");
  if (!normalized) return normalized;
  const sentence = normalized.charAt(0).toLocaleUpperCase("es-BO") + normalized.slice(1);
  return sentence
    .replace(/\bia\b/gi, "IA")
    .replace(/\bdevops\b/gi, "DevOps")
    .replace(/\b(modular|presencial|virtual)\(/gi, "$1 (");
}
