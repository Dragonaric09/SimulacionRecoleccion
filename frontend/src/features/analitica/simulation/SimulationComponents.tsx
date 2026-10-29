import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Badge } from "@/components/analytics/Badge";
import { TapTooltip } from "@/components/analytics/TapTooltip";
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

export function SimulationDistribution({ result, observedTotal, variable }: { result: Simulation; observedTotal: number; variable?: string }) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  return (
    <Card className="rounded-xl border-0 shadow-sm">
      <CardHeader>
        {/* flex-wrap: en un celular el badge pasa debajo del título en lugar de salirse de la pantalla. */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="title-card">Observado contra escenario</CardTitle>
            <CardDescription>Distribución de {simulationVariableLabel(variable ?? "")} con media simulada y rango del 95 % de las réplicas.</CardDescription>
          </div>
          <TapTooltip
            side="bottom"
            content={
              <>
                <p className="font-semibold text-ink-900">Cómo leer esta simulación</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-600">
                  La base observada es de {observedTotal} respuestas. Se simulan {result.sampleSize} personas en {result.repetitions.toLocaleString("es-BO")} réplicas con la semilla {result.seed}.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-ink-600">
                  El rango del 95 % va del percentil 2,5 al 97,5 de las réplicas: describe la variación de los sorteos simulados, no es un intervalo de confianza sobre la población.
                </p>
              </>
            }
          >
            <button type="button" className="max-w-full cursor-help text-left">
              <Badge tone="neutral" className="h-auto min-h-6 max-w-full whitespace-normal py-0.5 text-left">Base observada: {observedTotal} · Simulado: {result.sampleSize} personas × {result.repetitions.toLocaleString("es-BO")} réplicas</Badge>
            </button>
          </TapTooltip>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <SimulationECharts result={result} variable={variable} selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
        <div className="border-t border-border-line pt-3 text-xs text-ink-600">{result.repetitions.toLocaleString("es-BO")} réplicas · semilla {result.seed}. Haz clic en una categoría para abrir el histograma de sus réplicas.</div>

      </CardContent>
    </Card>
  );
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
