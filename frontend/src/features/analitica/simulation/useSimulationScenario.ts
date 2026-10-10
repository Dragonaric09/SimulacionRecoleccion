import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/api/client";
import type { AnalyticsSummary } from "../api";
import type { Simulation } from "../shared/analyticsTypes";
import { useDatasets } from "../shared/AnalyticsPrimitives";
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
  const [variable, setVariable] = useState("area_posgrado_interes");
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [sampleSize, setSampleSize] = useState(100);
  const [sampleSizeInput, setSampleSizeInput] = useState("100");
  const [repetitions, setRepetitions] = useState(1000);
  const [repetitionsInput, setRepetitionsInput] = useState("1000");
  const [seed, setSeed] = useState(42);
  const [seedInput, setSeedInput] = useState("42");
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
    apiRequest<AnalyticsSummary>(
      `/analytics/titulados/summary?datasetId=${encodeURIComponent(datasetId)}&fields=${encodeURIComponent(variable)}`,
    )
      .then((next) => {
        setSummary(next);
        setWeights({});
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, [datasetId, variable]);

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
      });
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (requestId === simulationRequestRef.current) setLoading(false);
    }
  }, [datasetId, datasets, parametersValid, repetitions, sampleSize, seed, summary, variable, weights]);

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
    result,
    scenarioPercentages,
    executedRun,
    loading,
    error,
    sampleSizeValid,
    repetitionsValid,
    seedValid,
    parseInteger: parseSimulationInteger,
  };
}
