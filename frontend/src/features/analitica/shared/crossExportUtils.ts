import * as XLSX from "xlsx-js-style";
import type { Cross, CrossMetric } from "./analyticsTypes";

export function booleanLabel(value: string) {
  if (value.toLowerCase() === "true") return "Sí";
  if (value.toLowerCase() === "false") return "No";
  const normalized = value.trim().replace(/\s+/g, " ").toLocaleLowerCase("es-BO");
  if (!normalized) return normalized;
  const sentence = normalized.charAt(0).toLocaleUpperCase("es-BO") + normalized.slice(1);
  return sentence.replace(/\bia\b/gi, "IA").replace(/\bdevops\b/gi, "DevOps").replace(/\b(modular|presencial|virtual)\(/gi, "$1 (");
}

export function crossMetricLabel(metric: CrossMetric) {
  if (metric === "rowPercent") return "valores en % por fila";
  if (metric === "columnPercent") return "valores en % por columna";
  return "conteos";
}

function downloadFile(content: BlobPart, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportCrossCsv(cross: Cross, metric: CrossMetric, includeTotals: boolean) {
  const rows = crossExportRows(cross, metric, includeTotals);
  downloadFile(rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n"), "cruce.csv", "text/csv;charset=utf-8");
}

export function exportCrossExcel(cross: Cross, metric: CrossMetric, includeTotals: boolean, colorHeatmap: boolean) {
  const rows = crossExportRows(cross, metric, includeTotals);
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = rows[0].map((_, index) => ({ wch: index === 0 ? 32 : 16 }));
  const max = crossExportMax(cross, metric);
  rows.forEach((row, rowIndex) => row.forEach((cell, columnIndex) => {
    const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
    const isHeader = rowIndex === 0;
    const isTotalRow = includeTotals && rowIndex === cross.rowCategories.length + 1;
    const isTotalColumn = includeTotals && columnIndex === cross.columnCategories.length + 1;
    const isHeatCell = colorHeatmap && !isHeader && !isTotalRow && !isTotalColumn && rowIndex > 0 && rowIndex <= cross.rowCategories.length && columnIndex > 0 && columnIndex <= cross.columnCategories.length;
    if (isHeader || isTotalRow || isTotalColumn || isHeatCell) {
      worksheet[address].s = {
        fill: { fgColor: { rgb: isHeatCell ? heatmapRgb(exportNumber(cell) / max) : "F1F5F9" } },
        font: { bold: isHeader || isTotalRow || isTotalColumn, color: isHeatCell ? "FFFFFF" : "0F172A" },
      };
    }
  }));
  XLSX.utils.book_append_sheet(workbook, worksheet, "Cruce");
  downloadFile(XLSX.write(workbook, { bookType: "xlsx", type: "array" }), "cruce.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

export function exportCrossPng(cross: Cross, metric: CrossMetric, includeTotals: boolean, colorHeatmap: boolean) {
  const width = 900;
  const rows = crossExportRows(cross, metric, includeTotals);
  const height = Math.max(180, (rows.length + 1) * 42 + 40);
  const columnWidth = width / rows[0].length;
  const max = crossExportMax(cross, metric);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="white"/>${rows.map((row, rowIndex) => row.map((cell, columnIndex) => {
    const isHeader = rowIndex === 0;
    const isTotalRow = includeTotals && rowIndex === cross.rowCategories.length + 1;
    const isTotalColumn = includeTotals && columnIndex === cross.columnCategories.length + 1;
    const heat = colorHeatmap && !isHeader && !isTotalRow && !isTotalColumn && rowIndex > 0 && rowIndex <= cross.rowCategories.length && columnIndex > 0 && columnIndex <= cross.columnCategories.length;
    const opacity = heat ? 0.08 + (exportNumber(cell) / max) * 0.75 : 0;
    const gray = isHeader || isTotalRow || isTotalColumn;
    const rect = heat ? `<rect x="${columnIndex * columnWidth}" y="${rowIndex * 42 + 8}" width="${columnWidth}" height="42" fill="rgba(31,111,181,${opacity})"/>` : gray ? `<rect x="${columnIndex * columnWidth}" y="${rowIndex * 42 + 8}" width="${columnWidth}" height="42" fill="#f1f5f9"/>` : "";
    return `${rect}<text x="${20 + columnIndex * columnWidth}" y="${35 + rowIndex * 42}" font-family="Arial" font-size="14" fill="#0f172a">${escapeSvg(cell)}</text>`;
  }).join("")).join("")}</svg>`;
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

function crossExportRows(cross: Cross, metric: CrossMetric, includeTotals: boolean) {
  const headers = ["Fila", ...cross.columnCategories.map(booleanLabel), ...(includeTotals ? ["Total fila"] : [])];
  const rows = cross.rowCategories.map((row) => [booleanLabel(row), ...cross.columnCategories.map((column) => formatExportValue(crossExportValue(cross, row, column, metric), metric)), ...(includeTotals ? [formatExportMarginal(cross, cross.columnCategories.reduce((sum, column) => sum + (cross.counts[row]?.[column] ?? 0), 0), metric, "row")] : [])]);
  if (includeTotals) rows.push(["Total columna", ...cross.columnCategories.map((column) => formatExportMarginal(cross, cross.rowCategories.reduce((sum, row) => sum + (cross.counts[row]?.[column] ?? 0), 0), metric, "column")), formatExportValue(cross.validCount, metric)]);
  return [headers, ...rows];
}

function crossExportValue(cross: Cross, row: string, column: string, metric: CrossMetric) {
  if (metric === "count") return cross.counts[row]?.[column] ?? 0;
  if (metric === "rowPercent") return cross.percentages[row]?.[column] ?? 0;
  const total = cross.columnCategories.reduce((sum, current) => sum + (cross.counts[row]?.[current] ?? 0), 0);
  return total ? ((cross.counts[row]?.[column] ?? 0) * 100) / total : 0;
}

function formatExportValue(value: number, metric: CrossMetric) {
  return metric === "count" ? String(value) : `${value.toFixed(1).replace(".", ",")}%`;
}

function formatExportMarginal(cross: Cross, value: number, metric: CrossMetric, side: "row" | "column") {
  if (metric === "count") return String(value);
  if (metric === "rowPercent") return side === "row" ? "100,0%" : `${cross.validCount ? ((value * 100) / cross.validCount).toFixed(1).replace(".", ",") : "0,0"}%`;
  return side === "column" ? "100,0%" : `${cross.validCount ? ((value * 100) / cross.validCount).toFixed(1).replace(".", ",") : "0,0"}%`;
}

function crossExportMax(cross: Cross, metric: CrossMetric) {
  return Math.max(1, ...cross.rowCategories.flatMap((row) => cross.columnCategories.map((column) => crossExportValue(cross, row, column, metric))));
}

function exportNumber(value: string) {
  return Number(value.replace(",", ".").replace("%", "")) || 0;
}

function heatmapRgb(intensity: number) {
  const alpha = 0.08 + Math.min(1, Math.max(0, intensity)) * 0.75;
  const channel = (base: number) => Math.round(255 * (1 - alpha) + base * alpha).toString(16).padStart(2, "0");
  return `${channel(31)}${channel(111)}${channel(181)}`.toUpperCase();
}

function escapeSvg(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
