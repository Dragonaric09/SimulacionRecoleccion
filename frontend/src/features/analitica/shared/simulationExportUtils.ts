import type { Simulation, SimulationComparison } from "./analyticsTypes";
import { createSimulationChartSvg, createSimulationHistogramSvgs, simulationChartUsesBoxplot, simulationChartUsesPie } from "../simulation/SimulationECharts";
import { simulationDelta } from "../simulation/simulationUtils";

export type SimulationExportData = {
  result: Simulation;
  observedTotal: number;
  variableLabel: string;
  datasetName: string;
  observedProbabilities: Record<string, number>;
  usedProbabilities: Record<string, number>;
  /** Percentages configured for the scenario, when they differ from observed. */
  scenarioPercentages?: Record<string, number> | null;
  adjusted: boolean;
  categoryLabel: (category: string) => string;
  segment?: string;
  variable?: string;
  /** Escenario ajustado contra el base con la misma semilla, cuando hay ajustes. */
  comparison?: SimulationComparison | null;
};

type PdfMakeModule = typeof import("pdfmake/build/pdfmake");
type PdfVfsModule = typeof import("pdfmake/build/vfs_fonts");
let pdfMakeReady: Promise<{ pdfMake: PdfMakeModule["default"]; vfs: PdfVfsModule["default"] }> | null = null;
const chartSvgCache = new WeakMap<Simulation, Map<string, Promise<string>>>();
const histogramSvgCache = new WeakMap<Simulation, Map<string, Promise<string[]>>>();

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
export function preloadSimulationPdf(data?: SimulationExportData) {
  void loadPdfMake();
  if (!data) return;
  void getCachedChartSvg(data.result, data.variable);
  if (simulationChartUsesBoxplot(data.result, data.variable)) void getCachedHistogramSvgs(data.result, data.variable);
}

function getCachedChartSvg(result: Simulation, variable?: string) {
  const key = variable ?? "";
  let entries = chartSvgCache.get(result);
  if (!entries) {
    entries = new Map();
    chartSvgCache.set(result, entries);
  }
  const existing = entries.get(key);
  if (existing) return existing;
  const pending = createSimulationChartSvg(result, variable);
  entries.set(key, pending);
  return pending;
}

function getCachedHistogramSvgs(result: Simulation, variable?: string) {
  const key = variable ?? "";
  let entries = histogramSvgCache.get(result);
  if (!entries) {
    entries = new Map();
    histogramSvgCache.set(result, entries);
  }
  const existing = entries.get(key);
  if (existing) return existing;
  const categories = result.categories.filter((category) => (category.replicaPercentages?.length ?? 0) > 0);
  const pending = createSimulationHistogramSvgs(categories);
  entries.set(key, pending);
  return pending;
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

function exportSegmentLabel(value?: string) {
  const normalized = value?.trim();
  return !normalized || normalized.toLowerCase() === "all" ? "Todos" : normalized;
}

function rows(data: SimulationExportData) {
  const hasScenarioPercentages = data.scenarioPercentages != null;
  const headers = [
    "Categoría",
    "Frecuencia observada (n)",
    "% observado",
    ...(hasScenarioPercentages ? ["Probabilidad usada"] : []),
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
    ...(hasScenarioPercentages ? [percent(data.scenarioPercentages?.[category.category] ?? 0)] : []),
    percent(category.simulatedMean),
    percent(category.median ?? category.simulatedMean),
    simulationDelta(category.simulatedMean, category.observedPercentage),
    `[${percent(category.lower95)} – ${percent(category.upper95)}]`,
    category.standardDeviation == null ? "—" : percent(category.standardDeviation),
  ]);
  const observedTotal = data.result.categories.reduce((sum, category) => sum + category.observedCount, 0);
  const total = ["Total", String(observedTotal), "100,0 %"];
  if (hasScenarioPercentages) total.push("100,0 %");
  total.push("100,0 %", "—", "0,0 pp", "—", "—");
  return [headers, ...body, total];
}

function points(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1).replace(".", ",")} pp`;
}

/** Escenario contra base con réplicas emparejadas; vacío cuando no hay ajustes. */
function againstBaseRows(data: SimulationExportData) {
  const comparison = data.comparison;
  if (!comparison) return [];
  return [
    ["Categoría", "Base (media)", "Escenario (media)", "Δ media", "Rango 95 % de Δ", "Réplicas en que sube", "Réplicas en que baja"],
    ...comparison.differences.map((difference, index) => [
      data.categoryLabel(difference.category),
      percent(comparison.base.categories[index]?.simulatedMean ?? 0),
      percent(comparison.scenario.categories[index]?.simulatedMean ?? 0),
      points(difference.meanDifference),
      `[${points(difference.lower95)} ; ${points(difference.upper95)}]`,
      percent(difference.shareHigher),
      percent(difference.shareLower),
    ]),
  ];
}

const COMPARISON_NOTE = "Base y escenario se simulan con la misma semilla (números aleatorios comunes): cada réplica del escenario se compara con la misma réplica del base. Si el rango de Δ no incluye el 0, el cambio aparece en casi todas las réplicas.";

export function exportSimulationCsv(data: SimulationExportData) {
  const metadata = [
    ["Variable", data.variableLabel],
    ["Segmento", exportSegmentLabel(data.segment)],
    ["Semilla", String(data.result.seed)],
    ["N", String(data.result.sampleSize)],
    ["Réplicas", String(data.result.repetitions)],
    ["Ajustes", data.adjusted ? "Personalizados" : "Observado"],
    [],
  ];
  const csv = "\uFEFF" + [...metadata, ...rows(data)].map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\r\n");
  downloadFile(csv, "titulados_simulacion.csv", "text/csv;charset=utf-8");
}

export async function exportSimulationExcel(data: SimulationExportData) {
  const XLSX = await import("xlsx-js-style");
  const workbook = XLSX.utils.book_new();
  const comparisonRows = rows(data);
  const worksheet = XLSX.utils.aoa_to_sheet(comparisonRows);
  worksheet["!cols"] = comparisonRows[0].map((header, index) => ({ wch: index === 0 ? Math.max(28, header.length + 2) : Math.min(30, Math.max(16, header.length + 2)) }));
  worksheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  worksheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: comparisonRows.length - 1, c: comparisonRows[0].length - 1 } }) };
  comparisonRows.forEach((row, rowIndex) => row.forEach((_, columnIndex) => {
    const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
    const isHeader = rowIndex === 0;
    const isTotal = rowIndex === comparisonRows.length - 1;
    worksheet[address].s = {
      fill: { fgColor: { rgb: isHeader ? "E2E8F0" : isTotal ? "F1F5F9" : "FFFFFF" } },
      font: { bold: isHeader || isTotal, color: "172033" },
      alignment: { horizontal: columnIndex === 0 ? "left" : "right", vertical: "center", wrapText: isHeader },
    };
  }));
  XLSX.utils.book_append_sheet(workbook, worksheet, "Comparativa");
  const againstBase = againstBaseRows(data);
  if (againstBase.length > 0) {
    const sheet = XLSX.utils.aoa_to_sheet([...againstBase, [], [COMPARISON_NOTE]]);
    sheet["!cols"] = againstBase[0].map((header, index) => ({ wch: index === 0 ? 28 : Math.max(16, header.length + 2) }));
    againstBase.forEach((row, rowIndex) => row.forEach((_, columnIndex) => {
      sheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })].s = {
        fill: { fgColor: { rgb: rowIndex === 0 ? "E2E8F0" : "FFFFFF" } },
        font: { bold: rowIndex === 0, color: "172033" },
        alignment: { horizontal: columnIndex === 0 ? "left" : "right", vertical: "center", wrapText: rowIndex === 0 },
      };
    }));
    XLSX.utils.book_append_sheet(workbook, sheet, "Contra base");
  }
  const hasScenarioPercentages = data.scenarioPercentages != null;
  const parameters = [
    ["Parámetro", "Valor"],
    ["Dataset", data.datasetName],
    ["Fecha de generación", new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date())],
    ["Variable", data.variableLabel],
    ["Segmento", exportSegmentLabel(data.segment)],
    ["Personas simuladas (N)", String(data.result.sampleSize)],
    ["Réplicas (R)", String(data.result.repetitions)],
    ["Semilla", String(data.result.seed)],
    ["Base observada", String(data.observedTotal)],
    ["Probabilidades", data.adjusted ? "Ajustadas manualmente" : "Observadas"],
    ...data.result.categories.map((category) => [data.categoryLabel(category.category), percent(hasScenarioPercentages ? data.scenarioPercentages?.[category.category] ?? 0 : (data.usedProbabilities[category.category] ?? 0) * 100)]),
    ["Método", "Monte Carlo por transformada inversa"],
  ];
  const parameterSheet = XLSX.utils.aoa_to_sheet(parameters);
  parameterSheet["!cols"] = [{ wch: 28 }, { wch: 42 }];
  parameters.forEach((row, rowIndex) => row.forEach((_, columnIndex) => {
    const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
    parameterSheet[address].s = {
      fill: { fgColor: { rgb: rowIndex === 0 ? "E2E8F0" : "FFFFFF" } },
      font: { bold: rowIndex === 0, color: "172033" },
      alignment: { vertical: "center", wrapText: true },
    };
  }));
  parameterSheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(workbook, parameterSheet, "Parámetros");
  downloadFile(XLSX.write(workbook, { bookType: "xlsx", type: "array" }), "titulados_simulacion.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

async function createSimulationPdf(data: SimulationExportData) {
  const { pdfMake } = await loadPdfMake();
  const categories = data.result.categories;
  const segmentLabel = exportSegmentLabel(data.segment);
  const isPie = simulationChartUsesPie(data.result, data.variable);
  const isBoxplot = simulationChartUsesBoxplot(data.result, data.variable);
  // Usamos el SVG string generado por ECharts. En pdfmake 0.3.x esta ruta
  // conserva los <text> de las etiquetas sin depender del CSS del DOM.
  const chartSvg = await getCachedChartSvg(data.result, data.variable);
  const histogramCategories = isBoxplot ? categories.filter((category) => (category.replicaPercentages?.length ?? 0) > 0) : [];
  const histogramSvgs = isBoxplot ? await getCachedHistogramSvgs(data.result, data.variable) : [];
  const hasScenarioPercentages = data.scenarioPercentages != null;
  const observedTotal = categories.reduce((sum, category) => sum + category.observedCount, 0);
  const text = (value: string, style?: string) => style ? { text: value, style } : value;
  const probabilityRows = categories.map((category) => [
    data.categoryLabel(category.category),
    `${percent((data.observedProbabilities[category.category] ?? 0) * 100)}${hasScenarioPercentages ? ` → ${percent(data.scenarioPercentages?.[category.category] ?? 0)}` : ""}`,
  ]);
  const tableBody = [
    ["Categoría", "Frecuencia observada (n)", "% observado", ...(hasScenarioPercentages ? ["Probabilidad usada"] : []), "% simulado (media)", "Mediana de réplicas", "Δ vs observado", "Rango 95 % de repeticiones", "Desv. est. de las repeticiones"].map((value) => text(value, "tableHeader")),
    ...categories.map((category) => [
      data.categoryLabel(category.category), String(category.observedCount), percent(category.observedPercentage),
      ...(hasScenarioPercentages ? [percent(data.scenarioPercentages?.[category.category] ?? 0)] : []),
      percent(category.simulatedMean), percent(category.median ?? category.simulatedMean), simulationDelta(category.simulatedMean, category.observedPercentage),
      `[${percent(category.lower95)} – ${percent(category.upper95)}]`, category.standardDeviation == null ? "—" : percent(category.standardDeviation),
    ]),
    [text("Total", "tableTotal"), text(String(observedTotal), "tableTotal"), text("100,0 %", "tableTotal"), ...(hasScenarioPercentages ? [text("100,0 %", "tableTotal")] : []), text("100,0 %", "tableTotal"), text("—", "tableTotal"), text("0,0 pp", "tableTotal"), text("—", "tableTotal"), text("—", "tableTotal")],
  ];
  const pieHeadings = isPie ? {
    columns: [
      { text: "Observado", style: "panelTitle", alignment: "center" },
      { text: "Escenario", style: "panelTitle", alignment: "center" },
    ],
    columnGap: 32,
    margin: [0, 0, 0, 2],
  } : null;
  const histogramBlock = (index: number) => {
    const category = histogramCategories[index];
    return {
      unbreakable: true,
      stack: [
        text(`Histograma de réplicas · ${data.categoryLabel(category.category)}`, "panelTitle"),
        { svg: histogramSvgs[index], fit: [360, 150], alignment: "center" },
        text(`Media simulada: ${percent(category.simulatedMean)} · Observado: ${percent(category.observedPercentage)} · Rango 95 %: [${percent(category.lower95)} – ${percent(category.upper95)}]`, "note"),
      ],
    };
  };
  const histogramRows = [];
  for (let index = 0; index < histogramSvgs.length; index += 2) {
    const columns = [histogramBlock(index)];
    if (index + 1 < histogramSvgs.length) columns.push(histogramBlock(index + 1));
    histogramRows.push({ columns, columnGap: 16, unbreakable: true });
  }
  const againstBase = againstBaseRows(data);
  const comparisonBlock = againstBase.length > 0 ? [
    { text: "Escenario contra base", style: "title", margin: [0, 18, 0, 5] },
    text("Diferencia escenario − base por categoría, con los mismos sorteos en ambos.", "subtitle"),
    { table: { headerRows: 1, dontBreakRows: true, widths: ["*", 70, 70, 60, 120, 80, 80], body: againstBase.map((row, rowIndex) => rowIndex === 0 ? row.map((value) => text(value, "tableHeader")) : row) }, layout: "lightHorizontalLines" },
    text(COMPARISON_NOTE, "note"),
  ] : [];
  const probabilityHeader = [text(`Probabilidades ${hasScenarioPercentages ? "observadas y usadas" : "observadas"}`, "panelTitle"), ""];
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
      tableHeader: { bold: true, fontSize: 7, fillColor: "#e2e8f0" },
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
      { unbreakable: true, stack: [text("Observado contra escenario", "panelTitle"), text("Distribución con media simulada y rango del 95 % de las réplicas.", "subtitle"), ...(pieHeadings ? [pieHeadings] : []), { svg: chartSvg, fit: [780, isBoxplot ? 340 : isPie ? 285 : 260], alignment: "center" }] },
      { text: "Tabla comparativa", style: "title", pageBreak: "before" },
      text("Frecuencias, diferencias, medianas y rangos de todas las categorías.", "subtitle"),
      { table: { headerRows: 1, dontBreakRows: true, widths: ["*", 58, 58, ...(hasScenarioPercentages ? [70] : []), 66, 66, 64, 108, 70], body: tableBody }, layout: "lightHorizontalLines" },
      { text: ["El rango del 95 % va del percentil 2,5 al 97,5 de las réplicas: ahí cayó el 95 % central de los resultados simulados. No es un intervalo de confianza.\n", `Semilla: ${data.result.seed}. Permite repetir exactamente el resultado.`], style: "note" },
      ...comparisonBlock,
      ...(histogramRows.length > 0 ? [
        { text: "Distribución de réplicas", style: "title", margin: [0, 18, 0, 5] },
        text("Detalle de las réplicas simuladas para cada categoría del boxplot.", "subtitle"),
        ...histogramRows,
      ] : []),
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

export async function exportSimulationPng(data: SimulationExportData) {
  const svg = await getCachedChartSvg(data.result, data.variable);
  const width = Number(svg.match(/\bwidth="([\d.]+)/)?.[1] ?? 1100);
  const height = Number(svg.match(/\bheight="([\d.]+)/)?.[1] ?? 500);
  const scale = 2;
  const imageUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("No se pudo convertir el SVG de ECharts a PNG."));
      element.src = imageUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("El navegador no dispone de un contexto Canvas para exportar el PNG.");
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error("No se pudo crear el archivo PNG.")), "image/png");
    });
    downloadFile(blob, "titulados_simulacion.png", "image/png");
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
