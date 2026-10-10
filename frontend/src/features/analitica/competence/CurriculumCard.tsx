import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyTitle } from "@/components/ui/empty";
import type { AnalyticsSummary } from "../api";
import { sentenceCaseLabel } from "../shared/analyticsFormatters";

export function CurriculumCard({ title, field, summary, tone }: { title: string; field: string; summary: AnalyticsSummary; tone: "blue" | "orange" | "teal" }) {
  const distribution = summary.distributions[field];
  const entries = Object.entries(distribution?.counts ?? {}).sort(([, a], [, b]) => b - a);
  const colors = { blue: "#2878bd", orange: "#ed552f", teal: "#18a39a" };
  const total = distribution?.validCount ?? 0;
  return (
    <Card className="print-card gap-3 rounded-xl border-0 py-4 shadow-sm">
      <CardHeader className="pb-0"><CardTitle className="title-card">{title}</CardTitle><CardDescription>Nota: Pregunta de opción múltiple (Varias respuestas posibles, n = {total})</CardDescription></CardHeader>
      <CardContent className="space-y-2">{entries.length ? entries.map(([label, count]) => <div key={label} className="space-y-1"><div className="flex items-end justify-between gap-3 text-xs"><span className="min-w-0 font-semibold text-ink-900">{sentenceCaseLabel(label)}</span><span className="shrink-0 tabular-nums text-ink-600">{count} de {total} ({formatPercent(distribution?.percentages[label] ?? 0)})</span></div><div className="h-2 overflow-hidden rounded-full bg-surface-container-high"><div className="h-full rounded-full" style={{ width: `${distribution?.percentages[label] ?? 0}%`, backgroundColor: colors[tone] }} /></div></div>) : <Empty className="py-6"><EmptyTitle>Sin respuestas disponibles</EmptyTitle></Empty>}</CardContent>
    </Card>
  );
}

function formatPercent(value: number) {
  return `${value.toFixed(1).replace(".", ",")} %`;
}
