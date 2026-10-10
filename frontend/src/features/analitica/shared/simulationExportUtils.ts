import * as XLSX from "xlsx-js-style";
import type { Simulation } from "./analyticsTypes";

export type SimulationExportData = {
  result: Simulation;
  observedTotal: number;
  variableLabel: string;
  datasetName: string;
  observedProbabilities: Record<string, number>;
  usedProbabilities: Record<string, number>;
  adjusted: boolean;
  categoryLabel: (category: string) => string;
};

function downloadFile(content: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function percent(value: number) {
  return `${value.toFixed(1).replace(".", ",")} %`;
}

function rows(data: SimulationExportData) {
  const headers = [
    "Categoría",
    "Frecuencia observada (n)",
    "% observado",
    ...(data.adjusted ? ["Probabilidad usada"] : []),
    "% simulado (media)",
    "Δ vs observado",
    "Rango 95 % de las repeticiones",
    "Desv. est. de las repeticiones",
  ];
  const body = data.result.categories.map((category) => [
    data.categoryLabel(category.category),
    String(category.observedCount),
    percent(category.observedPercentage),
    ...(data.adjusted ? [percent(data.usedProbabilities[category.category] ?? 0)] : []),
    percent(category.simulatedMean),
    `${category.simulatedMean >= category.observedPercentage ? "+" : ""}${(category.simulatedMean - category.observedPercentage).toFixed(1).replace(".", ",")} pp`,
    `[${percent(category.lower95)} – ${percent(category.upper95)}]`,
    percent(category.standardDeviation),
  ]);
  const total = ["Total", String(data.observedTotal), "100,0 %"];
  if (data.adjusted) total.push("100,0 %");
  total.push("100,0 %", "0,0 pp", "—", "—");
  return [headers, ...body, total];
}

export function exportSimulationCsv(data: SimulationExportData) {
  const csv = rows(data).map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
  downloadFile(csv, "titulados_simulacion.csv", "text/csv;charset=utf-8");
}

export function exportSimulationExcel(data: SimulationExportData) {
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows(data));
  worksheet["!cols"] = rows(data)[0].map((_, index) => ({ wch: index === 0 ? 30 : 22 }));
  XLSX.utils.book_append_sheet(workbook, worksheet, "Comparativa");
  const parameters = [
    ["Parámetro", "Valor"],
    ["Dataset", data.datasetName],
    ["Fecha de generación", new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date())],
    ["Variable", data.variableLabel],
    ["Personas simuladas (N)", String(data.result.sampleSize)],
    ["Réplicas (R)", String(data.result.repetitions)],
    ["Semilla", String(data.result.seed)],
    ["Base observada", String(data.observedTotal)],
    ["Probabilidades", data.adjusted ? "Ajustadas manualmente" : "Observadas"],
    ...data.result.categories.map((category) => [data.categoryLabel(category.category), percent(data.usedProbabilities[category.category] ?? 0)]),
    ["Método", "Monte Carlo por transformada inversa"],
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(parameters), "Parámetros");
  downloadFile(XLSX.write(workbook, { bookType: "xlsx", type: "array" }), "titulados_simulacion.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

export function exportSimulationPng(data: SimulationExportData) {
  const width = 1200;
  const left = 270;
  const plotWidth = 850;
  const rowHeight = 62;
  const top = 100;
  const height = top + Math.max(1, data.result.categories.length) * rowHeight + 50;
  const bars = data.result.categories.map((category, index) => {
    const y = top + index * rowHeight;
    const mean = Math.max(0, Math.min(100, category.simulatedMean));
    const lower = Math.max(0, Math.min(100, category.lower95));
    const upper = Math.max(lower, Math.min(100, category.upper95));
    return `<text x="${left - 14}" y="${y + 20}" text-anchor="end" font-family="Arial" font-size="14" fill="#0f172a">${escapeSvg(data.categoryLabel(category.category))}</text><line x1="${left + (lower / 100) * plotWidth}" y1="${y + 14}" x2="${left + (upper / 100) * plotWidth}" y2="${y + 14}" stroke="#0f172a" stroke-width="4"/><rect x="${left}" y="${y + 4}" width="${(mean / 100) * plotWidth}" height="20" rx="4" fill="#1f6fb5" opacity="0.78"/><circle cx="${left + (mean / 100) * plotWidth}" cy="${y + 14}" r="5" fill="#1f6fb5"/><text x="${left + plotWidth + 12}" y="${y + 20}" font-family="Arial" font-size="13" fill="#334155">${percent(mean)}</text>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="white"/><text x="30" y="30" font-family="Arial" font-size="20" font-weight="bold" fill="#0f172a">Simulación de escenarios: ${escapeSvg(data.variableLabel)}</text><text x="30" y="52" font-family="Arial" font-size="13" fill="#64748b">Media simulada y rango del 95 % · N = ${data.result.sampleSize} · R = ${data.result.repetitions}</text><rect x="30" y="72" width="14" height="14" fill="#1f6fb5"/><text x="52" y="84" font-family="Arial" font-size="12" fill="#334155">Media estimada</text><line x1="180" y1="79" x2="205" y2="79" stroke="#0f172a" stroke-width="4"/><text x="213" y="84" font-family="Arial" font-size="12" fill="#334155">Rango 95 %</text>${bars}</svg>`;
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(image, 0, 0);
    canvas.toBlob((blob) => blob && downloadFile(blob, "titulados_simulacion.png", "image/png"));
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeSvg(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
