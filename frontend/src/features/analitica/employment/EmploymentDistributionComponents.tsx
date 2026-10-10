import { Inbox } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import type { CategoryDistribution } from "../api";
import { formatDecimal, formatPercentValue } from "../shared/analyticsFormatters";
import { normalizeAnalyticsLabel } from "../shared/analyticsLabels";

export function MetricPanel({ title, average, median, deviation }: { title: string; average?: number; median?: number; deviation: number | null | undefined }) {
  return (
    <div className="rounded-lg border border-border-line bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold text-titulados">{title}</span><span className="text-xs text-ink-600">DE: ± {deviation == null ? "—" : `${formatDecimal(deviation, 1)} años`}</span></div>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-600">Media: <strong className="text-base tabular-nums text-ink-900">{average == null ? "—" : formatDecimal(average, 1)}</strong> años <span>Mediana: <strong className="text-base tabular-nums text-ink-900">{median == null ? "—" : formatDecimal(median, 1)}</strong> años</span></div>
    </div>
  );
}

export function DistributionBars({ distribution, order }: { distribution?: CategoryDistribution; order?: string[] }) {
  const counts = distribution?.counts ?? {};
  const orderedEntries = order ? order.map((label) => {
    const source = Object.keys(counts).find((candidate) => normalizeAnalyticsLabel(candidate) === normalizeAnalyticsLabel(label));
    return [source ?? label, source ? counts[source] : 0] as [string, number];
  }) : Object.entries(counts);
  const assigned = orderedEntries.reduce((sum, [, count]) => sum + count, 0);
  const unclassified = Math.max(0, (distribution?.validCount ?? assigned) - assigned);
  const entries = unclassified ? [...orderedEntries, ["Sin clasificar", unclassified] as [string, number]] : orderedEntries;
  return entries.length ? <div className="space-y-3">{entries.map(([label, count]) => { const percentage = distribution?.percentages[label] ?? 0; return <div key={label} className="space-y-1"><div className="flex justify-between gap-3 text-sm"><span>{label}</span><span className="tabular-nums whitespace-nowrap">{count} de {distribution?.validCount} ({formatPercentValue(percentage)})</span></div><div className="h-2 overflow-hidden rounded-full bg-surface-container-high"><div className="h-full rounded-full bg-titulados" style={{ width: `${percentage}%` }} /></div></div>; })}</div> : <Empty className="py-8"><EmptyHeader><EmptyMedia variant="icon"><Inbox /></EmptyMedia><EmptyTitle>Sin respuestas disponibles</EmptyTitle><EmptyDescription>No hay respuestas válidas para mostrar esta distribución.</EmptyDescription></EmptyHeader></Empty>;
}
