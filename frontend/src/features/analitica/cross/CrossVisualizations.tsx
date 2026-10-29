import type { ReactNode } from "react";
import { Badge } from "@/components/analytics/Badge";
import { contrastTextColor } from "@/lib/utils";
import type { Cross, CrossMetric, Tone } from "../shared/analyticsTypes";
import { CROSS_COLORS, RESIDUAL_THRESHOLD, booleanLabel, crossResidual, formatResidual } from "../shared/crossExportUtils";
import type { ResultadoPruebaAsociacion } from "../api";
import { Empty, EmptyTitle } from "@/components/ui/empty";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useChartContainerWidth } from "@/components/analytics/charts/useChartContainerSize";
import { TapTooltip } from "@/components/analytics/TapTooltip";

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

/** Color base del mapa de calor según la sección. */
const HEAT_RGB: Record<Tone, string> = { titulados: "31,111,181", empleadores: "20,163,154" };

const percentText = (value: number) => `${value.toFixed(1).replace(".", ",")} %`;

/**
 * Tabla de contingencia. Se adapta a cualquier número de categorías: la columna de categorías queda fija al
 * desplazar horizontalmente, los encabezados largos se ajustan por palabras (hasta tres líneas, con el texto
 * completo al pasar el cursor) y cada celda ofrece conteo, % de fila y % de columna en su detalle.
 */
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
  tone = "titulados",
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
  tone?: Tone;
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
  const columnTotal = (column: string) => displayRows.reduce((sum, row) => sum + rawCellValue(row, column), 0);
  const rowTotal = (row: string) => displayColumns.reduce((sum, column) => sum + rawCellValue(row, column), 0);
  const share = (value: number, total: number) => (total ? (value * 100) / total : 0);
  const residualMode = metric === "residual";
  const showTotals = includeTotals && !residualMode;
  const cellValue = (row: string, column: string) =>
    metric === "count"
      ? rawCellValue(row, column)
      : metric === "rowPercent"
        ? share(rawCellValue(row, column), rowTotal(row))
        : metric === "columnPercent"
          ? share(rawCellValue(row, column), columnTotal(column))
          : crossResidual(cross, swapAxes ? column : row, swapAxes ? row : column);
  const max = Math.max(1, ...displayRows.flatMap((row) => displayColumns.map((column) => Math.abs(cellValue(row, column)))));
  const formatValue = (value: number) =>
    metric === "count" ? value.toLocaleString("es-BO") : residualMode ? formatResidual(value) : percentText(value);
  const metricLabel =
    metric === "count" ? "Frecuencia absoluta" : metric === "rowPercent" ? "% por fila" : metric === "columnPercent" ? "% por columna" : "Residuo ajustado";
  const marginalPercent = (value: number) => percentText(share(value, cross.validCount));
  const heat = (intensity: number) => `rgba(${HEAT_RGB[tone]},${0.08 + intensity * 0.75})`;
  // Residuos: escala divergente fija hasta ±3 (o el máximo observado), azul si sobra, rojo si falta.
  const residualScale = Math.max(3, max);
  // Bajo el umbral el color es tenue; al superarlo pasa a un tono claramente más intenso.
  const residualColor = (value: number) => {
    const size = Math.abs(value);
    const alpha =
      size < RESIDUAL_THRESHOLD
        ? 0.04 + (size / RESIDUAL_THRESHOLD) * 0.22
        : 0.45 + Math.min(1, (size - RESIDUAL_THRESHOLD) / Math.max(0.5, residualScale - RESIDUAL_THRESHOLD)) * 0.4;
    return `rgba(${value >= 0 ? "31,111,181" : "214,69,65"},${alpha})`;
  };
  const cellBackground = (value: number) => (residualMode ? residualColor(value) : colorHeatmap ? heat(value / max) : undefined);
  // Celdas de la columna fija: fondo opaco para que los valores no se vean por debajo al desplazar.
  const stickyCell = "sticky left-0 z-10 border-r border-border-line shadow-[4px_0_6px_-4px_rgb(15_23_42/0.12)]";
  const headCell = "border-b border-border-line bg-surface-container-low p-2 align-bottom text-xs font-semibold text-ink-700";
  return (
    <Card className="min-w-0 overflow-visible">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="title-card">{displayRowLabel} × {displayColumnLabel}</CardTitle>
            <CardDescription>
              {metricLabel} · n = {cross.validCount}
              {totalResponses != null ? ` de ${totalResponses}` : ""}
              {cross.smallSample ? " · muestra reducida" : ""}
              {" · "}
              {displayRows.length} × {displayColumns.length} categorías
            </CardDescription>
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="min-w-0">
        <div
          className="cross-table-scroll max-w-full overflow-x-auto rounded-lg border border-border-line focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          tabIndex={0}
          role="region"
          aria-label={`Tabla de ${displayRowLabel} por ${displayColumnLabel}`}
        >
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th rowSpan={2} scope="col" className={`${headCell} ${stickyCell} bg-surface-container-low text-left align-bottom`}>
                  <div className="w-36 sm:w-52">{displayRowLabel}</div>
                </th>
                <th colSpan={displayColumns.length} scope="colgroup" className={`${headCell} border-l-0 text-center`}>
                  {displayColumnLabel}
                </th>
                {showTotals && (
                  <th rowSpan={2} scope="col" className={`${headCell} border-l border-border-line text-right`}>
                    <div className="min-w-16">Total fila</div>
                  </th>
                )}
              </tr>
              <tr>
                {displayColumns.map((column) => (
                  <th key={column} scope="col" className={`${headCell} text-right font-medium`} title={booleanLabel(column)}>
                    <div className="ml-auto line-clamp-3 w-24 text-balance break-normal hyphens-auto whitespace-normal leading-tight sm:w-28" lang="es">
                      {booleanLabel(column)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row) => {
                const totalRow = rowTotal(row);
                return (
                  <tr key={row} className="group/row">
                    <th scope="row" className={`${stickyCell} border-b border-border-line bg-white p-2 text-left font-medium text-ink-900 group-hover/row:bg-surface-container-low`}>
                      <div className="w-36 leading-snug whitespace-normal sm:w-52">{booleanLabel(row)}</div>
                    </th>
                    {displayColumns.map((column) => {
                      const value = cellValue(row, column);
                      const count = rawCellValue(row, column);
                      const background = cellBackground(value);
                      const notable = residualMode && Math.abs(value) >= RESIDUAL_THRESHOLD;
                      return (
                        <td
                          key={column}
                          className={`border-b border-border-line p-0 text-right tabular-nums transition-[background-color,color] duration-300 ease-out group-hover/row:bg-surface-container-low/60 ${notable ? "font-bold" : "font-medium"}`}
                          style={background ? { backgroundColor: background, color: contrastTextColor(background) } : undefined}
                        >
                          <TapTooltip
                            side="top"
                            content={
                              <div className="grid gap-0.5 text-xs">
                                <strong className="text-ink-900">{booleanLabel(row)}</strong>
                                <span className="text-ink-600">{booleanLabel(column)}</span>
                                <span className="mt-1 tabular-nums">
                                  {count.toLocaleString("es-BO")} respuestas · {percentText(share(count, totalRow))} de la fila ·{" "}
                                  {percentText(share(count, columnTotal(column)))} de la columna
                                </span>
                                {residualMode && (
                                  <span className="tabular-nums text-ink-600">
                                    Residuo ajustado {formatResidual(value)}
                                    {notable ? (value > 0 ? " · más casos de los esperados" : " · menos casos de los esperados") : " · dentro de lo esperado"}
                                  </span>
                                )}
                              </div>
                            }
                          >
                            <span
                              tabIndex={0}
                              aria-label={`${booleanLabel(row)}, ${booleanLabel(column)}: ${formatValue(value)}`}
                              className="block cursor-help px-2 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
                            >
                              {formatValue(value)}
                            </span>
                          </TapTooltip>
                        </td>
                      );
                    })}
                    {showTotals && (
                      <td className="border-b border-l border-border-line bg-surface-container-low p-2 text-right font-semibold tabular-nums">
                        {metric === "count" ? totalRow.toLocaleString("es-BO") : metric === "rowPercent" ? "100,0 %" : marginalPercent(totalRow)}
                      </td>
                    )}
                  </tr>
                );
              })}
              {showTotals && (
                <tr className="font-semibold">
                  <th scope="row" className={`${stickyCell} border-t-2 border-t-border-line bg-surface-container-low p-2 text-left`}>
                    Total columna
                  </th>
                  {displayColumns.map((column) => (
                    <td key={column} className="border-t-2 border-border-line bg-surface-container-low p-2 text-right tabular-nums">
                      {metric === "count"
                        ? columnTotal(column).toLocaleString("es-BO")
                        : metric === "columnPercent"
                          ? "100,0 %"
                          : marginalPercent(columnTotal(column))}
                    </td>
                  ))}
                  <td className="border-t-2 border-l border-border-line bg-surface-container-low p-2 text-right tabular-nums">
                    {metric === "count" ? cross.validCount.toLocaleString("es-BO") : "100,0 %"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-ink-600">
          Toca o pasa el cursor sobre una celda para ver su conteo, % de fila y % de columna.
          {displayColumns.length > 4 ? " Desliza la tabla hacia los lados: la columna de categorías queda fija." : ""}
        </p>
        {residualMode && (
          <div className="mt-4 space-y-2 border-t border-surface-container-high pt-3 text-xs text-ink-600">
            <div className="flex items-center justify-between gap-3">
              <span>Menos casos de los esperados</span>
              <span>Más casos de los esperados</span>
            </div>
            <div className="h-2 rounded-full" style={{ background: `linear-gradient(to right, ${residualColor(-residualScale)}, ${residualColor(0)}, ${residualColor(residualScale)})` }} />
            <p>
              El residuo ajustado compara cada celda con lo esperado si las dos variables fueran independientes. En negrita, |r| ≥ 1,96: la
              combinación se aparta de la independencia (≈ 5 %). Con muchas celdas alguna puede superar el umbral por azar; léelo junto con la
              prueba de asociación.
            </p>
          </div>
        )}
        {colorHeatmap && !residualMode && (
          <div className="mt-4 border-t border-surface-container-high pt-3 text-xs text-ink-600">
            <div className="flex items-center justify-between">
              <span>Escala de {metricLabel.toLowerCase()}</span>
              <span>0 · {formatValue(max)}</span>
            </div>
            <div className="mt-1 h-2 rounded-full" style={{ background: `linear-gradient(to right, ${heat(0)}, ${heat(1)})` }} />
          </div>
        )}
        {observedSmallSampleSummary(cross) && (
          <p className="mt-3 text-xs text-amber-800">{observedSmallSampleSummary(cross)}</p>
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
  const colors = CROSS_COLORS;
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
    metric === "rowPercent" ? "% por fila · perfiles al 100 %" : "Frecuencia absoluta";
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
                <span className="min-w-0 truncate font-medium text-ink-900" title={booleanLabel(row)}>
                  {booleanLabel(row)} (n = {totalRow})
                </span>
                <span className="shrink-0 text-ink-600">
                  {((totalRow * 100) / total).toFixed(1).replace(".", ",")} % del
                  total
                </span>
              </div>
              {totalRow > 0 ? (
                <Progress
                  // Con % por fila cada barra ocupa el 100 %: se comparan los perfiles de las categorías.
                  value={metric === "rowPercent" ? 100 : (totalRow * 100) / maxRowTotal}
                  className="bg-surface-container-high"
                >
                  <div className="flex h-full w-full">
                    {cross.columnCategories.map((column, index) => {
                      const value = cross.counts[row]?.[column] ?? 0;
                      if (value <= 0) return null;
                      const width = (value * 100) / totalRow;
                      const label = valueLabel(row, column, value);
                      const actualSegmentWidth = (value / (metric === "rowPercent" ? totalRow : maxRowTotal)) * chartWidth;
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
