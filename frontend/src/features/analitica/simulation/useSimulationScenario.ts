import { useCallback, useEffect, useRef, useState, type SetStateAction } from "react";
import { apiRequest } from "@/api/client";
import type { AnalyticsSummary } from "../api";
import type { Simulation } from "../shared/analyticsTypes";
import { useDatasets } from "../shared/AnalyticsPrimitives";
import { usePersistentState } from "@/lib/usePersistentState";
import type { SimulationRun } from "./SimulationDownloads";
import {
  parseSimulationInteger,
  simulationCategories,
  simulationCategoryLabel,
  simulationVariableLabel,
} from "./simulationUtils";

export function useSimulationScenario() {
  const { datasets, datasetId, setDatasetId, loading: datasetsLoading } = useDatasets("TITULADOS");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  // Los parámetros del escenario se conservan al recargar la página.
  const [variable, setVariable] = usePersistentState("simulacionem.simulation.variable", "genero", isText);
  const [segment, setSegment] = usePersistentState("simulacionem.simulation.segment", "all", isText);
  const [weights, setWeightsState] = useState<Record<string, number>>({});
  const [sampleSize, setSampleSize] = usePersistentState("simulacionem.simulation.sampleSize", 100, isInteger);
  const [sampleSizeInput, setSampleSizeInput] = useState(() => String(sampleSize));
  const [repetitions, setRepetitions] = usePersistentState("simulacionem.simulation.repetitions", 1000, isInteger);
  const [repetitionsInput, setRepetitionsInput] = useState(() => String(repetitions));
  const [seed, setSeed] = usePersistentState("simulacionem.simulation.seed", 42, isInteger);
  const [seedInput, setSeedInput] = useState(() => String(seed));
  const weightsKey = datasetId ? `simulacionem.simulation.weights.${datasetId}.${variable}.${segment}` : null;
  const setWeights = useCallback((next: SetStateAction<Record<string, number>>) => {
    setWeightsState((current) => {
      const value = typeof next === "function" ? next(current) : next;
      if (weightsKey) {
        try {
          localStorage.setItem(weightsKey, JSON.stringify(value));
        } catch {
          /* sin almacenamiento: los pesos solo viven en la pantalla */
        }
      }
      return value;
    });
  }, [weightsKey]);
  const [result, setResult] = useState<Simulation | null>(null);
  const [scenarioPercentages, setScenarioPercentages] = useState<Record<string, number> | null>(null);
  const [executedRun, setExecutedRun] = useState<SimulationRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const simulationAbortRef = useRef<AbortController | null>(null);
  const simulationRequestRef = useRef(0);

  const sampleSizeValid = Number.isInteger(sampleSize) && sampleSize >= 1 && sampleSize <= 10000;
  const repetitionsValid = Number.isInteger(repetitions) && repetitions >= 1 && repetitions <= 5000;
  const seedValid = Number.isInteger(seed);
  const parametersValid = sampleSizeValid && repetitionsValid && seedValid;

  useEffect(() => {
    if (!datasetId) return;
    setResult(null);
    setScenarioPercentages(null);
    setExecutedRun(null);
    setError(null);
    const gender = segment === "all" ? "" : `&gender=${encodeURIComponent(segment)}`;
    apiRequest<AnalyticsSummary>(
      `/analytics/titulados/summary?datasetId=${encodeURIComponent(datasetId)}&fields=${encodeURIComponent(variable)}${gender}`,
    )
      .then((next) => {
        setSummary(next);
        // Pesos guardados de este dataset, variable y segmento; si no hay, el escenario parte de lo observado.
        setWeightsState(loadWeights(weightsKey));
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, [datasetId, variable, segment, weightsKey]);

  const currentResult = result && executedRun
    && executedRun.datasetId === datasetId
    && executedRun.variable === variable
    && executedRun.segment === segment
    ? result
    : null;
  const currentExecutedRun = currentResult ? executedRun : null;

  const run = useCallback(async () => {
    if (!parametersValid || !datasetId) {
      setError("Revisa los parámetros: deben ser números enteros válidos dentro de los límites indicados.");
      return;
    }
    const distribution = summary?.distributions[variable];
    if (!distribution) return;
    const categories = simulationCategories(variable, distribution.counts);
    const observedWeights = categories.map((category) => weights[category] ?? distribution.counts[category] ?? 0);
    const total = observedWeights.reduce((sum, value) => sum + value, 0);
    const adjusted = categories.some(
      (category) => weights[category] !== undefined && weights[category] !== distribution.counts[category],
    );
    const nextScenarioPercentages = adjusted
      ? Object.fromEntries(categories.map((category, index) => [category, (observedWeights[index] * 100) / total]))
      : null;
    simulationAbortRef.current?.abort();
    const controller = new AbortController();
    simulationAbortRef.current = controller;
    const requestId = ++simulationRequestRef.current;
    setLoading(true);
    setError(null);
    try {
      const nextResult = await apiRequest<Simulation>("/analytics/simulation/multinomial", {
        method: "POST",
        body: JSON.stringify({
          categories,
          probabilities: observedWeights.map((value) => value / total),
          observedCounts: categories.map((category) => distribution.counts[category] ?? 0),
          sampleSize,
          repetitions,
          seed,
        }),
        signal: controller.signal,
      });
      if (requestId !== simulationRequestRef.current) return;
      setResult(nextResult);
      setScenarioPercentages(nextScenarioPercentages);
      setExecutedRun({
        result: nextResult,
        datasetId,
        variable,
        variableLabel: simulationVariableLabel(variable),
        observedTotal: distribution.validCount,
        datasetName: datasets.find((dataset) => dataset.id === datasetId)?.displayName ?? datasetId ?? "No especificado",
        observedProbabilities: Object.fromEntries(categories.map((category) => [category, (distribution.counts[category] ?? 0) / Math.max(distribution.validCount, 1)])),
        usedProbabilities: Object.fromEntries(categories.map((category, index) => [category, observedWeights[index] / Math.max(total, 1)])),
        adjusted,
        categoryLabel: simulationCategoryLabel,
        weights: { ...weights },
        scenarioPercentages: nextScenarioPercentages,
        segment,
      });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (requestId === simulationRequestRef.current) setLoading(false);
    }
  }, [datasetId, datasets, parametersValid, repetitions, sampleSize, seed, segment, summary, variable, weights]);

  useEffect(() => {
    if (!summary?.distributions[variable] || !datasetId || !parametersValid) return;
    const timeout = window.setTimeout(() => void run(), 250);
    return () => window.clearTimeout(timeout);
  }, [run, summary, datasetId, variable, weights, sampleSize, repetitions, seed, parametersValid]);

  return {
    datasets,
    datasetId,
    setDatasetId,
    datasetsLoading,
    summary,
    variable,
    setVariable,
    segment,
    setSegment,
    weights,
    setWeights,
    sampleSize,
    sampleSizeInput,
    setSampleSizeInput,
    setSampleSize,
    repetitions,
    repetitionsInput,
    setRepetitionsInput,
    setRepetitions,
    seed,
    seedInput,
    setSeedInput,
    setSeed,
    result: currentResult,
    scenarioPercentages,
    executedRun: currentExecutedRun,
    loading,
    error,
    sampleSizeValid,
    repetitionsValid,
    seedValid,
    parseInteger: parseSimulationInteger,
  };
}

const isText = (value: unknown): value is string => typeof value === "string" && value.length > 0;
const isInteger = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value);

function loadWeights(key: string | null): Record<string, number> {
  if (!key) return {};
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? "{}");
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        (entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]) && entry[1] >= 0,
      ),
    );
  } catch {
    return {};
  }
}
