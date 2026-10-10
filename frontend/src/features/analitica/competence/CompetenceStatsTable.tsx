import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Competence } from "../shared/analyticsTypes";

export function CompetenceStatsTable({ items, group }: { items: Competence[]; group: string }) {
  const globalAverage = items.length ? items.reduce((sum, item) => sum + item.average, 0) / items.length : 0;
  return (
    <Card className="print-card rounded-xl border-0 shadow-sm">
      <CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="title-card">Estadísticos por competencia {groupLabel(group).toLowerCase()}</CardTitle><CardDescription>Ordenados descendentemente por media · {group} · n = {items[0]?.validCount ?? 0}</CardDescription></div><Button variant="ghost" size="sm">Σ Ver fórmulas estadísticas</Button></div></CardHeader>
      <CardContent><div className="overflow-x-auto"><Table className="min-w-[760px] text-sm"><TableHeader><TableRow className="bg-surface-container-low text-xs text-ink-600"><TableHead className="rounded-l-lg p-3 text-left">Competencia / Disciplina</TableHead><TableHead className="p-3 text-right">n<br />válido</TableHead><TableHead className="p-3 text-right">Media</TableHead><TableHead className="p-3 text-right">Desv. estándar</TableHead><TableHead className="p-3 text-right">Mediana<br />(Me)</TableHead></TableRow></TableHeader><TableBody>{items.map((item) => <TableRow key={item.code} className="border-b border-surface-container-high"><TableCell className="p-3 font-medium text-ink-900">{item.name}</TableCell><TableCell className="tabular-nums p-3 text-right">{item.validCount}</TableCell><TableCell className={`tabular-nums p-3 text-right font-semibold ${item.average < 2.5 ? "text-red-600" : "text-titulados"}`}>{formatDecimal(item.average)}</TableCell><TableCell className="tabular-nums p-3 text-right">{item.standardDeviation == null || item.validCount < 2 ? "n/d" : formatDecimal(item.standardDeviation)}</TableCell><TableCell className="tabular-nums p-3 text-right">{formatDecimal(item.median)}</TableCell></TableRow>)}</TableBody></Table></div><div className="mt-4 flex flex-col justify-between gap-3 rounded-lg bg-surface-container-low p-3 text-xs text-ink-600 sm:flex-row"><strong className="whitespace-nowrap text-ink-900">Media global {group}: {formatDecimal(globalAverage)}</strong></div></CardContent>
    </Card>
  );
}

function groupLabel(group: string) {
  return group === "HARD_SKILL" ? "Hard skills" : group === "SOFT_SKILL" ? "Soft skills" : group.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDecimal(value: number) {
  return value.toFixed(2).replace(".", ",");
}
