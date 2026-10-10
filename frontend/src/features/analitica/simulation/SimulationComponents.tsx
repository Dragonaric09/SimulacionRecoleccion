import type { Dispatch, SetStateAction } from "react";
import { Badge } from "@/components/analytics/Badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CategoryDistribution } from "../api";
import type { Simulation } from "../shared/analyticsTypes";
import { simulationCategories, simulationCategoryLabel, simulationDelta, simulationPercent } from "./simulationUtils";


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
  return (
    <div className="space-y-3 rounded-lg bg-surface-container-low p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="caption-bold text-ink-700">Ajustar probabilidades (opcional)</p>
        <Button variant="link" size="xs" onClick={() => setWeights({})}>Restablecer</Button>
      </div>
      {entries.map(([label, count]) => {
        const value = weights[label] ?? count;
        return (
          <label key={label} className="grid gap-1 text-xs">
            <span className="flex justify-between gap-2"><span className="truncate">{simulationCategoryLabel(label)}</span><strong>{value} de {currentTotal} · {currentTotal ? simulationPercent((value * 100) / currentTotal) : "—"}</strong></span>
            <Slider min={0} max={Math.max(10, Math.max(...entries.map(([, item]) => item)) * 2)} step={1} value={[value]} onValueChange={(next) => setWeights((current) => ({ ...current, [label]: next[0] ?? value }))} />
          </label>
        );
      })}
    </div>
  );
}

export function SimulationDistribution({ result, observedTotal, loading = false }: { result: Simulation; observedTotal: number; loading?: boolean }) {
  return (
    <Card className="rounded-xl border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="title-card">Distribución simulada y rango del 95 % de las repeticiones</CardTitle>
            <CardDescription>Media estimada y rango donde cae el 95 % de las repeticiones por categoría.</CardDescription>
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
        {result.categories.map((category) => (
          <div key={category.category} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium">{simulationCategoryLabel(category.category)}</span>
              <span className="whitespace-nowrap tabular-nums text-primary">{simulationPercent(category.simulatedMean)} <span className="text-xs text-ink-600">[Rango 95 %: {simulationPercent(category.lower95)} – {simulationPercent(category.upper95)}]</span></span>
            </div>
              <div className="relative h-5 rounded bg-surface-container-low transition-opacity duration-200" style={{ opacity: loading ? 0.55 : 1 }}>
                <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-primary/75" style={{ width: `${category.simulatedMean}%` }} />
                <div className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-ink-900" style={{ left: `${category.lower95}%`, width: `${Math.max(0, category.upper95 - category.lower95)}%` }} />
                <span className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" style={{ left: `${category.simulatedMean}%` }} />
                <span className="absolute top-0 h-full w-px bg-amber-600" style={{ left: `${category.observedPercentage}%` }} title={`Observado: ${simulationPercent(category.observedPercentage)}`} />
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-5 border-t border-border-line pt-3 text-xs text-ink-600">
          <span><i className="mr-1 inline-block size-2 rounded-sm bg-primary" />Media estimada</span>
          <span><i className="mr-1 inline-block h-0.5 w-4 bg-ink-900 align-middle" />Rango del 95 % de las repeticiones</span>
          <span><i className="mr-1 inline-block h-3 w-px bg-amber-600 align-middle" />Observado</span>
          <span className="ml-auto">{result.repetitions.toLocaleString("es-BO")} réplicas · semilla {result.seed}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function SimulationComparisonTable({
  result,
  observedTotal,
  scenarioPercentages,
}: {
  result: Simulation;
  observedTotal: number;
  scenarioPercentages: Record<string, number> | null;
}) {
  return (
    <Card className="rounded-xl border-0 shadow-sm">
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
          <TableHeader><TableRow className="bg-surface-container-low"><TableHead>Categoría</TableHead><TableHead className="text-right">Frecuencia observada (n)</TableHead><TableHead className="text-right">% observado</TableHead>{scenarioPercentages && <TableHead className="text-right">Probabilidad usada</TableHead>}<TableHead className="text-right">% simulado (media)</TableHead><TableHead className="text-right">Δ vs observado</TableHead><TableHead className="text-right">Rango 95 % de repeticiones</TableHead><TableHead className="text-right">Desv. est. de las repeticiones</TableHead></TableRow></TableHeader>
          <TableBody>
            {result.categories.map((category) => (
              <TableRow key={category.category}>
                <TableCell className="font-medium">{simulationCategoryLabel(category.category)}</TableCell>
                <TableCell className="text-right tabular-nums">{category.observedCount}</TableCell>
                <TableCell className="text-right tabular-nums">{simulationPercent(category.observedPercentage)}</TableCell>
                {scenarioPercentages && <TableCell className="text-right tabular-nums text-ink-700">{simulationPercent(scenarioPercentages[category.category] ?? 0)}</TableCell>}
                <TableCell className="text-right tabular-nums text-primary">{simulationPercent(category.simulatedMean)}</TableCell>
                <TableCell className="text-right tabular-nums">{simulationDelta(category.simulatedMean, category.observedPercentage)}</TableCell>
                <TableCell className="text-right tabular-nums">[{simulationPercent(category.lower95)} – {simulationPercent(category.upper95)}]</TableCell>
                <TableCell className="text-right tabular-nums">{category.standardDeviation == null ? "—" : simulationPercent(category.standardDeviation)}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-surface-container-low font-semibold"><TableCell>Total</TableCell><TableCell className="text-right tabular-nums">{result.categories.reduce((sum, category) => sum + category.observedCount, 0)}</TableCell><TableCell className="text-right tabular-nums">100,0 %</TableCell>{scenarioPercentages && <TableCell className="text-right tabular-nums">100,0 %</TableCell>}<TableCell className="text-right tabular-nums">100,0 %</TableCell><TableCell className="text-right">0,0 pp</TableCell><TableCell className="text-right">—</TableCell><TableCell className="text-right">—</TableCell></TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
