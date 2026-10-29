import { useCallback, useEffect, useState } from "react";
import { Save, Trash2 } from "lucide-react";
import { apiRequest } from "@/api/client";
import { Badge } from "@/components/analytics/Badge";
import { TapTooltip } from "@/components/analytics/TapTooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { SavedSimulationScenario, SimulationComparison } from "../shared/analyticsTypes";
import type { SimulationRun } from "./SimulationDownloads";
import { simulationCategoryLabel, simulationPercent } from "./simulationUtils";

const SEGMENT_LABELS: Record<string, string> = { all: "Todos", Mujer: "Mujer", Hombre: "Hombre" };

function points(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1).replace(".", ",")} pp`;
}

/** Mensaje legible de un error de la API («HTTP 409: {"error": "…"}» → «…»). */
function apiMessage(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause);
  const body = message.replace(/^HTTP \d+:\s*/, "");
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === "object" && "error" in parsed && typeof parsed.error === "string") return parsed.error;
  } catch {
    /* el cuerpo no es JSON */
  }
  return body || message;
}

/** Lectura de la diferencia: el rango del 95 % de Δ decide si el cambio supera el azar de los sorteos. */
function reading(difference: SimulationComparison["differences"][number]) {
  if (difference.lower95 === 0 && difference.upper95 === 0 && difference.meanDifference === 0) return { label: "Sin cambio", tone: "neutral" as const };
  if (difference.lower95 > 0) return { label: "Sube", tone: "success" as const };
  if (difference.upper95 < 0) return { label: "Baja", tone: "empleadores" as const };
  // Con los mismos sorteos un cambio pequeño deja réplicas idénticas (Δ = 0) pero nunca invierte el signo.
  if (difference.shareLower === 0) return { label: "Sube o se mantiene", tone: "success" as const };
  if (difference.shareHigher === 0) return { label: "Baja o se mantiene", tone: "empleadores" as const };
  return { label: "No concluyente", tone: "warning" as const };
}

/** Escenario ajustado contra el escenario base (lo observado), con réplicas emparejadas por la misma semilla. */
export function SimulationScenarioComparison({ comparison }: { comparison: SimulationComparison }) {
  const limit = Math.max(1, ...comparison.differences.flatMap((difference) => [Math.abs(difference.lower95), Math.abs(difference.upper95)]));
  const position = (value: number) => `${50 + (value / limit) * 50}%`;
  return (
    <Card className="rounded-xl border-0 shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="title-card">Escenario contra base</CardTitle>
            <CardDescription>Cuánto cambia cada categoría respecto de lo observado, con los mismos sorteos en ambos.</CardDescription>
          </div>
          <TapTooltip
            side="bottom"
            content={
              <>
                <p className="font-semibold text-ink-900">Cómo se compara</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-600">
                  El escenario base usa las probabilidades observadas y el ajustado las tuyas. Los dos se simulan con la semilla {comparison.scenario.seed}, así que la réplica 1 de uno se compara con la réplica 1 del otro (números aleatorios comunes) y la diferencia refleja solo el cambio de probabilidades.
                </p>
                <p className="mt-2 text-xs leading-relaxed text-ink-600">
                  El rango de Δ va del percentil 2,5 al 97,5 de las {comparison.scenario.repetitions.toLocaleString("es-BO")} diferencias. Si no incluye el 0, el cambio aparece en casi todas las réplicas.
                </p>
              </>
            }
          >
            <button type="button" className="cursor-help">
              <Badge tone="neutral">Misma semilla · {comparison.scenario.repetitions.toLocaleString("es-BO")} réplicas emparejadas</Badge>
            </button>
          </TapTooltip>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table className="min-w-[720px] text-sm">
          <TableHeader>
            <TableRow className="bg-surface-container-low">
              <TableHead>Categoría</TableHead>
              <TableHead className="text-right">Base (media)</TableHead>
              <TableHead className="text-right">Escenario (media)</TableHead>
              <TableHead className="text-right">Δ media</TableHead>
              <TableHead className="w-[180px]">Rango 95 % de Δ</TableHead>
              <TableHead className="text-right">Réplicas en que sube</TableHead>
              <TableHead>Lectura</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comparison.differences.map((difference, index) => {
              const base = comparison.base.categories[index];
              const scenario = comparison.scenario.categories[index];
              const { label, tone } = reading(difference);
              return (
                <TableRow key={difference.category}>
                  <TableCell className="font-medium">{simulationCategoryLabel(difference.category)}</TableCell>
                  <TableCell className="text-right tabular-nums">{base ? simulationPercent(base.simulatedMean) : "—"}</TableCell>
                  <TableCell className="text-right tabular-nums text-primary">{scenario ? simulationPercent(scenario.simulatedMean) : "—"}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{points(difference.meanDifference)}</TableCell>
                  <TableCell>
                    <div className="grid gap-1">
                      <div className="relative h-2 rounded-full bg-surface-container-low" aria-hidden="true">
                        <span className="absolute inset-y-[-2px] left-1/2 w-px bg-ink-400" />
                        <span
                          className="absolute inset-y-0 rounded-full bg-primary/60"
                          style={{ left: position(difference.lower95), width: `calc(${position(difference.upper95)} - ${position(difference.lower95)} + 2px)` }}
                        />
                        <span className="absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary" style={{ left: position(difference.meanDifference) }} />
                      </div>
                      <span className="text-xs tabular-nums text-ink-600">[{points(difference.lower95)} ; {points(difference.upper95)}]</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{simulationPercent(difference.shareHigher)}</TableCell>
                  <TableCell><Badge tone={tone}>{label}</Badge></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <p className="mt-3 text-xs text-ink-600">Δ = escenario − base en puntos porcentuales. «Sube o se mantiene»: ninguna réplica baja, pero en algunas el resultado no cambia. «No concluyente»: hay réplicas que suben y otras que bajan, así que con este N el cambio no se distingue de la variación de los sorteos.</p>
      </CardContent>
    </Card>
  );
}

/** Escenarios con nombre guardados en el servidor, compartidos por todos los usuarios. */
export function SimulationSavedScenarios({
  variable,
  run,
  onApply,
}: {
  variable: string;
  run: SimulationRun | null;
  onApply: (scenario: SavedSimulationScenario) => void;
}) {
  const [scenarios, setScenarios] = useState<SavedSimulationScenario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [toDelete, setToDelete] = useState<SavedSimulationScenario | null>(null);

  const load = useCallback((signal?: AbortSignal) => {
    setLoading(true);
    return apiRequest<SavedSimulationScenario[]>(`/analytics/simulation/scenarios?variable=${encodeURIComponent(variable)}`, { signal })
      .then((next) => {
        setScenarios(next);
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(apiMessage(cause));
      })
      .finally(() => setLoading(false));
  }, [variable]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const canSave = run !== null && run.variable === variable;
  const save = async () => {
    if (!run || !name.trim()) return;
    setSaving(true);
    try {
      const categories = run.result.categories.map((category) => category.category);
      await apiRequest<SavedSimulationScenario>("/analytics/simulation/scenarios", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          variable: run.variable,
          segment: run.segment,
          categories,
          probabilities: categories.map((category) => run.usedProbabilities[category] ?? 0),
          sampleSize: run.result.sampleSize,
          repetitions: run.result.repetitions,
          seed: run.result.seed,
          datasetId: run.datasetId,
        }),
      });
      setName("");
      setDescription("");
      setFormOpen(false);
      await load();
    } catch (cause) {
      setError(apiMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (scenario: SavedSimulationScenario) => {
    setToDelete(null);
    try {
      await apiRequest<void>(`/analytics/simulation/scenarios/${scenario.id}`, { method: "DELETE" });
    } catch (cause) {
      setError(apiMessage(cause));
    }
    await load();
  };

  return (
    <div className="rounded-lg border border-border-line p-3 text-xs">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-semibold text-ink-800">Escenarios guardados</p>
        <Button type="button" variant="outline" size="xs" disabled={!canSave} onClick={() => setFormOpen((open) => !open)}>
          <Save className="size-3.5" /> Guardar actual
        </Button>
      </div>
      {formOpen && canSave && (
        <form
          className="mb-3 grid gap-2 rounded-md bg-surface-container-low p-2"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <Input className="h-8" placeholder="Nombre del escenario" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} aria-label="Nombre del escenario" />
          <Input className="h-8" placeholder="Descripción (opcional)" maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} aria-label="Descripción del escenario" />
          <p className="text-ink-600">Se guardan las probabilidades usadas, el segmento, N, R y la semilla. Lo verán todos los usuarios.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="xs" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button type="submit" size="xs" disabled={saving || !name.trim()}>{saving ? "Guardando…" : "Guardar"}</Button>
          </div>
        </form>
      )}
      {error && <p role="alert" className="mb-2 text-destructive">{error}</p>}
      {scenarios.length === 0 ? (
        <p className="text-ink-600">{loading ? "Cargando…" : "Aún no hay escenarios guardados para esta variable."}</p>
      ) : (
        <ul className="grid gap-1.5">
          {scenarios.map((scenario) => (
            <li key={scenario.id} className="flex items-center gap-2 rounded-md bg-surface-container-low px-2 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink-900" title={scenario.name}>{scenario.name}</p>
                <p className="truncate text-[11px] text-ink-600" title={scenario.description ?? undefined}>
                  {SEGMENT_LABELS[scenario.segment] ?? scenario.segment} · N {scenario.sampleSize} · R {scenario.repetitions.toLocaleString("es-BO")}
                  {scenario.description ? ` · ${scenario.description}` : ""}
                </p>
              </div>
              <Button type="button" variant="link" size="xs" className="px-1" onClick={() => onApply(scenario)}>Aplicar</Button>
              <Button type="button" variant="ghost" size="icon" className="size-7" aria-label={`Eliminar ${scenario.name}`} onClick={() => setToDelete(scenario)}>
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <AlertDialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este escenario?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete && <>Se eliminará <strong>{toDelete.name}</strong> para todos los usuarios. Esta acción no se puede deshacer.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => toDelete && void remove(toDelete)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
