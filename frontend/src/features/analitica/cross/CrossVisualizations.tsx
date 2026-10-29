import type { ReactNode } from "react";
import { Badge } from "@/components/analytics/Badge";
import { contrastTextColor } from "@/lib/utils";
import type { Cross, CrossMetric } from "../shared/analyticsTypes";
import type { ResultadoPruebaAsociacion } from "../api";
import { Empty, EmptyTitle } from "@/components/ui/empty";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useChartContainerWidth } from "@/components/analytics/charts/useChartContainerSize";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TapTooltip } from "@/components/analytics/TapTooltip";

function booleanLabel(value: string) {
  if (value.toLowerCase() === "true") return "Sí";
  if (value.toLowerCase() === "false") return "No";
  const normalized = value.trim().replace(/\s+/g, " ").toLocaleLowerCase("es-BO");
  if (!normalized) return normalized;
  const sentence = normalized.charAt(0).toLocaleUpperCase("es-BO") + normalized.slice(1);
  return sentence.replace(/\bia\b/gi, "IA").replace(/\bdevops\b/gi, "DevOps").replace(/\b(modular|presencial|virtual)\(/gi, "$1 (");
}

const formatDecimal = (value: number, digits: number) => value.toFixed(digits).replace(".", ",");

function formatPValue(value: number) {
  return value < 0.001 ? "p < 0,001" : `p = ${formatDecimal(value, 3)}`;
}

function cramerStrength(value: number) {
  if (value < 0.1) return "despreciable";
  if (value < 0.3) return "débil";
  if (value < 0.5) return "moderada";
  return "fuerte";
}

function observedSmallSampleSummary(cross: Cross) {
  const cells = cross.rowCategories.flatMap((row) =>
    cross.columnCategories.map((column) => cross.counts[row]?.[column] ?? 0),
  );
  const lowCells = cells.filter((value) => value < 5).length;
  const totalCells = cells.length;

  if (cross.validCount < 10) {
    return `Muestra pequeña · n = ${cross.validCount}`;
  }

  if (!lowCells || totalCells === 0) return "";

  const sparseRatio = lowCells / totalCells;
  if (cross.validCount >= 200 && sparseRatio <= 0.2) return "";
  if (cross.validCount < 30) return `${lowCells} de ${totalCells} celdas tienen n < 5`;
  if (sparseRatio > 0.2) return `${lowCells} de ${totalCells} celdas tienen n < 5`;
  return "";
}

export function ChiSquareCard({
  result,
  cross,
}: {
  result: ResultadoPruebaAsociacion | null;
  cross: Cross;
}) {
  const applicable = Boolean(result?.aplicable && result.pValor != null);
  const reason = result
    ? result.motivo
    : !cross.validCount
      ? "No hay celdas con observaciones válidas para evaluar."
      : "No se pudo completar el cálculo de la prueba para esta matriz.";
  return (
    <Card className="gap-2 rounded-xl border-0 shadow-sm">
      <CardHeader className="grid-cols-[1fr_auto] gap-x-4 gap-y-1 pb-0">
        <CardTitle className="title-card">
          Prueba de asociación{applicable && result ? ` · ${result.nombrePrueba}` : ""}
        </CardTitle>
        <div className="flex flex-col items-end gap-1">
          <Badge tone="neutral">
            {applicable && result
              ? result.rechazaHipotesis
                ? "p < α"
                : "p ≥ α"
              : "No aplicable"}
          </Badge>
          {applicable && result && <span className="text-xs text-ink-600">α = {formatDecimal(result.alfa, 2)}</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {applicable && result && result.pValor != null ? (
          <>
            <div className="grid items-center gap-4 md:grid-cols-3">
              <div>
                <p className="display-kpi tabular-nums text-ink-900">
                  {formatPValue(result.pValor)}
                </p>
              </div>
              <div className="rounded-lg bg-surface-container-low p-4">
                {result.estadistico != null ? (
                  <>
                    <span className="caption-meta">χ² calculado · gl = {result.gradosLibertad}</span>
                    <p className="title-card tabular-nums">{formatDecimal(result.estadistico, 2)}</p>
                  </>
                ) : (
                  <>
                    <span className="caption-meta">Cálculo</span>
                    <p className="title-card">
                      {result.simulaciones ? `${result.simulaciones.toLocaleString("es-BO")} simulaciones` : "Probabilidad exacta"}
                    </p>
                  </>
                )}
              </div>
              <div className="rounded-lg bg-surface-container-low p-4">
                <span className="caption-meta">V de Cramér (tamaño del efecto)</span>
                <p className="title-card tabular-nums">
                  {result.vCramer != null ? `${formatDecimal(result.vCramer, 2)} · ${cramerStrength(result.vCramer)}` : "—"}
                </p>
              </div>
            </div>
            <p className="text-sm text-ink-900">
              {result.rechazaHipotesis
                ? "Se rechaza la independencia: las dos variables están asociadas de forma estadísticamente significativa."
                : "No hay evidencia suficiente para afirmar que las variables estén asociadas."}
            </p>
            <p className="text-xs text-ink-600">
              <strong>Por qué esta prueba:</strong> {result.motivo} n = {result.n} · {result.celdasEsperadasMenores5} de {result.totalCeldas} celdas con esperada &lt; 5
              {result.esperadaMinima != null ? ` · esperada mínima ${formatDecimal(result.esperadaMinima, 2)}` : ""}.
            </p>
          </>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <strong>No aplicable:</strong> {reason}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CrossTable({
  cross,
  totalResponses,
  includeTotals,
  colorHeatmap,
  metric,
  rowLabel = "Fila",
  columnLabel = "Columnas",
  action,
  swapAxes = false,
}: {
  cross: Cross;
  totalResponses?: number;
  includeTotals: boolean;
  colorHeatmap: boolean;
  metric: CrossMetric;
  rowLabel?: string;
  columnLabel?: string;
  action?: ReactNode;
  swapAxes?: boolean;
}) {
  const displayRows = swapAxes ? cross.columnCategories : cross.rowCategories;
  const displayColumns = swapAxes ? cross.rowCategories : cross.columnCategories;
  const displayRowLabel = swapAxes ? columnLabel : rowLabel;
  const displayColumnLabel = swapAxes ? rowLabel : columnLabel;
  const rawCellValue = (row: string, column: string) => {
    const rawRow = swapAxes ? column : row;
    const rawColumn = swapAxes ? row : column;
    return cross.counts[rawRow]?.[rawColumn] ?? 0;
  };
  const columnTotal = (column: string) =>
    displayRows.reduce(
      (sum, row) => sum + rawCellValue(row, column),
      0,
    );
  const rowTotal = (row: string) =>
    displayColumns.reduce(
      (sum, column) => sum + rawCellValue(row, column),
      0,
    );
  const columnPercent = (row: string, column: string) => {
    const total = columnTotal(column);
    return total ? (rawCellValue(row, column) * 100) / total : 0;
  };
  const cellValue = (row: string, column: string) =>
    metric === "count"
      ? rawCellValue(row, column)
      : metric === "rowPercent"
        ? (cross.percentages[swapAxes ? column : row]?.[swapAxes ? row : column] ?? 0)
        : columnPercent(row, column);
  const max = Math.max(
    1,
    ...displayRows.flatMap((row) =>
      displayColumns.map((column) => cellValue(row, column)),
    ),
  );
  const formatValue = (value: number) =>
    metric === "count"
      ? String(value)
      : `${value.toFixed(1).replace(".", ",")} %`;
  const metricLabel =
    metric === "count"
      ? "Frecuencia absoluta (conteos)"
      : metric === "rowPercent"
        ? "% por fila"
        : "% por columna";
  const marginalPercent = (value: number) =>
    cross.validCount
      ? `${((value * 100) / cross.validCount).toFixed(1).replace(".", ",")} %`
      : "0,0%";
  const labelColumnWidth = Math.min(
    44,
    Math.max(28, 58 - displayColumns.length * 5),
  );
  const valueColumnCount = displayColumns.length + (includeTotals ? 1 : 0);
  const valueColumnWidth = (100 - labelColumnWidth) / valueColumnCount;
  return (
    <Card className="min-w-0 overflow-visible">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="title-card">{displayRowLabel} × {displayColumnLabel}</CardTitle>
            <CardDescription>
              {metricLabel.replace(" (conteos)", "")} · n = {cross.validCount}
              {totalResponses != null ? ` de ${totalResponses}` : ""}
              {cross.smallSample ? " · muestra reducida" : ""}
            </CardDescription>
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="min-w-0 overflow-x-auto">
        <Table className="min-w-[620px] table-fixed text-sm">
          <colgroup>
            <col style={{ width: `${labelColumnWidth}%` }} />
            {displayColumns.map((column) => (
              <col
                key={column}
                style={{ width: `${valueColumnWidth}%` }}
              />
            ))}
            {includeTotals && <col style={{ width: `${valueColumnWidth}%` }} />}
          </colgroup>
          <TableHeader>
            <TableRow className="bg-surface-container-low hover:bg-surface-container-low">
              <TableHead rowSpan={2} className="min-w-[210px] whitespace-nowrap p-2 text-left align-middle">
                {displayRowLabel}
              </TableHead>
              <TableHead colSpan={displayColumns.length} className="p-2 text-center">
                {displayColumnLabel}
              </TableHead>
              {includeTotals && <TableHead rowSpan={2} className="w-20 break-words p-2 text-right align-middle">Total fila</TableHead>}
            </TableRow>
            <TableRow className="bg-surface-container-low hover:bg-surface-container-low">
              {displayColumns.map((column) => (
                <TableHead
                  key={column}
                  className="whitespace-normal break-words p-2 text-right leading-tight"
                >
                  {booleanLabel(column)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.map((row) => (
              <TableRow key={row} className="border-t hover:bg-transparent">
                <TableCell className="min-w-[210px] whitespace-nowrap p-2 font-medium">
                  {booleanLabel(row)}
                </TableCell>
                {displayColumns.map((column) => {
                  const value = cellValue(row, column);
                  const intensity = value / max;
                  return (
                    <TableCell
                      key={column}
                      className="tabular-nums p-2 text-right font-medium transition-[background-color,color] duration-300 ease-out"
                      style={
                        colorHeatmap
                          ? {
                              backgroundColor: `rgba(31,111,181,${0.08 + intensity * 0.75})`,
                              color: contrastTextColor(
                                `rgba(31,111,181,${0.08 + intensity * 0.75})`,
                              ),
                            }
                          : undefined
                      }
                    >
                      {formatValue(value)}
                    </TableCell>
                  );
                })}
                {includeTotals && (
                  <TableCell className="tabular-nums bg-surface-container-low p-2 text-right font-semibold">
                    {metric === "count"
                      ? rowTotal(row)
                      : metric === "rowPercent"
                        ? "100,0%"
                        : marginalPercent(rowTotal(row))}
                  </TableCell>
                )}
              </TableRow>
            ))}
            {includeTotals && (
              <TableRow className="border-t-2 bg-surface-container-low font-semibold hover:bg-surface-container-low">
                <TableCell className="whitespace-nowrap p-2">
                  Total columna
                </TableCell>
                {displayColumns.map((column) => (
                  <TableCell
                    key={column}
                    className="tabular-nums p-2 text-right"
                  >
                    {metric === "count"
                      ? columnTotal(column)
                      : metric === "columnPercent"
                        ? "100,0%"
                        : marginalPercent(columnTotal(column))}
                  </TableCell>
                ))}
                <TableCell className="tabular-nums p-2 text-right">
                  {metric === "count" ? cross.validCount : "100,0%"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {colorHeatmap && (
          <div className="mt-4 border-t border-surface-container-high pt-3 text-xs text-ink-600">
            <div className="flex items-center justify-between">
              <span>Escala de {metricLabel}</span>
              <span>
                0 ·{" "}
                {metric === "count"
                  ? max
                  : `${max.toFixed(1).replace(".", ",")} %`}
              </span>
            </div>
            <div
              className="mt-1 h-2 rounded-full"
              style={{
                background:
                  "linear-gradient(to right, rgba(31,111,181,0.08), rgba(31,111,181,0.83))",
              }}
            />
          </div>
        )}
        {observedSmallSampleSummary(cross) && (
          <p className="mt-3 text-xs text-amber-800">
            {observedSmallSampleSummary(cross)}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
export function CrossBars({
  cross,
  metric,
  totalResponses,
  action,
}: {
  cross: Cross;
  metric: CrossMetric;
  totalResponses?: number;
  action?: ReactNode;
}) {
  const { ref, width: chartWidth } = useChartContainerWidth<HTMLDivElement>();
  const colors = [
    "#1f6fb5",
    "#7db1dd",
    "#173f67",
    "#8b5bd1",
    "#ed552f",
    "#18a39a",
  ];
  const total = cross.validCount || 1;
  const rowTotal = (row: string) =>
    cross.columnCategories.reduce(
      (sum, column) => sum + (cross.counts[row]?.[column] ?? 0),
      0,
    );
  const maxRowTotal = Math.max(1, ...cross.rowCategories.map(rowTotal));
  const rowPercent = (row: string, column: string) =>
    cross.percentages[row]?.[column] ?? 0;
  const valueLabel = (row: string, column: string, value: number) =>
    metric === "rowPercent"
      ? `${rowPercent(row, column).toFixed(1).replace(".", ",")} %`
      : String(value);
  const subtitle =
    metric === "rowPercent" ? "% por fila" : "Frecuencia absoluta";
  return (
    <Card className="min-w-0 overflow-visible">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="title-card">
            Distribución agregada por categoría
          </CardTitle>
          <CardDescription className="shrink-0 text-right">
            {subtitle} · n = {cross.validCount}
            {totalResponses != null ? ` de ${totalResponses}` : ""}
          </CardDescription>
          {action}
        </div>
      </CardHeader>
      <CardContent>
        <div ref={ref} className="space-y-4">
        {cross.rowCategories.map((row) => {
          const totalRow = rowTotal(row);
          return (
            <div key={row} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate font-medium text-ink-900">
                  {booleanLabel(row)} (n = {totalRow})
                </span>
                <span className="shrink-0 text-ink-600">
                  {((totalRow * 100) / total).toFixed(1).replace(".", ",")} % del
                  total
                </span>
              </div>
              {totalRow > 0 ? (
                <Progress
                  value={(totalRow * 100) / maxRowTotal}
                  className="bg-surface-container-high"
                >
                  <div className="flex h-full w-full">
                    {cross.columnCategories.map((column, index) => {
                      const value = cross.counts[row]?.[column] ?? 0;
                      if (value <= 0) return null;
                      const width = (value * 100) / totalRow;
                      const label = valueLabel(row, column, value);
                      const actualSegmentWidth = (value / maxRowTotal) * chartWidth;
                      const labelCanFit = actualSegmentWidth >= label.length * 6 + 8;
                      return (
                        <TapTooltip
                          key={column}
                          side="bottom"
                          content={
                            <div className="grid gap-0.5">
                              <strong>{booleanLabel(column)}</strong>
                              <span>
                                {metric === "rowPercent"
                                  ? `${valueLabel(row, column, value)} · `
                                  : ""}
                                {value} de {totalRow} respuestas de «{booleanLabel(row)}»
                              </span>
                              <span className="text-muted-foreground">
                                {rowPercent(row, column).toFixed(1).replace(".", ",")} % de esta categoría
                              </span>
                            </div>
                          }
                        >
                          <div
                            tabIndex={0}
                            aria-label={`${booleanLabel(row)}; ${booleanLabel(column)}: ${valueLabel(row, column, value)}`}
                            className="flex min-w-0 cursor-help items-center justify-center px-1 text-[10px] font-semibold"
                            style={{
                              width: width + "%",
                              backgroundColor: colors[index % colors.length],
                              color: contrastTextColor(colors[index % colors.length]),
                            }}
                          >
                            <span className="truncate">
                              {labelCanFit ? label : ""}
                            </span>
                          </div>
                        </TapTooltip>
                      );
                    })}
                  </div>
                </Progress>
              ) : (
                <Empty className="min-h-12 py-2">
                  <EmptyTitle>Sin respuestas</EmptyTitle>
                </Empty>
              )}
            </div>
          );
        })}
        <div className="flex flex-wrap gap-x-4 gap-y-2 border-t border-surface-container-high pt-3 text-[11px] text-ink-600">
          {cross.columnCategories.map((column, index) => (
            <span key={column} className="flex items-center gap-1">
              <i
                className="size-2 rounded-sm"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              {booleanLabel(column)}
            </span>
          ))}
        </div>
        </div>
      </CardContent>
    </Card>
  );
}
