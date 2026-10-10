import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyTitle } from "@/components/ui/empty";
import type { CategoryDistribution } from "../api";

export function SummaryCardShell({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card className="print-card h-full rounded-xl border border-border-line shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="title-card">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function FormationActiveCard({ yes, total, title = "Formación complementaria activa" }: { yes: number; total: number; title?: string }) {
  const no = Math.max(total - yes, 0);
  return (
    <SummaryCardShell title={title} description={`${formatPercentage(yes, total)} de la muestra total · n = ${total}`}>
      <div className="space-y-3">
        <p className="display-kpi tabular-nums text-ink-900">{yes} de {total}</p>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-container-high" aria-label={`${yes} respuestas Sí y ${no} respuestas No`}>
          {yes > 0 && <div className="bg-titulados" style={{ width: `${total ? yes * 100 / total : 0}%` }} />}
          {no > 0 && <div className="bg-slate-300" style={{ width: `${total ? no * 100 / total : 0}%` }} />}
        </div>
        <div className="flex justify-between text-xs text-ink-600"><span>Sí: {yes}</span><span>No: {no}</span></div>
        <p className="border-t border-surface-container-high pt-2 text-xs text-ink-600">Base total evaluada: n = {total}</p>
      </div>
    </SummaryCardShell>
  );
}

function orderedDistributionEntries(distribution: CategoryDistribution | undefined, levels?: string[]) {
  const counts = distribution?.counts ?? {};
  if (!levels) return Object.entries(counts).sort(([, left], [, right]) => right - left);
  const ordered: [string, number][] = levels.map((level) => {
    const key = Object.keys(counts).find((candidate) => normalizeEducationLabel(candidate) === normalizeEducationLabel(level));
    return [key ?? level, key ? counts[key] : 0] as [string, number];
  });
  const recognized = new Set(ordered.map(([label]) => normalizeEducationLabel(label)));
  const unclassified = Object.entries(counts)
    .filter(([label]) => !recognized.has(normalizeEducationLabel(label)))
    .reduce((sum, [, count]) => sum + count, 0);
  return unclassified ? [...ordered, ["Sin clasificar", unclassified] as [string, number]] : ordered;
}

function normalizeEducationLabel(value: string) {
  return value.toLocaleLowerCase("es-BO").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

export function OrdinalColumnsCard({ title, description, distribution, levels }: { title: string; description: string; distribution?: CategoryDistribution; levels: string[] }) {
  const entries = orderedDistributionEntries(distribution, levels);
  const max = Math.max(1, ...entries.map(([, count]) => count));
  return (
    <SummaryCardShell title={title} description={description}>
      <div className="flex min-h-36 items-end justify-between gap-2 border-b border-border-line px-1 pb-1">
        {entries.map(([label, count]) => <div key={label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1"><span className="text-xs font-semibold tabular-nums text-ink-800">{count}</span><div className="w-full max-w-12 rounded-t bg-titulados" style={{ height: `${Math.max(count ? 10 : 2, count * 78 / max)}px` }} title={`${label}: ${count}`} /><span className="w-full text-center text-[10px] leading-tight text-ink-600">{label}</span></div>)}
      </div>
      <p className="mt-2 text-xs text-ink-600">Se muestran todos los niveles, incluidos los que tienen 0 respuestas.</p>
    </SummaryCardShell>
  );
}

export function NominalListCard({ title, description, distribution, forceBars = false }: { title: string; description: string; distribution?: CategoryDistribution; forceBars?: boolean }) {
  const entries = orderedDistributionEntries(distribution);
  const equal = entries.length > 1 && entries.every(([, count]) => count === entries[0][1]);
  const showBars = forceBars || !equal;
  return (
    <SummaryCardShell title={title} description={`${description} · n = ${distribution?.validCount ?? 0}`}>
      {entries.length ? <div className="space-y-2">{entries.map(([label, count]) => showBars ? <div key={label} className="space-y-1"><div className="flex justify-between gap-3 text-xs"><span className="min-w-0 break-words">{label}</span><span className="shrink-0 tabular-nums font-semibold">{count} ({formatPercentValue(distribution?.percentages[label] ?? 0)} %)</span></div><div className="h-2 overflow-hidden rounded-full bg-surface-container-high"><div className="h-full rounded-full bg-titulados" style={{ width: `${distribution?.validCount ? count * 100 / distribution.validCount : 0}%` }} /></div></div> : <div key={label} className="flex items-center justify-between gap-3 border-b border-border-line py-1.5 text-xs last:border-0"><span className="min-w-0 break-words">{label}</span><span className="rounded-full bg-surface-container-low px-2 py-0.5 font-semibold tabular-nums">{count}</span></div>)}</div> : <Empty className="py-4"><EmptyTitle>Sin respuestas disponibles</EmptyTitle></Empty>}
    </SummaryCardShell>
  );
}

export function StackedFundingCard({ title, description, distribution }: { title: string; description: string; distribution?: CategoryDistribution }) {
  const entries = orderedDistributionEntries(distribution);
  const total = distribution?.validCount ?? 0;
  const scholarship = entries.filter(([label]) => label.toLocaleLowerCase("es-BO").includes("beca")).reduce((sum, [, count]) => sum + count, 0);
  const colors = ["#1f6fb5", "#7c5ac7", "#d8891e", "#0f766e"];
  return (
    <SummaryCardShell title={title} description={`${description} · n = ${total}`}>
      {entries.length ? <><div className="flex h-8 overflow-hidden rounded-md bg-surface-container-high">{entries.map(([label, count], index) => <div key={label} className="flex min-w-0 items-center justify-center text-[11px] font-semibold text-white" style={{ width: `${total ? count * 100 / total : 0}%`, backgroundColor: colors[index % colors.length] }} title={`${label}: ${count}`}>{count * 100 / Math.max(total, 1) >= 12 ? count : ""}</div>)}</div><div className="mt-3 space-y-1.5 text-xs text-ink-700">{entries.map(([label, count], index) => <div key={label} className="flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-1.5"><i className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: colors[index % colors.length] }} />{label}</span><span className="shrink-0 tabular-nums">{count} ({formatPercentValue(distribution?.percentages[label] ?? 0)} %)</span></div>)}</div>{scholarship > 0 && <p className="mt-3 border-t border-surface-container-high pt-2 text-xs font-medium text-ink-700">Con beca: {scholarship} de {total}</p>}</> : <Empty className="py-4"><EmptyTitle>Sin respuestas disponibles</EmptyTitle></Empty>}
    </SummaryCardShell>
  );
}

export function DivergingAgreementCard({ distribution }: { distribution?: CategoryDistribution }) {
  const entries = orderedScaleEntries(distribution);
  const total = distribution?.validCount ?? 0;
  const negative = entries.slice(0, 2);
  const positive = entries.slice(2);
  const negativeTotal = negative.reduce((sum, [, count]) => sum + count, 0);
  const positiveTotal = positive.reduce((sum, [, count]) => sum + count, 0);
  const colors = ["#c83b2b", "#ed8d78", "#72a9d3", "#1f6fb5"];
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 text-xs text-ink-600"><span>Desacuerdo: {negativeTotal} ({formatPercentage(negativeTotal, total)})</span><span className="text-right">De acuerdo: {positiveTotal} ({formatPercentage(positiveTotal, total)})</span></div>
      <div className="grid grid-cols-2 gap-1" aria-label="Escala divergente de acuerdo"><div className="flex h-9 justify-end overflow-hidden rounded-l-md bg-surface-container-high">{negative.slice().reverse().map(([label, count]) => <div key={label} className="flex items-center justify-center text-[11px] font-semibold text-white" style={{ width: `${negativeTotal ? count * 100 / negativeTotal : 0}%`, backgroundColor: colors[entries.findIndex(([entryLabel]) => entryLabel === label)] }} title={`${label}: ${count}`}>{count || ""}</div>)}</div><div className="flex h-9 overflow-hidden rounded-r-md bg-surface-container-high">{positive.map(([label, count]) => <div key={label} className="flex items-center justify-center text-[11px] font-semibold text-white" style={{ width: `${positiveTotal ? count * 100 / positiveTotal : 0}%`, backgroundColor: colors[entries.findIndex(([entryLabel]) => entryLabel === label)] }} title={`${label}: ${count}`}>{count || ""}</div>)}</div></div>
      <div className="grid grid-cols-2 gap-4 text-xs text-ink-600"><div className="space-y-1">{negative.map(([label, count]) => <div key={label} className="flex justify-between gap-2"><span>{label}</span><span className="tabular-nums">{count}</span></div>)}</div><div className="space-y-1">{positive.map(([label, count]) => <div key={label} className="flex justify-between gap-2"><span>{label}</span><span className="tabular-nums">{count}</span></div>)}</div></div>
      <p className="border-t border-surface-container-high pt-2 text-xs text-ink-600">Escala de acuerdo de 4 niveles · n = {total}</p>
    </div>
  );
}

function orderedScaleEntries(distribution?: CategoryDistribution) {
  const entries = Object.entries(distribution?.counts ?? {});
  const order = ["totalmente en desacuerdo", "en desacuerdo", "de acuerdo", "totalmente de acuerdo"];
  return entries.sort(([left], [right]) => order.indexOf(normalizeEducationLabel(left)) - order.indexOf(normalizeEducationLabel(right)));
}

function formatPercentage(value: number, total: number) {
  return `${total ? ((value / total) * 100).toFixed(1).replace(".", ",") : "0,0"} %`;
}

function formatPercentValue(value: number) {
  return value.toFixed(1).replace(".", ",");
}
