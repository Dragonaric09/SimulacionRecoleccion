import * as XLSX from "xlsx-js-style";
import type { Simulation } from "./analyticsTypes";
import { createSimulationChartSvg, simulationChartUsesPie } from "../simulation/SimulationECharts";
import { simulationDelta } from "../simulation/simulationUtils";

export type SimulationExportData = {
  result: Simulation;
  observedTotal: number;
  variableLabel: string;
  datasetName: string;
  observedProbabilities: Record<string, number>;
  usedProbabilities: Record<string, number>;
  adjusted: boolean;
  categoryLabel: (category: string) => string;
  segment?: string;
  variable?: string;
};

type PdfMakeModule = typeof import("pdfmake/build/pdfmake");
type PdfVfsModule = typeof import("pdfmake/build/vfs_fonts");
let pdfMakeReady: Promise<{ pdfMake: PdfMakeModule["default"]; vfs: PdfVfsModule["default"] }> | null = null;

function loadPdfMake() {
  if (!pdfMakeReady) {
    pdfMakeReady = Promise.all([
      import("pdfmake/build/pdfmake"),
      import("pdfmake/build/vfs_fonts"),
    ]).then(([pdfMakeModule, vfsModule]) => {
      const pdfMake = pdfMakeModule.default;
      pdfMake.addVirtualFileSystem(vfsModule.default);
      return { pdfMake, vfs: vfsModule.default };
    });
  }
  return pdfMakeReady;
}

/** Precarga los módulos pesados para que la primera previsualización no espere su descarga. */
export function preloadSimulationPdf() {
  void loadPdfMake();
}

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
    "Mediana de réplicas",
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
    percent(category.median ?? category.simulatedMean),
    `${category.simulatedMean >= category.observedPercentage ? "+" : ""}${(category.simulatedMean - category.observedPercentage).toFixed(1).replace(".", ",")} pp`,
    `[${percent(category.lower95)} – ${percent(category.upper95)}]`,
    percent(category.standardDeviation),
  ]);
  const total = ["Total", String(data.observedTotal), "100,0 %"];
  if (data.adjusted) total.push("100,0 %");
  total.push("100,0 %", "—", "0,0 pp", "—", "—");
  return [headers, ...body, total];
}

export function exportSimulationCsv(data: SimulationExportData) {
  const metadata = [
    ["Variable", data.variableLabel],
    ["Segmento", data.segment ?? "Todos"],
    ["Semilla", String(data.result.seed)],
    ["N", String(data.result.sampleSize)],
    ["Réplicas", String(data.result.repetitions)],
    ["Ajustes", data.adjusted ? "Personalizados" : "Observado"],
    [],
  ];
  const csv = [...metadata, ...rows(data)].map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
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
    ["Segmento", data.segment ?? "Todos"],
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

async function createSimulationPdf(data: SimulationExportData) {
  const { pdfMake } = await loadPdfMake();
  const categories = data.result.categories;
  const segmentLabel = data.segment && data.segment.toLowerCase() !== "all" ? data.segment : "Todos";
  const isPie = simulationChartUsesPie(data.result, data.variable);
  // Usamos el SVG string generado por ECharts. En pdfmake 0.3.x esta ruta
  // conserva los <text> de las etiquetas sin depender del CSS del DOM.
  const chartSvg = await createSimulationChartSvg(data.result, data.variable);
  const text = (value: string, style?: string) => style ? { text: value, style } : value;
  const probabilityRows = categories.map((category) => [
    data.categoryLabel(category.category),
    `${percent((data.observedProbabilities[category.category] ?? 0) * 100)}${data.adjusted ? ` → ${percent((data.usedProbabilities[category.category] ?? 0) * 100)}` : ""}`,
  ]);
  const tableBody = [
    ["Categoría", "Obs. n", "% obs.", ...(data.adjusted ? ["Prob. usada"] : []), "Media", "Mediana", "Diferencia", "Rango 95 %", "Desv. est."].map((value) => text(value, "tableHeader")),
    ...categories.map((category) => [
      data.categoryLabel(category.category), String(category.observedCount), percent(category.observedPercentage),
      ...(data.adjusted ? [percent((data.usedProbabilities[category.category] ?? 0) * 100)] : []),
      percent(category.simulatedMean), percent(category.median ?? category.simulatedMean), simulationDelta(category.simulatedMean, category.observedPercentage),
      `[${percent(category.lower95)} - ${percent(category.upper95)}]`, percent(category.standardDeviation),
    ]),
    [text("Total", "tableTotal"), text(String(data.observedTotal), "tableTotal"), text("100,0 %", "tableTotal"), ...(data.adjusted ? [text("100,0 %", "tableTotal")] : []), text("100,0 %", "tableTotal"), text("—", "tableTotal"), text("0,0 pp", "tableTotal"), text("—", "tableTotal"), text("—", "tableTotal")],
  ];
  const pieHeadings = isPie ? {
    columns: [
      { text: "Observado", style: "panelTitle", alignment: "center" },
      { text: "Escenario", style: "panelTitle", alignment: "center" },
    ],
    columnGap: 32,
    margin: [0, 0, 0, 2],
  } : null;
  const probabilityHeader = [text(`Probabilidades ${data.adjusted ? "observadas y usadas" : "observadas"}`, "panelTitle"), ""];
  const definition = {
    info: { title: `Simulación de escenarios: ${data.variableLabel}`, author: "Simulación" },
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [28, 28, 28, 28],
    defaultStyle: { font: "Roboto", fontSize: 8, color: "#172033" },
    styles: {
      title: { fontSize: 20, bold: true, margin: [0, 0, 0, 5] },
      subtitle: { fontSize: 9, color: "#52627a", margin: [0, 0, 0, 12] },
      warning: { fontSize: 9, bold: true, color: "#9a3412", margin: [0, 0, 0, 10] },
      panelTitle: { fontSize: 11, bold: true, margin: [0, 0, 0, 7] },
      tableHeader: { bold: true, fillColor: "#e2e8f0" },
      tableTotal: { bold: true, fillColor: "#f1f5f9" },
      note: { fontSize: 8, color: "#52627a", margin: [0, 10, 0, 0] },
    },
    footer: (currentPage: number, pageCount: number) => ({ text: `Página ${currentPage} de ${pageCount}`, alignment: "right", fontSize: 7, color: "#64748b", margin: [28, 0, 28, 12] }),
    content: [
      text(`Simulación de escenarios: ${data.variableLabel}`, "title"),
      text(`Dataset: ${data.datasetName} · Generado: ${new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", dateStyle: "short" }).format(new Date())}`, "subtitle"),
      text("Escenario hipotético, no es una predicción", "warning"),
      { table: { widths: ["auto", "auto", "auto", "auto", "auto", "*"] , body: [["Variable", data.variableLabel, "Segmento", segmentLabel, "N / Réplicas", `${data.result.sampleSize} / ${data.result.repetitions}`], ["Semilla", String(data.result.seed), "Ajustes", data.adjusted ? "Personalizados" : "Observados", "Método", "Monte Carlo por transformada inversa"]] }, layout: "lightHorizontalLines", margin: [0, 0, 0, 10] },
      { table: { widths: ["*", "auto"], body: [probabilityHeader, ...probabilityRows] }, layout: "lightHorizontalLines", margin: [0, 0, 0, 10] },
      { unbreakable: true, stack: [text("Observado contra escenario", "panelTitle"), text("Distribución con media simulada y rango del 95 % de las réplicas.", "subtitle"), ...(pieHeadings ? [pieHeadings] : []), { svg: chartSvg, fit: [780, isPie ? 285 : 300], alignment: "center" }] },
      { text: "Tabla comparativa", style: "title", pageBreak: "before" },
      text("Frecuencias, diferencias, medianas y rangos de todas las categorías.", "subtitle"),
      { table: { headerRows: 1, dontBreakRows: true, widths: ["*", 42, 48, ...(data.adjusted ? [58] : []), 52, 52, 58, 92, 55], body: tableBody }, layout: "lightHorizontalLines" },
      { text: ["El rango del 95 % es el intervalo en que cayeron el 95 % de las réplicas. No es un intervalo de confianza.\n", `Semilla: ${data.result.seed}. Permite repetir exactamente el resultado.`], style: "note" },
      { text: "Cómo funciona", style: "title", margin: [0, 18, 0, 5], pageBreakBefore: (currentNode: { startPosition?: { verticalRatio?: number } }) => Boolean(currentNode.startPosition && (currentNode.startPosition.verticalRatio ?? 0) > 0.55) },
      text("Transformada inversa y primeros sorteos.", "subtitle"),
      { columns: [{ width: "50%", stack: [text("Probabilidad acumulada", "panelTitle"), ...(data.result.cumulativeProbabilities ?? []).map((end, index) => ({ columns: [data.categoryLabel(categories[index]?.category ?? ""), `${percent(end * 100)}`], margin: [0, 0, 0, 4] }))] }, { width: "50%", stack: [text("Primeros 10 números aleatorios", "panelTitle"), { columns: Array.from({ length: 2 }, (_, column) => (data.result.firstDraws ?? []).filter((_, index) => index % 2 === column).map((draw, index) => ({ text: `${index * 2 + column + 1}. ${draw.random.toFixed(2)} -> ${data.categoryLabel(draw.category)}`, margin: [0, 0, 0, 4] }))) }] }], columnGap: 24, unbreakable: true },
    ],
  };
  return pdfMake.createPdf(definition);
}

export async function buildSimulationPdf(data: SimulationExportData) {
  const document = await createSimulationPdf(data);
  return document.getBlob();
}

export async function openSimulationPdf(data: SimulationExportData, targetWindow: Window) {
  const document = await createSimulationPdf(data);
  await document.open(targetWindow);
}

export async function exportSimulationPdf(data: SimulationExportData) {
  const blob = await buildSimulationPdf(data);
  downloadFile(blob, "titulados_simulacion.pdf", "application/pdf");
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
    const observed = Math.max(0, Math.min(100, category.observedPercentage));
    const median = Math.max(0, Math.min(100, category.median ?? mean));
    return `<text x="${left - 14}" y="${y + 20}" text-anchor="end" font-family="Arial" font-size="14" fill="#0f172a">${escapeSvg(data.categoryLabel(category.category))}</text><line x1="${left + (lower / 100) * plotWidth}" y1="${y + 14}" x2="${left + (upper / 100) * plotWidth}" y2="${y + 14}" stroke="#0f172a" stroke-width="4"/><rect x="${left + (category.firstQuartile ?? lower) / 100 * plotWidth}" y="${y + 4}" width="${Math.max(2, ((category.thirdQuartile ?? upper) - (category.firstQuartile ?? lower)) / 100 * plotWidth)}" height="20" rx="2" fill="#dbeafe" stroke="#1f6fb5"/><line x1="${left + (median / 100) * plotWidth}" y1="${y + 4}" x2="${left + (median / 100) * plotWidth}" y2="${y + 24}" stroke="#1f6fb5" stroke-width="2"/><line x1="${left + (observed / 100) * plotWidth}" y1="${y + 1}" x2="${left + (observed / 100) * plotWidth}" y2="${y + 27}" stroke="#64748b" stroke-width="2"/><circle cx="${left + (mean / 100) * plotWidth}" cy="${y + 14}" r="5" fill="#1f6fb5"/><text x="${left + plotWidth + 12}" y="${y + 20}" font-family="Arial" font-size="13" fill="#334155">${percent(mean)}</text>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="white"/><text x="30" y="30" font-family="Arial" font-size="20" font-weight="bold" fill="#0f172a">Simulación de escenarios: ${escapeSvg(data.variableLabel)}</text><text x="30" y="52" font-family="Arial" font-size="13" fill="#64748b">Segmento: ${escapeSvg(data.segment ?? "Todos")} · N = ${data.result.sampleSize} · R = ${data.result.repetitions} · Semilla = ${data.result.seed} · Ajustes: ${data.adjusted ? "personalizados" : "observados"}</text><rect x="30" y="72" width="14" height="14" fill="#1f6fb5"/><text x="52" y="84" font-family="Arial" font-size="12" fill="#334155">Media simulada</text><line x1="180" y1="79" x2="205" y2="79" stroke="#64748b" stroke-width="2"/><text x="213" y="84" font-family="Arial" font-size="12" fill="#334155">Observado</text><line x1="290" y1="79" x2="315" y2="79" stroke="#0f172a" stroke-width="4"/><text x="323" y="84" font-family="Arial" font-size="12" fill="#334155">Rango 95 %</text><line x1="430" y1="72" x2="430" y2="86" stroke="#1f6fb5" stroke-width="2"/><text x="440" y="84" font-family="Arial" font-size="12" fill="#334155">Mediana</text>${bars}</svg>`;
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
