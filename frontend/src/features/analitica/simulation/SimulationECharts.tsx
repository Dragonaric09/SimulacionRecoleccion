import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart, BoxplotChart, PieChart } from "echarts/charts";
import { GridComponent, LegendComponent, MarkPointComponent, TitleComponent, TooltipComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { Simulation } from "../shared/analyticsTypes";
import { simulationCategoryLabel, simulationDelta, simulationPercent } from "./simulationUtils";

echarts.use([BarChart, BoxplotChart, PieChart, GridComponent, LegendComponent, MarkPointComponent, TitleComponent, TooltipComponent, SVGRenderer]);

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
  const option = buildOption(kind, result);
  const onEvents = { click: (params: { name?: string; data?: ChartDatum }) => { const raw = params.data?.extra?.category ?? result.categories.find((category) => simulationCategoryLabel(category.category) === params.name)?.category; if (raw) onSelect(raw === selectedCategory ? null : raw); } };
  return <div className="space-y-3">
    <ReactEChartsCore echarts={echarts} option={option} onEvents={onEvents} style={{ height: kind === "pie" || kind === "boolean" ? 270 : 310, width: "100%" }} opts={{ renderer: "svg" }} notMerge lazyUpdate />
    {selected && <ReplicaChart selected={selected} />}
  </div>;
}

function kindFor(variable: string | undefined, result: Simulation) {
  if (["sector_trabajo", "situacion_laboral_actual"].includes(variable ?? "")) return "unordered";
  const labels = result.categories.map((item) => item.category.toLowerCase());
  if (labels.some((label) => label.includes("satisf") || label.includes("concord") || label.includes("muy de acuerdo"))) return "scale";
  if (labels.every((label) => ["true", "false", "sí", "si", "no"].includes(label))) return "boolean";
  if (result.categories.length <= 5) return "pie";
  return "ordered";
}

function tooltipFormatter(params: unknown) {
  const item = Array.isArray(params) ? params[0] as { data?: ChartDatum; value?: unknown } : params as { data?: ChartDatum; value?: unknown };
  const data = item?.data?.extra;
  if (!data) return "";
  return `<strong>${simulationCategoryLabel(data.category)}</strong><br/>Observado: ${simulationPercent(data.observed)}<br/>Media simulada: ${simulationPercent(data.mean)}<br/>Rango 95 %: ${simulationPercent(data.lower)} – ${simulationPercent(data.upper)}<br/>Desviación: ${simulationPercent(data.deviation)}<br/>Diferencia: ${simulationDelta(data.mean, data.observed)}`;
}

type CategoryStat = Simulation["categories"][number];
type ChartDatum = { value?: unknown; name?: string; extra?: CategoryStat & { category: string; observed: number; mean: number; lower: number; upper: number; deviation: number } };

function datum(category: CategoryStat): ChartDatum {
  return { name: simulationCategoryLabel(category.category), value: category.simulatedMean, extra: { ...category, category: category.category, observed: category.observedPercentage, mean: category.simulatedMean, lower: category.lower95, upper: category.upper95, deviation: category.standardDeviation } };
}

function buildOption(kind: string, result: Simulation) {
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
    return { ...common, grid: { left: 125, right: 30, top: 20, bottom: 45 }, xAxis: { type: "value", min: 0, max: 100, axisLabel: { formatter: "{value}%" }, splitLine: { lineStyle: { color: "#e2e8f0" } } }, yAxis: { type: "category", inverse: true, data: ordered.map((category) => simulationCategoryLabel(category.category)) }, series: [{ name: "Caja y bigotes", type: "boxplot", boxWidth: [12, 28], data: ordered.map((category) => [category.lower95, category.firstQuartile ?? category.lower95, category.median ?? category.simulatedMean, category.thirdQuartile ?? category.upper95, category.upper95]), itemStyle: { color: "#dbeafe", borderColor: "#1f6fb5" }, markPoint: { data: ordered.map((category) => ({ coord: [category.simulatedMean, simulationCategoryLabel(category.category)], value: category.simulatedMean, itemStyle: { color: "#1f6fb5" } })) } }] };
  }
  const ordered = kind === "ordered" ? categories : categories;
  return { ...common, grid: { left: 45, right: 25, top: 20, bottom: 60 }, legend: { bottom: 8 }, xAxis: { type: "category", data: ordered.map((category) => simulationCategoryLabel(category.category)), axisLabel: { interval: 0, rotate: ordered.length > 6 ? 25 : 0 } }, yAxis: { type: "value", min: 0, max: 100, axisLabel: { formatter: "{value}%" }, splitLine: { lineStyle: { color: "#e2e8f0" } } }, series: [
    { name: "Observado", type: "bar", barGap: "-75%", barWidth: "55%", itemStyle: { color: "#94a3b8" }, data: ordered.map((category) => ({ ...datum(category), value: category.observedPercentage })) },
    { name: "Escenario", type: "bar", barWidth: "35%", itemStyle: { color: "#1f6fb5" }, data: ordered.map((category) => ({ ...datum(category), value: category.simulatedMean })) },
  ] };
}

function ReplicaChart({ selected }: { selected: CategoryStat }) {
  const values = selected.replicaPercentages ?? [];
  const bins = Array.from({ length: 10 }, (_, index) => ({ label: `${index * 10}–${(index + 1) * 10}%`, value: values.filter((item) => item >= index * 10 && item < (index + 1) * 10).length }));
  return <div className="rounded-lg border border-primary/20 bg-slate-50 p-2"><ReactEChartsCore echarts={echarts} option={{ animationDuration: 250, grid: { left: 40, right: 20, top: 35, bottom: 35 }, title: { text: `Réplicas · ${simulationCategoryLabel(selected.category)}`, textStyle: { fontSize: 12, fontWeight: 600 }, left: 8, top: 6 }, tooltip: { trigger: "axis", confine: true, formatter: (params: unknown) => { const item = Array.isArray(params) ? params[0] as { axisValue: string; data: number } : params as { axisValue: string; data: number }; return `${item.axisValue}<br/><strong>${item.data} réplicas</strong>`; } }, xAxis: { type: "category", data: bins.map((bin) => bin.label), axisLabel: { fontSize: 10 } }, yAxis: { type: "value", name: "Réplicas", minInterval: 1 }, series: [{ type: "bar", data: bins.map((bin) => bin.value), itemStyle: { color: "#1f6fb5", borderRadius: [3, 3, 0, 0] } }] }} style={{ height: 190, width: "100%" }} opts={{ renderer: "svg" }} notMerge lazyUpdate /></div>;
}
