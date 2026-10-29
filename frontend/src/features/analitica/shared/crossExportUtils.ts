import type { Cross, CrossMetric } from "./analyticsTypes";

type CrossExportParameters = {
  dataset?: string;
  filters?: string;
};

/** Paleta categórica de los cruces (pantalla y exportaciones); se repite a partir de la duodécima categoría. */
export const CROSS_COLORS = [
  "#1f6fb5", "#ed552f", "#18a39a", "#8b5bd1", "#e0a100", "#173f67",
  "#7db1dd", "#c2417a", "#5a8f29", "#9a6a3a", "#4f5d75", "#f29e8e",
];

/** Umbral de |residuo ajustado| que se considera notable (≈ 5 % bilateral). */
export const RESIDUAL_THRESHOLD = 1.96;

export function booleanLabel(value: string) {
  if (value.toLowerCase() === "true") return "Sí";
  if (value.toLowerCase() === "false") return "No";
  const collapsed = value.trim().replace(/\s+/g, " ");
  if (!collapsed) return collapsed;
  // Solo se pasa a oración un texto escrito en mayúsculas; uno ya redactado conserva sus siglas («(TI)»).
  const normalized = collapsed === collapsed.toLocaleUpperCase("es-BO") ? collapsed.toLocaleLowerCase("es-BO") : collapsed;
  const sentence = normalized.charAt(0).toLocaleUpperCase("es-BO") + normalized.slice(1);
  return sentence.replace(/\bia\b/gi, "IA").replace(/\bdevops\b/gi, "DevOps").replace(/\b(modular|presencial|virtual)\(/gi, "$1 (");
}

export function crossMetricLabel(metric: CrossMetric) {
  if (metric === "rowPercent") return "valores en % por fila";
  if (metric === "columnPercent") return "valores en % por columna";
  if (metric === "residual") return "residuos ajustados";
  return "conteos";
}

function rowSum(cross: Cross, row: string) {
  return cross.columnCategories.reduce((sum, column) => sum + (cross.counts[row]?.[column] ?? 0), 0);
}

function columnSum(cross: Cross, column: string) {
  return cross.rowCategories.reduce((sum, row) => sum + (cross.counts[row]?.[column] ?? 0), 0);
}

/**
 * Residuo estandarizado ajustado de Haberman: (O − E) / √(E·(1 − fila/n)·(1 − columna/n)). Positivo: la
 * combinación aparece más de lo esperado si las variables fueran independientes; negativo, menos.
 */
export function crossResidual(cross: Cross, row: string, column: string) {
  if (cross.multipleResponse) return 0;
  const n = cross.rowCategories.reduce((sum, current) => sum + rowSum(cross, current), 0);
  const rowTotal = rowSum(cross, row);
  const columnTotal = columnSum(cross, column);
  if (!n || !rowTotal || !columnTotal) return 0;
  const expected = (rowTotal * columnTotal) / n;
  const variance = expected * (1 - rowTotal / n) * (1 - columnTotal / n);
  return variance > 0 ? ((cross.counts[row]?.[column] ?? 0) - expected) / Math.sqrt(variance) : 0;
}

export function formatResidual(value: number) {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(2).replace(".", ",")}`;
}

export type CrossBarSeries = { label: string; categories: string[] };

/** Resume la vista cuando el cruce tiene muchas categorías; respuestas múltiples conservan cada opción. */
export function crossBarSeries(cross: Cross, maxVisible = 5): CrossBarSeries[] {
  if (cross.multipleResponse) return cross.columnCategories.map((category) => ({ label: category, categories: [category] }));
  const ranked = cross.columnCategories.map((category, index) => ({
    category,
    index,
    total: cross.rowCategories.reduce((sum, row) => sum + (cross.counts[row]?.[category] ?? 0), 0),
  })).sort((a, b) => b.total - a.total || a.index - b.index);
  if (ranked.length <= maxVisible + 1) return cross.columnCategories.map((category) => ({ label: category, categories: [category] }));
  const top = ranked.slice(0, maxVisible);
  const rest = ranked.slice(maxVisible).map(({ category }) => category);
  return [...top.map(({ category }) => ({ label: category, categories: [category] })), { label: `Otras categorías (${rest.length})`, categories: rest }];
}

export function crossBarSeriesValue(cross: Cross, row: string, series: CrossBarSeries) {
  return series.categories.reduce((sum, category) => sum + (cross.counts[row]?.[category] ?? 0), 0);
}

function downloadFile(content: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportCrossCsv(cross: Cross, metric: CrossMetric, includeTotals: boolean, rowLabel = "Fila") {
  const rows = crossExportRows(cross, metric, includeTotals, rowLabel);
  downloadFile("﻿" + rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\r\n"), "cruce.csv", "text/csv;charset=utf-8");
}

export async function exportCrossExcel(cross: Cross, metric: CrossMetric, includeTotals: boolean, colorHeatmap: boolean, parameters: CrossExportParameters = {}, rowLabel = "Fila", columnLabel = "Columnas") {
  const XLSX = await import("xlsx-js-style");
  const rows = crossExportRows(cross, metric, includeTotals, rowLabel);
  const totals = hasTotals(cross, metric, includeTotals);
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = rows[0].map((_, index) => ({ wch: index === 0 ? 36 : 18 }));
  const max = crossExportMax(cross, metric);
  rows.forEach((row, rowIndex) => row.forEach((cell, columnIndex) => {
    const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
    const isHeader = rowIndex === 0;
    const isTotalRow = totals && rowIndex === cross.rowCategories.length + 1;
    const isTotalColumn = totals && columnIndex === cross.columnCategories.length + 1;
    const isValueCell = !isHeader && !isTotalRow && !isTotalColumn && columnIndex > 0;
    const isHeatCell = isValueCell && (colorHeatmap || metric === "residual");
    const fill = isHeatCell ? cellRgb(exportNumber(cell), max, metric) : isHeader || isTotalRow || isTotalColumn ? "F1F5F9" : "FFFFFF";
    worksheet[address].s = {
      fill: { fgColor: { rgb: fill } },
      font: { bold: isHeader || isTotalRow || isTotalColumn, color: { rgb: isHeatCell && darkFill(fill) ? "FFFFFF" : "0F172A" } },
      alignment: { horizontal: columnIndex === 0 ? "left" : "right", vertical: "center", wrapText: isHeader || columnIndex === 0 },
    };
  }));
  worksheet["!freeze"] = { xSplit: 1, ySplit: 1 };
  XLSX.utils.book_append_sheet(workbook, worksheet, "Cruce");
  const parameterRows = [
    ["Parámetro", "Valor"],
    ["Dataset", parameters.dataset ?? "No especificado"],
    ["Fecha de generación", new Intl.DateTimeFormat("en-CA", { timeZone: "America/La_Paz" }).format(new Date())],
    ["Filas", rowLabel],
    ["Columnas", columnLabel],
    ["Métrica", cross.multipleResponse ? metric === "residual" ? "Residuo global no aplicable a respuestas múltiples" : `${crossMetricLabel(metric)} · respuestas múltiples; los conteos son selecciones` : crossMetricLabel(metric)],
    ["Filtros", parameters.filters ?? "Sin filtros"],
    ["n", String(cross.validCount)],
    ...(metric === "residual" ? [["Lectura", `|residuo| ≥ ${String(RESIDUAL_THRESHOLD).replace(".", ",")}: la combinación se aparta de la independencia (≈ 5 %).`]] : []),
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(parameterRows), "Parámetros");
  downloadFile(XLSX.write(workbook, { bookType: "xlsx", type: "array" }), "cruce.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

export function exportCrossPng(cross: Cross, metric: CrossMetric, includeTotals: boolean, colorHeatmap: boolean, view: "table" | "bars", rowLabel = "Fila", columnLabel = "Columnas") {
  if (view === "table") {
    exportCrossTablePng(cross, metric, includeTotals, colorHeatmap, rowLabel, columnLabel);
    return;
  }
  const width = 1200;
  const left = 300;
  const plotWidth = 850;
  const rowHeight = 58;
  const multipleResponse = Boolean(cross.multipleResponse);
  const legendLines = wrapLegend(cross.columnCategories.map(booleanLabel), width - 60);
  const top = 70 + legendLines.length * 22;
  const height = top + Math.max(1, cross.rowCategories.length * (multipleResponse ? cross.columnCategories.length : 1)) * rowHeight + 30;
  const profiles = metric === "rowPercent";
  // Las barras apiladas suman el total de la fila: la escala es el mayor total, no la mayor celda.
  const maxRow = multipleResponse ? Math.max(1, ...cross.rowCategories.map((row) => cross.rowBases?.[row] ?? 0)) : Math.max(1, ...cross.rowCategories.map((row) => rowSum(cross, row)));
  const bars = cross.rowCategories.map((row, rowIndex) => {
    const y = top + rowIndex * rowHeight * (multipleResponse ? cross.columnCategories.length : 1);
    if (multipleResponse) {
      return cross.columnCategories.map((column, columnIndex) => {
        const value = cross.counts[row]?.[column] ?? 0;
        const base = cross.rowBases?.[row] ?? 0;
        const percentage = base ? (value * 100) / base : 0;
        const lineY = y + columnIndex * rowHeight;
        const barWidth = Math.min(plotWidth, (percentage / 100) * plotWidth);
        return `<text x="${left - 12}" y="${lineY + 18}" text-anchor="end" font-family="Arial" font-size="12" fill="#0f172a">${escapeSvg(booleanLabel(row))} · ${escapeSvg(booleanLabel(column))}</text><rect x="${left}" y="${lineY}" width="${plotWidth}" height="24" rx="3" fill="#e2e8f0"/><rect x="${left}" y="${lineY}" width="${barWidth}" height="24" rx="3" fill="${CROSS_COLORS[columnIndex % CROSS_COLORS.length]}"/><text x="${left + plotWidth + 8}" y="${lineY + 17}" font-family="Arial" font-size="12" fill="#334155">${value} · ${percentage.toFixed(1)}%</text>`;
      }).join("");
    }
    const total = rowSum(cross, row);
    const scale = profiles ? (total ? plotWidth / total : 0) : plotWidth / maxRow;
    let offset = 0;
    const segments = cross.columnCategories.map((column, columnIndex) => {
      const count = cross.counts[row]?.[column] ?? 0;
      const widthValue = count * scale;
      const label = profiles ? formatExportValue(total ? (count * 100) / total : 0, "rowPercent") : String(count);
      const segment = `<rect x="${left + offset}" y="${y}" width="${Math.max(0, widthValue)}" height="28" fill="${CROSS_COLORS[columnIndex % CROSS_COLORS.length]}"/><text x="${left + offset + widthValue / 2}" y="${y + 19}" text-anchor="middle" font-family="Arial" font-size="12" fill="white">${widthValue > label.length * 7 + 8 ? escapeSvg(label) : ""}</text>`;
      offset += widthValue;
      return segment;
    }).join("");
    const lines = wrapText(`${booleanLabel(row)} (n = ${total})`, 40).slice(0, 2);
    const labelText = lines.map((line, index) => `<tspan x="${left - 12}" dy="${index === 0 ? 0 : 15}">${escapeSvg(line)}</tspan>`).join("");
    return `<text x="${left - 12}" y="${y + (lines.length > 1 ? 11 : 19)}" text-anchor="end" font-family="Arial" font-size="13" fill="#0f172a">${labelText}</text>${segments}`;
  }).join("");
  const legend = legendLines.map((line, lineIndex) => line.map(({ text, index, x }) => `<rect x="${30 + x}" y="${56 + lineIndex * 22}" width="12" height="12" fill="${CROSS_COLORS[index % CROSS_COLORS.length]}"/><text x="${48 + x}" y="${67 + lineIndex * 22}" font-family="Arial" font-size="12" fill="#334155">${escapeSvg(text)}</text>`).join("")).join("");
  const subtitle = multipleResponse ? "% de personas dentro de cada grupo · conteos de selección" : profiles ? "% por fila (perfiles al 100 %)" : "conteos";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="white"/><text x="30" y="28" font-family="Arial" font-size="18" font-weight="bold" fill="#0f172a">${escapeSvg(rowLabel)} × ${escapeSvg(columnLabel)}</text><text x="30" y="45" font-family="Arial" font-size="12" fill="#64748b">${escapeSvg(subtitle)} · n = ${cross.validCount}</text>${legend}${bars}</svg>`;
  downloadSvgAsPng(svg, width, height);
}

function exportCrossTablePng(cross: Cross, metric: CrossMetric, includeTotals: boolean, colorHeatmap: boolean, rowLabel: string, columnLabel: string) {
  const rows = crossExportRows(cross, metric, includeTotals, rowLabel);
  const totals = hasTotals(cross, metric, includeTotals);
  const labelWidth = 300;
  const cellWidth = 132;
  const lineHeight = 15;
  // Texto ajustado por palabras: los encabezados y las categorías largas ya no se salen de su celda.
  const wrapped = rows.map((row, rowIndex) => row.map((cell, columnIndex) => (rowIndex === 0 || columnIndex === 0 ? wrapText(cell, columnIndex === 0 ? 40 : 17) : [cell])));
  const rowHeights = wrapped.map((row) => Math.max(36, ...row.map((lines) => lines.length * lineHeight + 14)));
  const width = 60 + labelWidth + (rows[0].length - 1) * cellWidth;
  const top = 92;
  const height = top + rowHeights.reduce((sum, value) => sum + value, 0) + (metric === "residual" ? 44 : 24);
  const max = crossExportMax(cross, metric);
  let y = top;
  const cells = wrapped.map((row, rowIndex) => {
    const rowHeight = rowHeights[rowIndex];
    const content = row.map((lines, columnIndex) => {
      const x = columnIndex === 0 ? 30 : 30 + labelWidth + (columnIndex - 1) * cellWidth;
      const w = columnIndex === 0 ? labelWidth : cellWidth;
      const isHeader = rowIndex === 0;
      const isTotal = totals && (rowIndex === rows.length - 1 || columnIndex === rows[0].length - 1);
      const isHeatCell = !isHeader && !isTotal && columnIndex > 0 && (colorHeatmap || metric === "residual");
      const rgb = isHeatCell ? cellRgb(exportNumber(rows[rowIndex][columnIndex]), max, metric) : isHeader || isTotal ? "F1F5F9" : "FFFFFF";
      const textColor = isHeatCell && darkFill(rgb) ? "#FFFFFF" : "#0F172A";
      const anchor = columnIndex === 0 ? "start" : "end";
      const textX = columnIndex === 0 ? x + 10 : x + w - 10;
      const firstY = y + rowHeight / 2 - ((lines.length - 1) * lineHeight) / 2 + 4;
      const text = lines.map((line, index) => `<tspan x="${textX}" y="${firstY + index * lineHeight}">${escapeSvg(line)}</tspan>`).join("");
      return `<rect x="${x}" y="${y}" width="${w}" height="${rowHeight}" fill="#${rgb}" stroke="#CBD5E1"/><text text-anchor="${anchor}" font-family="Arial" font-size="12.5" font-weight="${isHeader || isTotal ? "bold" : "normal"}" fill="${textColor}">${text}</text>`;
    }).join("");
    y += rowHeight;
    return content;
  }).join("");
  const columnStart = 30 + labelWidth;
  const columnEnd = columnStart + cross.columnCategories.length * cellWidth;
  const note = metric === "residual" && !cross.multipleResponse ? `<text x="30" y="${height - 16}" font-family="Arial" font-size="11.5" fill="#64748b">Residuo ajustado: azul = más casos de los esperados con independencia; rojo = menos. |r| ≥ 1,96 se aparta de la independencia (≈ 5 %).</text>` : cross.multipleResponse ? `<text x="30" y="${height - 16}" font-family="Arial" font-size="11.5" fill="#64748b">Respuesta múltiple: los conteos son selecciones que pueden solaparse; n cuenta personas únicas.</text>` : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="white"/><text x="30" y="28" font-family="Arial" font-size="18" font-weight="bold" fill="#0f172a">${escapeSvg(rowLabel)} × ${escapeSvg(columnLabel)}</text><text x="30" y="50" font-family="Arial" font-size="12" fill="#64748b">${escapeSvg(crossMetricLabel(metric))} · n = ${cross.validCount}</text><text x="${(columnStart + columnEnd) / 2}" y="82" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="#334155">${escapeSvg(columnLabel)}</text>${cells}${note}</svg>`;
  downloadSvgAsPng(svg, width, height);
}

function downloadSvgAsPng(svg: string, width: number, height: number) {
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(image, 0, 0);
    canvas.toBlob((blob) => blob && downloadFile(blob, "cruce.png", "image/png"));
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Los residuos no tienen marginales: la fila y la columna de totales se omiten. */
function hasTotals(cross: Cross, metric: CrossMetric, includeTotals: boolean) {
  return includeTotals && metric !== "residual" && !cross.multipleResponse;
}

function crossExportRows(cross: Cross, metric: CrossMetric, includeTotals: boolean, rowLabel = "Fila") {
  const totals = hasTotals(cross, metric, includeTotals);
  const headers = [rowLabel, ...cross.columnCategories.map(booleanLabel), ...(totals ? ["Total fila"] : [])];
  const rows = cross.rowCategories.map((row) => [
    booleanLabel(row),
    ...cross.columnCategories.map((column) => cross.multipleResponse && metric === "residual" ? "—" : formatExportValue(crossExportValue(cross, row, column, metric), metric)),
    ...(totals ? [formatExportMarginal(cross, rowSum(cross, row), metric, "row")] : []),
  ]);
  if (totals) rows.push(["Total columna", ...cross.columnCategories.map((column) => formatExportMarginal(cross, columnSum(cross, column), metric, "column")), metric === "count" ? String(cross.validCount) : "100,0 %"]);
  return [headers, ...rows];
}

function crossExportValue(cross: Cross, row: string, column: string, metric: CrossMetric) {
  const count = cross.counts[row]?.[column] ?? 0;
  if (metric === "count") return count;
  if (metric === "residual") return crossResidual(cross, row, column);
  // % por columna se divide por el total de la columna (antes usaba el de la fila y repetía el % por fila).
  const total = metric === "rowPercent"
    ? cross.multipleResponse ? cross.rowBases?.[row] ?? rowSum(cross, row) : rowSum(cross, row)
    : columnSum(cross, column);
  return total ? (count * 100) / total : 0;
}

function formatExportValue(value: number, metric: CrossMetric) {
  if (metric === "count") return String(value);
  if (metric === "residual") return formatResidual(value);
  return `${value.toFixed(1).replace(".", ",")} %`;
}

function formatExportMarginal(cross: Cross, value: number, metric: CrossMetric, side: "row" | "column") {
  if (metric === "count") return String(value);
  const share = `${cross.validCount ? ((value * 100) / cross.validCount).toFixed(1).replace(".", ",") : "0,0"} %`;
  if (metric === "rowPercent") return side === "row" ? "100,0 %" : share;
  return side === "column" ? "100,0 %" : share;
}

function crossExportMax(cross: Cross, metric: CrossMetric) {
  return Math.max(1, ...cross.rowCategories.flatMap((row) => cross.columnCategories.map((column) => Math.abs(crossExportValue(cross, row, column, metric)))));
}

function exportNumber(value: string) {
  return Number(value.replace("−", "-").replace(",", ".").replace("%", "").trim()) || 0;
}

/** Color de celda: secuencial para conteos y porcentajes; divergente (azul/rojo) para residuos. */
function cellRgb(value: number, max: number, metric: CrossMetric) {
  if (metric === "residual") {
    const size = Math.abs(value);
    const alpha = size < RESIDUAL_THRESHOLD
      ? 0.04 + (size / RESIDUAL_THRESHOLD) * 0.22
      : 0.45 + Math.min(1, (size - RESIDUAL_THRESHOLD) / Math.max(0.5, Math.max(3, max) - RESIDUAL_THRESHOLD)) * 0.4;
    return mix(value >= 0 ? [31, 111, 181] : [214, 69, 65], alpha);
  }
  return mix([31, 111, 181], 0.08 + Math.min(1, Math.max(0, value / max)) * 0.75);
}

function mix(base: [number, number, number], alpha: number) {
  return base.map((channel) => Math.round(255 * (1 - alpha) + channel * alpha).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function darkFill(rgb: string) {
  const [r, g, b] = [0, 2, 4].map((index) => parseInt(rgb.slice(index, index + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 150;
}

function wrapText(text: string, maxChars: number) {
  const lines: string[] = [];
  let current = "";
  for (const word of text.split(" ")) {
    if (current && (current + " " + word).length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

/** Leyenda en varias líneas: cada elemento ocupa el ancho de su texto. */
function wrapLegend(labels: string[], maxWidth: number) {
  const lines: { text: string; index: number; x: number }[][] = [[]];
  let x = 0;
  labels.forEach((text, index) => {
    const itemWidth = 24 + text.length * 6.6 + 18;
    if (x > 0 && x + itemWidth > maxWidth) {
      lines.push([]);
      x = 0;
    }
    lines[lines.length - 1].push({ text, index, x });
    x += itemWidth;
  });
  return lines;
}

function escapeSvg(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
