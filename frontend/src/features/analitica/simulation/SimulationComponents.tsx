import { useState, type ReactNode } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Badge } from "@/components/analytics/Badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CategoryDistribution } from "../api";
import type { Simulation } from "../shared/analyticsTypes";
import { simulationCategories, simulationCategoryLabel, simulationDelta, simulationPercent, simulationVariableLabel } from "./simulationUtils";
import { SimulationECharts } from "./SimulationECharts";


export function SimulationWeights({
  variable,
  distribution,
  weights,
  setWeights,
}: {
  variable: string;
  distribution?: CategoryDistribution;
  weights: Record<string, number>;
  setWeights: Dispatch<SetStateAction<Record<string, number>>>;
}) {
  if (!distribution) return null;
  const entries = simulationCategories(variable, distribution.counts).map((label) => [label, distribution.counts[label] ?? 0] as const);
  const currentTotal = entries.reduce((sum, [label, count]) => sum + (weights[label] ?? count), 0);
  const observedTotal = distribution.validCount;
  const updatePreservingTotal = (label: string, nextValue: number) => setWeights((current) => {
    const values = Object.fromEntries(entries.map(([key, count]) => [key, current[key] ?? count]));
    const previous = values[label] ?? 0;
    const delta = nextValue - previous;
    values[label] = nextValue;
    const others = entries.filter(([key]) => key !== label);
    const available = others.reduce((sum, [key]) => sum + Math.max(0, values[key] ?? 0), 0);
    if (available > 0) others.forEach(([key]) => { values[key] = Math.max(0, (values[key] ?? 0) - delta * ((values[key] ?? 0) / available)); });
    return values;
  });
  return (
    <details className="rounded-lg bg-surface-container-low p-3">
      <summary className="cursor-pointer list-none text-sm font-semibold text-ink-700">Ajustar probabilidades <span className="text-xs font-normal">(opcional)</span></summary>
      <div className="mt-3 space-y-3">
        <div className="flex justify-end"><Button variant="link" size="xs" onClick={() => setWeights({})}>Restablecer</Button></div>
      {entries.map(([label, count]) => {
        const value = weights[label] ?? count;
        return (
          <label key={label} className="grid gap-1 text-xs">
            <span className="flex justify-between gap-2"><span className="truncate">{simulationCategoryLabel(label)}</span><strong>{observedTotal ? simulationPercent((count * 100) / observedTotal) : "—"} → {currentTotal ? simulationPercent((value * 100) / currentTotal) : "—"}</strong></span>
            <Slider min={0} max={Math.max(10, currentTotal)} step={1} value={[value]} onValueChange={(next) => updatePreservingTotal(label, next[0] ?? value)} />
          </label>
        );
      })}
      </div>
    </details>
  );
}

export function SimulationDistribution({ result, observedTotal, loading = false, variable }: { result: Simulation; observedTotal: number; loading?: boolean; variable?: string }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  return (
    <Card className="rounded-xl border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="title-card">Observado contra escenario</CardTitle>
            <CardDescription>Distribución de {simulationVariableLabel(variable ?? "")} con media simulada y rango del 95 % de las réplicas.</CardDescription>
          </div>
          <HoverCard openDelay={150} closeDelay={100}>
            <HoverCardTrigger asChild>
              <span className="cursor-help">
                <Badge tone="neutral">Base observada: {observedTotal} · Simulado: {result.sampleSize} personas × {result.repetitions.toLocaleString("es-BO")} réplicas</Badge>
              </span>
            </HoverCardTrigger>
            <HoverCardContent side="bottom" align="end">
              <p className="font-semibold text-ink-900">Cómo leer esta simulación</p>
              <p className="mt-1 text-xs leading-relaxed text-ink-600">
                La base observada es de {observedTotal} respuestas. Se simulan {result.sampleSize} personas en {result.repetitions.toLocaleString("es-BO")} réplicas con la semilla {result.seed}.
              </p>
              <p className="mt-2 text-xs leading-relaxed text-ink-600">
                El rango del 95 % describe la variación de los sorteos simulados; no es un intervalo de confianza sobre la población.
              </p>
            </HoverCardContent>
          </HoverCard>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <SimulationECharts result={result} variable={variable} selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
        <div className="border-t border-border-line pt-3 text-xs text-ink-600">{result.repetitions.toLocaleString("es-BO")} réplicas · semilla {result.seed}. Haz clic en una categoría para abrir el histograma de sus réplicas.</div>

        {false && <>
        <div className="flex justify-between pl-1 text-[11px] tabular-nums text-ink-500"><span>0 %</span><span>25 %</span><span>50 %</span><span>75 %</span><span>100 %</span></div>
        {result.categories.map((category) => (
          <HoverCard key={category.category} openDelay={120} closeDelay={100}><HoverCardTrigger asChild><div className="space-y-1 cursor-help">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium">{simulationCategoryLabel(category.category)}</span>
              <span className="whitespace-nowrap tabular-nums text-primary">{simulationPercent(category.simulatedMean)}</span>
            </div>
              <div className="relative h-5 rounded bg-surface-container-low transition-opacity duration-200" style={{ opacity: loading ? 0.55 : 1 }}>
                <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-ink-300" style={{ width: `${category.observedPercentage}%` }} />
                <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-primary/75" style={{ width: `${category.simulatedMean}%` }} />
                <div className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-ink-900" style={{ left: `${category.lower95}%`, width: `${Math.max(0, category.upper95 - category.lower95)}%` }} />
                <span className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" style={{ left: `${category.simulatedMean}%` }} />
                <span className="absolute top-0 h-full w-px bg-amber-600" style={{ left: `${category.observedPercentage}%` }} title={`Observado: ${simulationPercent(category.observedPercentage)}`} />
            </div>
          </div></HoverCardTrigger><HoverCardContent side="top" align="end" className="w-80"><p className="font-semibold">{simulationCategoryLabel(category.category)}</p><p className="mt-1 text-xs text-ink-600">Observado: {simulationPercent(category.observedPercentage)} · Media simulada: {simulationPercent(category.simulatedMean)}</p><p className="text-xs text-ink-600">Rango: {simulationPercent(category.lower95)} – {simulationPercent(category.upper95)} · Desviación: {simulationPercent(category.standardDeviation)} · Diferencia: {simulationDelta(category.simulatedMean, category.observedPercentage)}</p><p className="mt-2 text-xs text-ink-600">Si se encuestara a {result.sampleSize} personas, 95 de cada 100 veces este porcentaje caería dentro de ese rango.</p></HoverCardContent></HoverCard>
        ))}
        <div className="flex flex-wrap gap-5 border-t border-border-line pt-3 text-xs text-ink-600">
          <span><i className="mr-1 inline-block size-2 rounded-sm bg-ink-300" />Observado</span>
          <span><i className="mr-1 inline-block size-2 rounded-sm bg-primary" />Media estimada</span>
          <span><i className="mr-1 inline-block h-0.5 w-4 bg-ink-900 align-middle" />Rango del 95 % de las repeticiones</span>
          <span><i className="mr-1 inline-block h-3 w-px bg-amber-600 align-middle" />Observado</span>
          <span className="ml-auto">{result.repetitions.toLocaleString("es-BO")} réplicas · semilla {result.seed}</span>
        </div>
        </>}
      </CardContent>
    </Card>
  );
}

export function ReplicaHistogram({ result, category }: { result: Simulation; category: string | null }) {
  const selected = result.categories.find((item) => item.category === category);
  if (!selected) return null;
  const values = selected.replicaPercentages ?? [];
  const bins = Array.from({ length: 10 }, () => 0);
  values.forEach((value) => bins[Math.min(9, Math.floor(value / 10))]++);
  const max = Math.max(...bins, 1);
  const mean = selected.simulatedMean;
  const observed = selected.observedPercentage;
  return <div className="rounded-lg border border-primary/20 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-ink-900">Histograma de réplicas · {simulationCategoryLabel(selected.category)}</p><p className="mt-1 text-[11px] text-ink-600">Cada barra representa un intervalo de porcentaje en {result.repetitions.toLocaleString("es-BO")} réplicas.</p></div><span className="rounded-md bg-white px-2 py-1 text-[11px] font-semibold tabular-nums text-primary">Media {simulationPercent(mean)}</span></div><div className="relative mt-4 h-28 border-b border-l border-border-line bg-white px-2 pt-2"><div className="absolute inset-y-0 border-l border-dashed border-amber-600" style={{ left: `${observed}%` }} title={`Observado: ${simulationPercent(observed)}`} /><div className="absolute inset-y-0 border-l-2 border-primary" style={{ left: `${mean}%` }} title={`Media simulada: ${simulationPercent(mean)}`} /><div className="relative flex h-full items-end gap-1">{bins.map((value, index) => <div key={index} className="group relative flex-1 rounded-t bg-primary/75 transition-colors hover:bg-primary" style={{ height: `${value * 100 / max}%` }} title={`${value} réplicas · ${index * 10}–${(index + 1) * 10} %`}><span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink-900 px-1.5 py-1 text-[10px] text-white group-hover:block">{value} réplicas</span></div>)}</div></div><div className="mt-2 flex justify-between text-[10px] tabular-nums text-ink-500"><span>0 %</span><span>25 %</span><span>50 %</span><span>75 %</span><span>100 %</span></div><div className="mt-2 flex flex-wrap gap-4 text-[11px] text-ink-600"><span><i className="mr-1 inline-block h-3 w-px bg-amber-600 align-middle" />Observado {simulationPercent(observed)}</span><span><i className="mr-1 inline-block h-3 w-0.5 bg-primary align-middle" />Media {simulationPercent(mean)}</span><span>Rango 95 %: {simulationPercent(selected.lower95)} – {simulationPercent(selected.upper95)}</span></div></div>;
}

function chartKind(result: Simulation, variable?: string) {
  if (["sector_trabajo", "situacion_laboral_actual"].includes(variable ?? "")) return "unordered";
  const labels = result.categories.map((item) => item.category.toLowerCase());
  if (labels.some((label) => label.includes("satisf") || label.includes("concord") || label.includes("muy de acuerdo"))) return "scale";
  if (labels.every((label) => ["true", "false", "sí", "si", "no"].includes(label))) return "boolean";
  if (result.categories.length <= 5) return "pie";
  if (labels.some((label) => label.includes("sector") || label.includes("área") || label.includes("area") || label.includes("trabaja"))) return "unordered";
  return "ordered";
}

export function SimulationTypedChartV2({ result, variable, selectedCategory, onSelect }: { result: Simulation; variable?: string; selectedCategory: string | null; onSelect: (category: string | null) => void }) {
  const kind = chartKind(result, variable);
  const values = kind === "unordered" ? [...result.categories].sort((a, b) => b.simulatedMean - a.simulatedMean) : result.categories;
  if (kind === "pie" || kind === "boolean") return <div className="grid gap-6 md:grid-cols-2">{[true, false].map((observed) => <PieFigure key={String(observed)} result={result} observed={observed} ring={kind === "boolean"} />)}</div>;
  if (kind === "scale") return <div className="space-y-2">{values.map((category) => <SimulationCategoryHover key={category.category} category={category} result={result}><div><div className="mb-1 flex justify-between text-xs"><span>{simulationCategoryLabel(category.category)}</span><span>{simulationPercent(category.simulatedMean)}</span></div><div className="flex h-5 overflow-hidden rounded"><div className="bg-slate-400" style={{ width: `${category.observedPercentage}%` }} /><div className="bg-primary" style={{ width: `${category.simulatedMean}%` }} /></div></div></SimulationCategoryHover>)}</div>;
  return <div className="space-y-2">{values.map((category) => <SimulationCategoryHover key={category.category} category={category} result={result}><button type="button" onClick={() => onSelect(selectedCategory === category.category ? null : category.category)} className="block w-full text-left"><div className="mb-1 flex justify-between text-xs"><span>{simulationCategoryLabel(category.category)}</span><span>{simulationPercent(category.simulatedMean)}</span></div><div className="relative h-7 rounded bg-white">{kind === "unordered" ? <><div className="absolute top-1/2 h-0.5 w-full -translate-y-1/2 bg-ink-900/40" /><div className="absolute top-1/2 h-4 -translate-y-1/2 rounded border border-primary bg-primary/25" style={{ left: `${category.firstQuartile ?? category.lower95}%`, width: `${Math.max(0, (category.thirdQuartile ?? category.upper95) - (category.firstQuartile ?? category.lower95))}%` }} /><span className="absolute top-1/2 h-5 w-px -translate-y-1/2 bg-ink-900" style={{ left: `${category.median ?? category.simulatedMean}%` }} /><span className="absolute top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary" style={{ left: `${category.simulatedMean}%` }} /></> : <><div className="absolute inset-y-0 left-0 bg-slate-300" style={{ width: `${category.observedPercentage}%` }} /><div className="absolute inset-y-0 left-0 bg-primary/80" style={{ width: `${category.simulatedMean}%` }} /><div className="absolute inset-y-0 w-px bg-ink-900" style={{ left: `${category.observedPercentage}%` }} /></>}</div></button></SimulationCategoryHover>)}</div>;
}

function SimulationCategoryHover({ category, result, children }: { category: Simulation["categories"][number]; result: Simulation; children: ReactNode }) {
  return <HoverCard openDelay={150} closeDelay={100}><HoverCardTrigger asChild>{children}</HoverCardTrigger><HoverCardContent side="top" align="end" className="w-80"><p className="font-semibold text-ink-900">{simulationCategoryLabel(category.category)}</p><p className="mt-1 text-xs text-ink-600">Observado: {simulationPercent(category.observedPercentage)} · Media simulada: {simulationPercent(category.simulatedMean)}</p><p className="text-xs text-ink-600">Rango: {simulationPercent(category.lower95)} – {simulationPercent(category.upper95)} · Desviación: {simulationPercent(category.standardDeviation)} · Diferencia: {simulationDelta(category.simulatedMean, category.observedPercentage)}</p><p className="mt-2 text-xs leading-relaxed text-ink-600">Si se encuestara a {result.sampleSize} personas, 95 de cada 100 veces este porcentaje caería entre {simulationPercent(category.lower95)} y {simulationPercent(category.upper95)}.</p></HoverCardContent></HoverCard>;
}

function PieFigure({ result, observed, ring }: { result: Simulation; observed: boolean; ring: boolean }) {
  return <div className="text-center"><div className={`mx-auto size-32 rounded-full ${ring ? "p-7" : ""}`} style={{ background: pieGradient(result, observed) }}><div className={`${ring ? "size-full" : "hidden"} rounded-full bg-white`} /></div><p className="mt-2 text-xs font-semibold">{observed ? "Observado" : "Escenario"}</p><div className="mx-auto mt-2 grid max-w-xs gap-1 text-left text-[11px]">{result.categories.map((category, index) => <SimulationCategoryHover key={category.category} category={category} result={result}><div className="flex items-center justify-between gap-3"><span className="flex min-w-0 items-center gap-1"><i className="size-2 shrink-0 rounded-full" style={{ backgroundColor: pieColor(index) }} /> <span className="truncate">{simulationCategoryLabel(category.category)}</span></span><span className="tabular-nums">{simulationPercent(observed ? category.observedPercentage : category.simulatedMean)}</span></div></SimulationCategoryHover>)}</div></div>;
}

export function SimulationTypedChart({ result, variable, selectedCategory, onSelect }: { result: Simulation; variable?: string; selectedCategory: string | null; onSelect: (category: string | null) => void }) {
  const kind = chartKind(result, variable);
  const selected = result.categories.find((category) => category.category === selectedCategory);
  return <div className="rounded-lg border border-border-line bg-surface-container-low p-4">
    <div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm font-semibold text-ink-900">{kind === "unordered" ? "Caja y bigotes por opción" : kind === "scale" ? "Distribución por nivel" : kind === "boolean" ? "Anillo observado y escenario" : kind === "pie" ? "Observado contra simulado" : "Categorías en orden natural"}</p><span className="text-xs text-ink-600">Haz clic en una opción para ver sus réplicas</span></div>
    {kind === "pie" || kind === "boolean" ? <div className="flex flex-wrap items-center justify-center gap-8">{["Observado", "Escenario"].map((label, index) => <div key={label} className="text-center"><div className={`mx-auto size-32 rounded-full ${kind === "boolean" ? "p-7" : ""}`} style={{ background: pieGradient(result, index === 0) }}><div className={`${kind === "boolean" ? "size-full" : "hidden"} rounded-full bg-white`} /></div><p className="mt-2 text-xs font-semibold">{label}</p></div>)}</div> : kind === "scale" ? <div className="space-y-2">{result.categories.map((category) => <div key={category.category} className="flex items-center gap-2"><span className="w-36 truncate text-xs">{simulationCategoryLabel(category.category)}</span><div className="flex h-5 flex-1 overflow-hidden rounded"><div className="bg-slate-400" style={{ width: `${category.observedPercentage}%` }} /><div className="bg-primary" style={{ width: `${category.simulatedMean}%` }} /></div><span className="w-14 text-right text-xs tabular-nums">{simulationPercent(category.simulatedMean)}</span></div>)}</div> : <div className="space-y-2">{result.categories.map((category) => <button type="button" key={category.category} onClick={() => onSelect(selectedCategory === category.category ? null : category.category)} className="block w-full text-left"><div className="mb-1 flex justify-between gap-3 text-xs"><span className="truncate">{simulationCategoryLabel(category.category)}</span><span className="tabular-nums">{simulationPercent(category.simulatedMean)}</span></div>{kind === "unordered" ? <div className="relative h-5 rounded bg-white"><div className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-ink-900" style={{ left: `${category.lower95}%`, width: `${category.upper95 - category.lower95}%` }} /><span className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-primary bg-white" style={{ left: `${category.simulatedMean}%` }} /></div> : <div className="relative h-5 rounded bg-white"><div className="absolute inset-y-0 left-0 bg-slate-300" style={{ width: `${category.observedPercentage}%` }} /><div className="absolute inset-y-0 left-0 bg-primary/80" style={{ width: `${category.simulatedMean}%` }} /></div>}</button>)}</div>}
    {selected && <div className="mt-4 border-t border-border-line pt-3"><p className="text-xs font-semibold">Histograma de réplicas · {simulationCategoryLabel(selected.category)}</p><div className="mt-2 flex h-20 items-end gap-1">{histogram(selected.replicaPercentages ?? [], selected).map((height, index) => <div key={index} className="flex-1 rounded-t bg-primary/70" style={{ height: `${height}%` }} title={`${height}% relativo`} />)}</div><div className="flex justify-between text-[10px] text-ink-500"><span>0 %</span><span>100 %</span></div></div>}
  </div>;
}

function pieGradient(result: Simulation, observed: boolean) {
  const colors = ["#1f6fb5", "#8b5bd1", "#0f766e", "#d97706", "#64748b", "#be123c", "#65a30d", "#475569"];
  let offset = 0;
  const segments = result.categories.map((category, index) => {
    const value = observed ? category.observedPercentage : category.simulatedMean;
    const segment = `${colors[index % colors.length]} ${offset}% ${offset + value}%`;
    offset += value;
    return segment;
  });
  return `conic-gradient(${segments.join(", ")})`;
}

function pieColor(index: number) {
  return ["#1f6fb5", "#8b5bd1", "#0f766e", "#d97706", "#64748b", "#be123c", "#65a30d", "#475569"][index % 8];
}

function histogram(values: number[], category: { lower95: number; upper95: number }) {
  if (!values.length) return [category.lower95 < category.upper95 ? 55 : 100];
  const bins = Array.from({ length: 10 }, () => 0);
  values.forEach((value) => bins[Math.min(9, Math.floor(value / 10))]++);
  const max = Math.max(...bins, 1);
  return bins.map((value) => value * 100 / max);
}

export function SimulationHowItWorks({ result }: { result: Simulation }) {
  const cumulative = result.cumulativeProbabilities ?? [];
  return <Accordion type="single" collapsible className="overflow-hidden rounded-xl border border-border-line bg-white shadow-sm">
    <AccordionItem value="simulation-how-it-works" className="border-0">
      <AccordionTrigger className="rounded-xl px-5 py-4 hover:no-underline">
        <span><span className="text-sm font-semibold text-ink-900">Cómo funciona</span><span className="ml-2 text-xs font-normal text-ink-600">Transformada inversa y primeros sorteos</span></span>
      </AccordionTrigger>
      <AccordionContent>
    <div className="grid gap-4 p-4 lg:grid-cols-2">
      <section className="rounded-lg border border-border-line bg-surface-container-low/50 p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div><p className="text-sm font-semibold text-ink-900">Probabilidad acumulada</p><p className="mt-0.5 text-xs text-ink-600">Cada número aleatorio cae en el primer intervalo que alcanza su valor.</p></div>
          <span className="rounded-full bg-white px-2 py-1 text-[10px] font-medium text-ink-600">Transformada inversa</span>
        </div>
        <div className="space-y-3">{result.categories.map((category, index) => {
          const end = (cumulative[index] ?? 0) * 100;
          const start = index === 0 ? 0 : (cumulative[index - 1] ?? 0) * 100;
          return <div key={category.category} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-xs"><div className="min-w-0"><div className="flex justify-between gap-2"><span className="truncate font-medium text-ink-800">{simulationCategoryLabel(category.category)}</span><span className="tabular-nums text-ink-600">{simulationPercent(end)}</span></div><Progress value={end} className="mt-1 h-2 bg-white" /></div><span className="rounded-md border border-border-line bg-white px-2 py-1 tabular-nums text-[10px] text-ink-600">{simulationPercent(start)}–{simulationPercent(end)}</span></div>;
        })}</div>
      </section>
      <section className="rounded-lg border border-border-line bg-surface-container-low/50 p-4">
        <div className="mb-3 flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-ink-900">Primeros 10 números aleatorios</p><p className="mt-0.5 text-xs text-ink-600">Ejemplos de cómo la semilla asigna cada sorteo a una categoría.</p></div><span className="rounded-full bg-white px-2 py-1 text-[10px] font-medium text-ink-600">Semilla {result.seed}</span></div>
        <div className="grid gap-2 sm:grid-cols-2">{(result.firstDraws ?? []).map((draw, index) => <div key={`${draw.random}-${index}`} className="flex items-center gap-2 rounded-md border border-border-line bg-white px-2.5 py-2 text-xs"><span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">{index + 1}</span><span className="tabular-nums text-ink-600">{draw.random.toFixed(2)}</span><span className="text-ink-400">→</span><span className="min-w-0 truncate font-medium text-ink-800">{simulationCategoryLabel(draw.category)}</span></div>)}</div>
      </section>
    </div>
      </AccordionContent>
    </AccordionItem>
  </Accordion>;
}

export function SimulationComparisonTable({
  result,
  observedTotal,
  scenarioPercentages,
  defaultOpen = false,
}: {
  result: Simulation;
  observedTotal: number;
  scenarioPercentages: Record<string, number> | null;
  defaultOpen?: boolean;
}) {
  return (
    <Accordion type="single" collapsible defaultValue={defaultOpen ? "simulation-comparison-table" : undefined} className="overflow-hidden rounded-xl border border-border-line bg-white shadow-sm">
      <AccordionItem value="simulation-comparison-table" className="border-0">
        <AccordionTrigger className="rounded-xl px-5 py-4 hover:no-underline">
          <span><span className="text-sm font-semibold text-ink-900">Ver tabla</span><span className="ml-2 text-xs font-normal text-ink-600">Frecuencias, diferencias y rangos de todas las categorías</span></span>
        </AccordionTrigger>
        <AccordionContent>
      <Card className="rounded-none border-0 shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="title-card">Tabla comparativa de frecuencias y variabilidad</CardTitle>
            <CardDescription>Porcentajes observados, simulados y rango del 95 % de las repeticiones.</CardDescription>
          </div>
          <Badge tone="neutral">n = {observedTotal}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table className="min-w-[760px] text-sm">
          <TableHeader><TableRow className="bg-surface-container-low"><TableHead>Categoría</TableHead><TableHead className="text-right">Frecuencia observada (n)</TableHead><TableHead className="text-right">% observado</TableHead>{scenarioPercentages && <TableHead className="text-right">Probabilidad usada</TableHead>}<TableHead className="text-right">% simulado (media)</TableHead><TableHead className="text-right">Mediana de réplicas</TableHead><TableHead className="text-right">Δ vs observado</TableHead><TableHead className="text-right">Rango 95 % de repeticiones</TableHead><TableHead className="text-right">Desv. est. de las repeticiones</TableHead></TableRow></TableHeader>
          <TableBody>
            {result.categories.map((category) => (
              <TableRow key={category.category}>
                <TableCell className="font-medium">{simulationCategoryLabel(category.category)}</TableCell>
                <TableCell className="text-right tabular-nums">{category.observedCount}</TableCell>
                <TableCell className="text-right tabular-nums">{simulationPercent(category.observedPercentage)}</TableCell>
                {scenarioPercentages && <TableCell className="text-right tabular-nums text-ink-700">{simulationPercent(scenarioPercentages[category.category] ?? 0)}</TableCell>}
                <TableCell className="text-right tabular-nums text-primary">{simulationPercent(category.simulatedMean)}</TableCell>
                <TableCell className="text-right tabular-nums">{simulationPercent(category.median ?? category.simulatedMean)}</TableCell>
                <TableCell className="text-right tabular-nums">{simulationDelta(category.simulatedMean, category.observedPercentage)}</TableCell>
                <TableCell className="text-right tabular-nums">[{simulationPercent(category.lower95)} – {simulationPercent(category.upper95)}]</TableCell>
                <TableCell className="text-right tabular-nums">{category.standardDeviation == null ? "—" : simulationPercent(category.standardDeviation)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-surface-container-low font-semibold"><TableCell>Total</TableCell><TableCell className="text-right tabular-nums">{result.categories.reduce((sum, category) => sum + category.observedCount, 0)}</TableCell><TableCell className="text-right tabular-nums">100,0 %</TableCell>{scenarioPercentages && <TableCell className="text-right tabular-nums">100,0 %</TableCell>}<TableCell className="text-right tabular-nums">100,0 %</TableCell><TableCell className="text-right tabular-nums">—</TableCell><TableCell className="text-right">0,0 pp</TableCell><TableCell className="text-right">—</TableCell><TableCell className="text-right">—</TableCell></TableRow>
          </TableBody>
        </Table>
      </CardContent>
      </Card>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
