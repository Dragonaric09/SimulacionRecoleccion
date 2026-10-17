import { useEffect, useRef, useState } from "react";
import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart, BoxplotChart, LineChart, PieChart } from "echarts/charts";
import { GridComponent, LegendComponent, MarkLineComponent, MarkPointComponent, TooltipComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { Simulation } from "../shared/analyticsTypes";
import { simulationCategoryLabel, simulationDelta, simulationPercent } from "./simulationUtils";

echarts.use([BarChart, BoxplotChart, LineChart, PieChart, GridComponent, LegendComponent, MarkLineComponent, MarkPointComponent, TooltipComponent, SVGRenderer]);

type Props = {
  result: Simulation;
  variable?: string;
  selectedCategory: string | null;
  onSelect: (category: string | null) => void;
};

const colors = ["#1f6fb5", "#8b5bd1", "#0f766e", "#d97706", "#64748b", "#be123c", "#65a30d", "#475569"];

export function SimulationECharts({ result, variable, selectedCategory, onSelect }: Props) {
  const kind = kindFor(variable, result);
  const selected = result.categories.find((category) => category.category === selectedCategory);
  const [legendSelection, setLegendSelection] = useState<Record<string, boolean>>({});
  const chartRef = useRef<echarts.ECharts | null>(null);
  const option = buildSimulationChartOption(kind, result, kind === "unordered" ? legendSelection : undefined);
  const chartHeight = kind === "pie" || kind === "boolean" ? 270 : kind === "unordered" ? Math.max(220, Math.min(360, result.categories.length * 52 + 90)) : 310;
  usePrintResize(chartRef);
  const onEvents = {
    click: (params: { name?: string; data?: ChartDatum }) => {
      const raw = params.data?.extra?.category ?? result.categories.find((category) => simulationCategoryLabel(category.category) === params.name)?.category;
      if (raw) onSelect(raw === selectedCategory ? null : raw);
    },
    legendselectchanged: (params: { selected?: Record<string, boolean> }) => {
      if (kind === "unordered" && params.selected) setLegendSelection(params.selected);
    },
  };
  return <div className="space-y-3">
    <ReactEChartsCore echarts={echarts} option={option} onEvents={onEvents} onChartReady={(chart) => { chartRef.current = chart; }} style={{ height: chartHeight, width: "100%" }} opts={{ renderer: "svg" }} notMerge lazyUpdate />
    {selected && <ReplicaChart selected={selected} />}
  </div>;
}

/** Creates the same chart as a vector SVG for pdfmake. */
export async function createSimulationChartSvg(result: Simulation, variable?: string): Promise<string> {
  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = "1100px";
  host.style.height = "500px";
  host.style.background = "#ffffff";
  document.body.appendChild(host);
  const chart = echarts.init(host, undefined, { renderer: "svg", width: 1100, height: 500 });
  try {
    const kind = kindFor(variable, result);
    const option = buildSimulationChartOption(kind, result, { Observado: true, "Media simulada": true, "Rango / bigotes": true });
    if (kind === "pie" || kind === "boolean") {
      const pieOption = option as { legend?: Record<string, unknown>; series: Array<{ center?: [string, string]; radius?: string | string[]; [key: string]: unknown }> };
      pieOption.legend = { ...pieOption.legend, bottom: 34 };
      pieOption.series = pieOption.series.map((series) => ({
        ...series,
        radius: kind === "pie" ? "40%" : series.radius,
        center: [series.center?.[0] ?? "50%", "38%"],
        label: { ...(series.label as Record<string, unknown> | undefined), show: true },
        labelLine: { show: true },
      }));
    }
    chart.setOption({ ...option, animation: false, animationDuration: 0 });
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
    // Pasar la cadena SVG es importante: pdfmake puede medirla y conservar
    // los <text> generados por ECharts sin depender de getComputedStyle del DOM.
    const rawSvg = chart.renderToSVGString();
    const normalizedSvg = normalizeEchartsSvgTextForPdf(rawSvg);
    return normalizedSvg;
  } finally {
    chart.dispose();
    host.remove();
  }
}

/**
 * pdfmake/svg-to-pdfkit lee correctamente las etiquetas de ECharts, pero en
 * algunas versiones no las pinta cuando el texto solo tiene
 * transform="translate(x y)" y dominant-baseline. Convertimos esa forma
 * equivalente a x/y explícitos. La leyenda, que ya usa x/y, no se modifica.
 */
function normalizeEchartsSvgTextForPdf(svg: string) {
  return svg.replace(
    /<text([^>]*?)transform="translate\(([-0-9.]+) ([-0-9.]+)\)"([^>]*?)>([\s\S]*?)<\/text>/g,
    (match, before: string, x: string, y: string, after: string, content: string) => {
      const attributes = `${before}${after}`;
      // La leyenda ya usa x/y y no necesita normalización.
      if (/\bx=/.test(attributes)) return match;
      const anchor = attributes.match(/text-anchor="([^\"]+)"/)?.[1] ?? "start";
      const fill = attributes.match(/fill="([^\"]+)"/)?.[1] ?? "#334155";
      const fontSize = attributes.match(/font-size:([0-9.]+)px/)?.[1] ?? attributes.match(/font-size="([^\"]+)"/)?.[1] ?? "11";
      return `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${fill}" font-family="Arial, sans-serif" font-size="${fontSize}">${content}</text>`;
    },
  );
}

function kindFor(variable: string | undefined, result: Simulation) {
  if (["sector_trabajo", "situacion_laboral_actual"].includes(variable ?? "")) return "unordered";
  const labels = result.categories.map((item) => item.category.toLowerCase());
  if (labels.some((label) => label.includes("satisf") || label.includes("concord") || label.includes("muy de acuerdo"))) return "scale";
  if (labels.every((label) => ["true", "false", "sí", "si", "no"].includes(label))) return "boolean";
  if (result.categories.length <= 5) return "pie";
  return "ordered";
}

export function simulationChartUsesPie(result: Simulation, variable?: string) {
  return kindFor(variable, result) === "pie";
}

function tooltipFormatter(params: unknown) {
  const item = Array.isArray(params) ? params[0] as { data?: ChartDatum; value?: unknown; seriesName?: string } : params as { data?: ChartDatum; value?: unknown; seriesName?: string };
  const data = item?.data?.extra;
  if (!data) return "";
  const focus = item.seriesName === "Observado" ? "Observado" : item.seriesName === "Media simulada" ? "Media simulada" : "Rango / bigotes";
  const line = (label: string, value: string, active: boolean) => active ? `<strong>${label}: ${value}</strong>` : `${label}: ${value}`;
  return `<strong>${simulationCategoryLabel(data.category)}</strong><br/>${line("Observado", simulationPercent(data.observed), focus === "Observado")}<br/>${line("Media simulada", simulationPercent(data.mean), focus === "Media simulada")}<br/>${line("Mediana de réplicas", simulationPercent(data.median ?? data.mean), focus === "Rango / bigotes")}<br/>${line("Rango 95 %", `${simulationPercent(data.lower)} – ${simulationPercent(data.upper)}`, focus === "Rango / bigotes")}<br/>${line("Desviación", simulationPercent(data.deviation), false)}<br/>${line("Diferencia", simulationDelta(data.mean, data.observed), false)}`;
}

type CategoryStat = Simulation["categories"][number];
type ChartDatum = { value?: unknown; name?: string; extra?: CategoryStat & { category: string; observed: number; mean: number; lower: number; upper: number; deviation: number } };

function datum(category: CategoryStat): ChartDatum {
  return { name: simulationCategoryLabel(category.category), value: category.simulatedMean, extra: { ...category, category: category.category, observed: category.observedPercentage, mean: category.simulatedMean, lower: category.lower95, upper: category.upper95, deviation: category.standardDeviation } };
}

function categoryExtra(category: CategoryStat) {
  return { ...category, category: category.category, observed: category.observedPercentage, mean: category.simulatedMean, lower: category.lower95, upper: category.upper95, deviation: category.standardDeviation };
}

function wrapAxisLabel(value: string, maxCharacters: number) {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (current && next.length > maxCharacters) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.join("\n");
}

export function buildSimulationChartOption(kind: string, result: Simulation, legendSelection?: Record<string, boolean>) {
  const categories = result.categories;
  const common = { animationDuration: 250, color: colors, tooltip: { trigger: "item", confine: true, formatter: tooltipFormatter } };
  if (kind === "pie" || kind === "boolean") {
    return { ...common, tooltip: { ...common.tooltip, formatter: tooltipFormatter }, legend: { bottom: 0, type: "scroll" }, series: [
      { name: "Observado", type: "pie", radius: kind === "boolean" ? ["24%", "42%"] : "34%", center: ["28%", "43%"], label: { formatter: "{b}: {d}%", fontSize: 11 }, data: categories.map((category, index) => ({ ...datum(category), value: category.observedPercentage, itemStyle: { color: colors[index % colors.length] } })) },
      { name: "Escenario", type: "pie", radius: kind === "boolean" ? ["24%", "42%"] : "34%", center: ["72%", "43%"], label: { formatter: "{b}: {d}%", fontSize: 11 }, data: categories.map((category, index) => ({ ...datum(category), value: category.simulatedMean, itemStyle: { color: colors[index % colors.length] } })) },
    ] };
  }
  if (kind === "unordered") {
    const ordered = [...categories].sort((a, b) => b.simulatedMean - a.simulatedMean);
    const selected = { Observado: true, "Media simulada": true, "Rango / bigotes": true, ...legendSelection };
    const observedMarks = ordered.map((category) => ({ name: "Observado", coord: [category.observedPercentage, simulationCategoryLabel(category.category)], value: category.observedPercentage, symbol: "rect", symbolSize: [3, 24], itemStyle: { color: "#64748b" }, extra: categoryExtra(category) }));
    const simulatedMarks = ordered.map((category) => ({ name: "Media simulada", coord: [category.simulatedMean, simulationCategoryLabel(category.category)], value: category.simulatedMean, symbol: "diamond", symbolSize: 12, z: 10, itemStyle: { color: "#1f6fb5", borderColor: "#fff", borderWidth: 1 }, extra: categoryExtra(category) }));
    const rangeSeries = {
      name: "Rango / bigotes",
      type: "boxplot",
      boxWidth: [12, 28],
      data: ordered.map((category) => ({ value: [category.lower95, category.firstQuartile ?? category.lower95, category.median ?? category.simulatedMean, category.thirdQuartile ?? category.upper95, category.upper95], extra: { ...category, category: category.category, observed: category.observedPercentage, mean: category.simulatedMean, lower: category.lower95, upper: category.upper95, deviation: category.standardDeviation } })),
      itemStyle: { color: "#dbeafe", borderColor: "#1f6fb5" },
    };
    const segmentedGuides = { name: "__guías de distribución", type: "line", data: [], silent: true, showSymbol: false, lineStyle: { opacity: 0 }, markLine: { symbol: "none", label: { show: false }, lineStyle: { color: "#cbd5e1", type: "dashed", width: 1 }, data: ordered.map((category) => [{ coord: [0, simulationCategoryLabel(category.category)] }, { coord: [100, simulationCategoryLabel(category.category)] }]) } };
    return { ...common, legend: { bottom: 12, left: "center", itemGap: 24, padding: [0, 8], selectedMode: true, selected, data: [{ name: "Observado", icon: "rect" }, { name: "Media simulada", icon: "diamond" }, { name: "Rango / bigotes", icon: "roundRect" }] }, grid: { left: "10%", right: "10%", top: 20, bottom: 62, containLabel: false }, xAxis: { type: "value", min: 0, max: 100, axisLabel: { formatter: "{value}%" }, axisLine: { lineStyle: { color: "#cbd5e1" } }, splitLine: { lineStyle: { color: "#e2e8f0" } } }, yAxis: { type: "category", inverse: true, data: ordered.map((category) => simulationCategoryLabel(category.category)), axisLabel: { margin: 8, lineHeight: 14, align: "right", formatter: (value: string) => wrapAxisLabel(value, 20) } }, series: [rangeSeries, segmentedGuides, { name: "Observado", type: "line", data: [], showSymbol: false, itemStyle: { color: "#64748b" }, lineStyle: { opacity: 0 }, markPoint: { label: { show: false }, tooltip: { formatter: tooltipFormatter }, data: selected.Observado ? observedMarks : [] } }, { name: "Media simulada", type: "line", data: [], showSymbol: false, itemStyle: { color: "#1f6fb5" }, lineStyle: { opacity: 0 }, markPoint: { label: { show: false }, tooltip: { formatter: tooltipFormatter }, data: selected["Media simulada"] ? simulatedMarks : [] } }] };
  }
  if (kind === "scale") {
    return { ...common, legend: { bottom: 6, type: "scroll" }, grid: { left: 82, right: 25, top: 15, bottom: 48 }, xAxis: { type: "value", min: 0, max: 100, axisLabel: { formatter: "{value}%" }, splitLine: { lineStyle: { color: "#e2e8f0" } } }, yAxis: { type: "category", data: ["Observado", "Escenario"], axisTick: { show: false } }, series: categories.map((category, index) => ({ name: simulationCategoryLabel(category.category), type: "bar", stack: "distribución", barWidth: 30, label: { show: true, formatter: (params: { value: number }) => params.value >= 6 ? `${params.value.toFixed(1)}%` : "", color: "#fff", fontSize: 10 }, itemStyle: { color: colors[index % colors.length] }, data: [{ value: category.observedPercentage, extra: { ...category, category: category.category, observed: category.observedPercentage, mean: category.simulatedMean, lower: category.lower95, upper: category.upper95, deviation: category.standardDeviation } }, { value: category.simulatedMean, extra: { ...category, category: category.category, observed: category.observedPercentage, mean: category.simulatedMean, lower: category.lower95, upper: category.upper95, deviation: category.standardDeviation } }] })) };
  }
  const ordered = categories;
  return { ...common, grid: { left: 45, right: 25, top: 20, bottom: 70 }, legend: { bottom: 8, type: "scroll" }, xAxis: { type: "category", data: ordered.map((category) => simulationCategoryLabel(category.category)), axisLabel: { interval: 0, rotate: ordered.length > 6 ? 25 : 0, formatter: (value: string) => value.length > 18 ? `${value.slice(0, 17)}…` : value } }, yAxis: { type: "value", min: 0, max: 100, axisLabel: { formatter: "{value}%" }, splitLine: { lineStyle: { color: "#e2e8f0" } } }, series: [
    { name: "Observado", type: "bar", barGap: "-75%", barWidth: "55%", itemStyle: { color: "#94a3b8" }, data: ordered.map((category) => ({ ...datum(category), value: category.observedPercentage })) },
    { name: "Escenario", type: "bar", barWidth: "35%", itemStyle: { color: "#1f6fb5" }, data: ordered.map((category) => ({ ...datum(category), value: category.simulatedMean })) },
  ] };
}

function ReplicaChart({ selected }: { selected: CategoryStat }) {
  const values = selected.replicaPercentages ?? [];
  const bins = Array.from({ length: 10 }, (_, index) => ({ label: `${index * 10}–${(index + 1) * 10}%`, value: values.filter((item) => item >= index * 10 && item < (index + 1) * 10).length }));
  const chartRef = useRef<echarts.ECharts | null>(null);
  usePrintResize(chartRef);
  return <div className="rounded-lg border border-primary/20 bg-slate-50 p-3">
    <div className="mb-2 flex items-center justify-between gap-3">
      <p className="text-xs font-semibold text-ink-900">Histograma de réplicas · {simulationCategoryLabel(selected.category)}</p>
      <span className="text-[11px] tabular-nums text-primary">Media {simulationPercent(selected.simulatedMean)}</span>
    </div>
    <ReactEChartsCore echarts={echarts} option={{ animationDuration: 250, grid: { left: 48, right: 18, top: 8, bottom: 35 }, tooltip: { trigger: "axis", confine: true, formatter: (params: unknown) => { const item = Array.isArray(params) ? params[0] as { axisValue: string; data: number } : params as { axisValue: string; data: number }; return `${item.axisValue}<br/><strong>${item.data} réplicas</strong>`; } }, xAxis: { type: "category", data: bins.map((bin) => bin.label), axisLabel: { fontSize: 10, interval: 0 } }, yAxis: { type: "value", name: "Réplicas", minInterval: 1 }, series: [{ type: "bar", data: bins.map((bin) => bin.value), itemStyle: { color: "#1f6fb5", borderRadius: [3, 3, 0, 0] } }] }} onChartReady={(chart) => { chartRef.current = chart; }} style={{ height: 185, width: "100%" }} opts={{ renderer: "svg" }} notMerge lazyUpdate />
  </div>;
}

function usePrintResize(chartRef: { current: echarts.ECharts | null }) {
  useEffect(() => {
    const resize = () => window.requestAnimationFrame(() => chartRef.current?.resize());
    window.addEventListener("beforeprint", resize);
    window.addEventListener("afterprint", resize);
    return () => {
      window.removeEventListener("beforeprint", resize);
      window.removeEventListener("afterprint", resize);
    };
  }, [chartRef]);
}
