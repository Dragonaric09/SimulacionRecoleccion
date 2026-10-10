import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Competence } from "../shared/analyticsTypes";
import { contrastTextColor } from "@/lib/utils";
import { formatDecimal } from "../shared/analyticsFormatters";

export function CompetenceMatrix({ items, className = "" }: { items: Competence[]; className?: string }) {
  const columnMaxima = [1, 2, 3, 4, 5].reduce<Record<number, number>>((maxima, level) => {
    maxima[level] = Math.max(1, ...items.map((item) => item.levelCounts[String(level)] ?? 0));
    return maxima;
  }, {});
  const group = groupLabel(items[0]?.group ?? "");
  return (
    <Card className={`print-card rounded-xl border-0 shadow-sm ${className}`}>
      <CardHeader>
        <CardTitle className="title-card">Mapa de calor: Nivel de preparación {group.toLowerCase()} percibida</CardTitle>
        <CardDescription>Distribución de frecuencias por nivel de la escala Likert · n = {items[0]?.validCount ?? 0}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table className="min-w-[820px] text-sm">
            <TableHeader><TableRow className="text-xs uppercase tracking-wider text-ink-600"><TableHead className="w-56 p-2 text-left">Competencia {group.toLowerCase()}</TableHead>{[1, 2, 3, 4, 5].map((level) => <TableHead key={level} className={`rounded p-2 text-center ${level <= 2 ? "bg-red-50 text-red-700" : level === 3 ? "bg-slate-100 text-ink-600" : "bg-blue-50 text-titulados"}`}>{level}<br /><span className="font-normal normal-case">{["Muy insuf.", "Insuf.", "Aceptable", "Suficiente", "Muy suf."][level - 1]}</span></TableHead>)}<TableHead className="p-2 text-right">Total</TableHead><TableHead className="p-2 text-right">Media</TableHead><TableHead className="p-2 text-right">DE</TableHead></TableRow></TableHeader>
            <TableBody>{items.map((item) => <TableRow key={item.code} className="border-t border-slate-100"><TableCell className="max-w-56 whitespace-normal break-words p-2 font-medium leading-tight text-ink-900" title={item.name}>{matrixCompetenceName(item.name)}</TableCell>{[1, 2, 3, 4, 5].map((level) => { const count = item.levelCounts[String(level)] ?? 0; const background = matrixBackground(level, count, columnMaxima[level]); return <TableCell key={level} className="p-2 text-center font-semibold" style={{ backgroundColor: background, color: contrastTextColor(background) }}>{count}</TableCell>; })}<TableCell className="tabular-nums p-2 text-right font-semibold">{item.validCount}</TableCell><TableCell className="tabular-nums p-2 text-right font-semibold">{formatDecimal(item.average)}</TableCell><TableCell className="tabular-nums p-2 text-right">{item.standardDeviation == null || item.validCount < 2 ? "n/d" : formatDecimal(item.standardDeviation)}</TableCell></TableRow>)}</TableBody>
          </Table>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-surface-container-high pt-3 text-xs text-ink-600"><span className="font-semibold">Escala:</span><span><i className="mr-1 inline-block size-3 rounded bg-red-200" />1 Muy insuficiente</span><span><i className="mr-1 inline-block size-3 rounded bg-slate-200" />3 Aceptable</span><span><i className="mr-1 inline-block size-3 rounded bg-blue-200" />5 Muy suficiente</span></div>
      </CardContent>
    </Card>
  );
}

function groupLabel(group: string) {
  return group.toLowerCase().includes("hard") ? "técnica" : group.toLowerCase().includes("soft") ? "blanda" : group;
}

function matrixCompetenceName(name: string) {
  return name.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

function matrixBackground(level: number, count: number, columnMaximum: number) {
  const intensity = count / Math.max(columnMaximum, 1);
  if (level <= 2) return `rgba(214, 69, 69, ${0.08 + intensity * 0.62})`;
  if (level === 3) return `rgba(148, 163, 184, ${0.08 + intensity * 0.62})`;
  return `rgba(31, 111, 181, ${0.08 + intensity * 0.62})`;
}
