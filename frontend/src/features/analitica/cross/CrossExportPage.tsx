import { useEffect, useState, useRef } from "react";
import { ArrowLeftRight, Download } from "lucide-react";
import { apiRequest } from "@/api/client";
import { FilterToolbar } from "@/components/analytics/FilterToolbar";
import { StatusPanel } from "@/components/analytics/StatusPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnalyticsSummary } from "../api";
import type { Cross, CrossMetric, Domain, Tone } from "../shared/analyticsTypes";
import { DatasetSelect, PageHeading, labelFor, useDatasets } from "../shared/AnalyticsPrimitives";
import { crossMetricLabel, exportCrossCsv, exportCrossExcel, exportCrossPng } from "../shared/crossExportUtils";
import { printAnalyticsPdf } from "@/components/analytics/PrintButton";
import { ChiSquareCard, CrossBars, CrossTable } from "./CrossVisualizations";

type ChiResult = {
  estadistico: number;
  gradosLibertad: number;
  pValor: number;
  alfa: number;
  rechazaIndependencia: boolean;
};

export function CrossExportPage({ domain }: { domain: Domain }) {
  const tone: Tone = domain === "TITULADOS" ? "titulados" : "empleadores";
  const {
    datasets,
    datasetId,
    setDatasetId,
    loading: datasetsLoading,
  } = useDatasets(domain);
  const [rowField, setRowField] = useState(
    domain === "TITULADOS" ? "situacion_laboral_actual" : "tipo_organizacion",
  );
  const [columnField, setColumnField] = useState(
    domain === "TITULADOS" ? "interes_posgrado" : "tamano_organizacion",
  );
  const [cross, setCross] = useState<Cross | null>(null);
  const [chi, setChi] = useState<ChiResult | null>(null);
  const [filterSummary, setFilterSummary] = useState<AnalyticsSummary | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [includeTotals, setIncludeTotals] = useState(true);
  const [metric, setMetric] = useState<CrossMetric>("count");
  const [colorHeatmap, setColorHeatmap] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<"table" | "bars">("table");
  const fields =
    domain === "TITULADOS"
      ? [
          { key: "edad_rango", label: "Rango de edad", group: "Perfil" },
          { key: "genero", label: "Género", group: "Perfil" },
          {
            key: "segmento_titulacion",
            label: "Segmento (Junior / Consolidado)",
            group: "Perfil",
          },
          {
            key: "situacion_laboral_actual",
            label: "Estado laboral",
            group: "Perfil",
          },
          { key: "sector_trabajo", label: "Sector laboral", group: "Perfil" },
          {
            key: "tiene_formacion_complementaria",
            label: "Formación complementaria (Sí/No)",
            group: "Formación",
          },
          {
            key: "interes_posgrado",
            label: "Interés en posgrado (Sí/No)",
            group: "Formación",
          },
          {
            key: "nivel_posgrado_interes",
            label: "Nivel de posgrado de interés",
            group: "Formación",
          },
          {
            key: "area_posgrado_interes",
            label: "Área de interés",
            group: "Formación",
          },
          {
            key: "modalidad_posgrado",
            label: "Modalidad preferida",
            group: "Formación",
          },
          {
            key: "financiamiento_posgrado_estimado",
            label: "Fuente de financiamiento estimada",
            group: "Formación",
          },
          {
            key: "rubro_trabajo_actual",
            label: "Rubro de la organización",
            group: "Trabajo",
          },
          {
            key: "antiguedad_trabajo",
            label: "Antigüedad en el trabajo",
            group: "Trabajo",
          },
          {
            key: "remuneracion_rango",
            label: "Remuneración mensual",
            group: "Trabajo",
          },
          {
            key: "primera_experiencia_laboral",
            label: "¿Es su primer empleo? (Sí/No)",
            group: "Trabajo",
          },
        ]
      : [
          {
            key: "tipo_organizacion",
            label: "Tipo de organización",
            group: "Perfil",
          },
          {
            key: "tamano_organizacion",
            label: "Tamaño de organización",
            group: "Perfil",
          },
          {
            key: "rubro_organizacion",
            label: "Rubro de la organización",
            group: "Perfil",
          },
          {
            key: "contrato_titulados_ultimos_5_anios",
            label: "Contratación reciente",
            group: "Perfil",
          },
        ];
  const fieldGroups = Array.from(
    new Set(fields.map((field) => field.group)),
  ).map((group) => ({
    group,
    fields: fields.filter((field) => field.group === group),
  }));
  async function loadCross() {
    if (!datasetId || rowField === columnField) return;
    setLoading(true);
    setError(null);
    try {
      const nextCross = await apiRequest<Cross>(
          `/analytics/crosses?datasetId=${encodeURIComponent(datasetId)}&rowField=${encodeURIComponent(rowField)}&columnField=${encodeURIComponent(columnField)}${domain === "TITULADOS" ? filterQuery : ""}`,
      );
      setCross(nextCross);
      try {
        const frequencies = nextCross.rowCategories.map((row) => nextCross.columnCategories.map((column) => nextCross.counts[row]?.[column] ?? 0));
        setChi(await apiRequest<ChiResult>("/analitica/chi-cuadrado", { method: "POST", body: JSON.stringify({ frecuencias: frequencies, alfa: 0.05 }) }));
      } catch {
        setChi(null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void loadCross();
  }, [datasetId, rowField, columnField, filterQuery, domain]);
  useEffect(() => {
    if (domain !== "TITULADOS" || !datasetId) { setFilterSummary(null); return; }
    apiRequest<AnalyticsSummary>(`/analytics/titulados/summary?datasetId=${encodeURIComponent(datasetId)}&fields=anio_titulacion,situacion_laboral_actual,sector_trabajo${filterQuery}`)
      .then(setFilterSummary)
      .catch(() => setFilterSummary(null));
  }, [datasetId, domain, filterQuery]);
  const rowLabel = labelFor(rowField);
  const columnLabel = labelFor(columnField);
  return (
    <div className="cross-screen-page mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <PageHeading
          title="Cruces de variables"
          description="Configura una matriz de frecuencias y revisa su distribución en tabla o barras."
          tone={tone}
        />
      </div>
      <DatasetSelect
        datasets={datasets}
        value={datasetId}
        onChange={setDatasetId}
        loading={datasetsLoading}
      />
      {filterSummary && <FilterToolbar summary={filterSummary} onQueryChange={setFilterQuery} />}
      <div className="cross-screen-grid grid items-start gap-5 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        <div className="cross-screen-controls space-y-5">
          <Card className="rounded-xl border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="title-card flex items-center justify-between">
                Configurar cruce
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-7"
                        aria-label="Intercambiar filas y columnas"
                        onClick={() => {
                          setRowField(columnField);
                          setColumnField(rowField);
                        }}
                      >
                        <ArrowLeftRight className="size-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={6}>
                      Intercambiar filas y columnas
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="label-default grid gap-1">
                Filas
                <Select value={rowField} onValueChange={setRowField}>
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldGroups.map(({ group, fields: groupFields }) => (
                      <SelectGroup
                        key={group}
                        className="border-t border-border-line px-1 first:border-t-0"
                      >
                        <SelectLabel className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-ink-600">
                          {group}
                        </SelectLabel>
                        {groupFields.map((field) => (
                          <SelectItem
                            key={field.key}
                            value={field.key}
                            disabled={field.key === columnField}
                            className="data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45"
                          >
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="label-default grid gap-1">
                Columnas
                <Select value={columnField} onValueChange={setColumnField}>
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldGroups.map(({ group, fields: groupFields }) => (
                      <SelectGroup
                        key={group}
                        className="border-t border-border-line px-1 first:border-t-0"
                      >
                        <SelectLabel className="px-2 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-ink-600">
                          {group}
                        </SelectLabel>
                        {groupFields.map((field) => (
                          <SelectItem
                            key={field.key}
                            value={field.key}
                            disabled={field.key === rowField}
                            className="data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45"
                          >
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <div className="space-y-3 border-t border-border-line pt-3 text-xs text-ink-600">
                <p className="caption-bold text-ink-600">MÉTRICA DE CELDA</p>
                <RadioGroup
                  value={metric}
                  onValueChange={(value) => setMetric(value as CrossMetric)}
                  className="gap-2"
                >
                  <label className="flex items-start gap-2">
                    <RadioGroupItem value="count" />
                    <span>
                      Cantidad
                    </span>
                  </label>
                  {activeView === "table" && (
                    <>
                      <label className="flex items-center gap-2">
                        <RadioGroupItem value="rowPercent" />
                        <span>% por fila</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <RadioGroupItem value="columnPercent" />
                        <span>% por columna</span>
                      </label>
                    </>
                  )}
                  {activeView === "bars" && (
                    <label className="flex items-center gap-2">
                      <RadioGroupItem value="rowPercent" />
                      <span>% por fila</span>
                    </label>
                  )}
                </RadioGroup>
                <div
                  className={
                    activeView === "table"
                      ? "space-y-2 border-t border-border-line pt-3"
                      : "hidden"
                  }
                >
                  <p className="caption-bold text-ink-600">
                    OPCIONES DE CÁLCULO
                  </p>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={includeTotals}
                      onCheckedChange={(checked) =>
                        setIncludeTotals(checked === true)
                      }
                    />
                    <span>Incluir marginales (totales)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={colorHeatmap}
                      onCheckedChange={(checked) =>
                        setColorHeatmap(checked === true)
                      }
                    />
                    <span>Colorear mapa de calor</span>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="cross-screen-results min-w-0 space-y-4">
          <Tabs
            value={activeView}
            onValueChange={(view) => {
              setActiveView(view as "table" | "bars");
              if (view === "bars" && metric === "columnPercent") {
                setMetric("count");
              }
            }}
          >
            <TabsList variant="line" className="w-full justify-start text-xs">
              <TabsTrigger value="table">Tabla</TabsTrigger>
              <TabsTrigger value="bars">Barras comparativas</TabsTrigger>
            </TabsList>
          </Tabs>
          {loading && (
            <StatusPanel
              kind="loading"
              title="Calculando cruce"
              description="Actualizando la matriz con las variables seleccionadas."
            />
          )}
          {error && (
            <StatusPanel
              kind="warning"
              title="No se pudo calcular el cruce"
              description={error}
            />
          )}
          {cross ? (
            activeView === "bars" ? (
              <CrossBars
                cross={cross}
                action={cross && <CrossDownloadMenu cross={cross} metric={metric} includeTotals={includeTotals} colorHeatmap={colorHeatmap} activeView={activeView} rowLabel={rowLabel} columnLabel={columnLabel} domain={domain} datasetName={datasets.find((dataset) => dataset.id === datasetId)?.displayName ?? datasetId ?? "No especificado"} filters={filterQuery ? "Filtros aplicados" : "Sin filtros"} />}
                metric={metric}
                totalResponses={
                  datasets.find((dataset) => dataset.id === datasetId)
                    ?.rowsValid
                }
              />
            ) : (
              <CrossTable
                cross={cross}
                totalResponses={
                  datasets.find((dataset) => dataset.id === datasetId)
                    ?.rowsValid
                }
                includeTotals={includeTotals}
                colorHeatmap={colorHeatmap}
                metric={metric}
                rowLabel={rowLabel}
                columnLabel={columnLabel}
                action={cross && <CrossDownloadMenu cross={cross} metric={metric} includeTotals={includeTotals} colorHeatmap={colorHeatmap} activeView={activeView} rowLabel={rowLabel} columnLabel={columnLabel} domain={domain} datasetName={datasets.find((dataset) => dataset.id === datasetId)?.displayName ?? datasetId ?? "No especificado"} filters={filterQuery ? "Filtros aplicados" : "Sin filtros"} />}
              />
            )
          ) : (
            <StatusPanel
              kind="info"
              title="Genera una matriz de cruce"
              description="Selecciona las variables de filas y columnas para mostrar la tabla bivariada."
            />
          )}
          {cross && (
            <div className="print-only print-page cross-pdf-page space-y-4" aria-label="Versión de impresión del cruce">
              <h2 className="title-card">{labelFor(rowField)} × {labelFor(columnField)}</h2>
              <p className="text-sm text-ink-600">{crossMetricLabel(metric)} · n = {cross.validCount} de {datasets.find((dataset) => dataset.id === datasetId)?.rowsValid ?? cross.validCount}</p>
              <p className="text-xs text-ink-600">Dataset: {datasets.find((dataset) => dataset.id === datasetId)?.displayName ?? datasetId} · Generado: {new Intl.DateTimeFormat("es-BO", { timeZone: "America/La_Paz", dateStyle: "short" }).format(new Date())}</p>
              <p className="text-xs text-ink-600">Filtros: {filterQuery ? "Filtros aplicados" : "Sin filtros"}</p>
              <CrossTable cross={cross} totalResponses={datasets.find((dataset) => dataset.id === datasetId)?.rowsValid} includeTotals={includeTotals} colorHeatmap={colorHeatmap} metric={metric} rowLabel={rowLabel} columnLabel={columnLabel} />
              <div className="print-card"><CrossBars cross={cross} metric={metric} totalResponses={datasets.find((dataset) => dataset.id === datasetId)?.rowsValid} /></div>
              <ChiSquareCard result={chi} cross={cross} />
              <div className="cross-pdf-footer border-t border-surface-container-high pt-2 text-xs text-ink-600">
                <p>Base del cruce: n = {cross.validCount} respuestas válidas de {datasets.find((dataset) => dataset.id === datasetId)?.rowsValid ?? cross.validCount} registros.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CrossDownloadMenu({
  cross,
  metric,
  includeTotals,
  colorHeatmap,
  activeView,
  rowLabel,
  columnLabel,
  domain,
  datasetName,
  filters,
}: {
  cross: Cross;
  metric: CrossMetric;
  includeTotals: boolean;
  colorHeatmap: boolean;
  activeView: "table" | "bars";
  rowLabel: string;
  columnLabel: string;
  domain: Domain;
  datasetName: string;
  filters: string;
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeWhenClickingOutside = (event: MouseEvent) => {
      if (menuRef.current?.open && event.target instanceof Node && !menuRef.current.contains(event.target)) {
        menuRef.current.open = false;
      }
    };
    document.addEventListener("mousedown", closeWhenClickingOutside);
    return () => document.removeEventListener("mousedown", closeWhenClickingOutside);
  }, []);
  const download = (format: "csv" | "xlsx" | "png" | "pdf") => {
    if (format === "csv") exportCrossCsv(cross, metric, includeTotals, rowLabel);
    if (format === "xlsx") exportCrossExcel(cross, metric, includeTotals, colorHeatmap, { dataset: datasetName, filters }, rowLabel, columnLabel);
    if (format === "png") exportCrossPng(cross, metric, includeTotals, colorHeatmap, activeView, rowLabel, columnLabel);
    if (format === "pdf") void printAnalyticsPdf(domain, "cruce");
    if (menuRef.current) menuRef.current.open = false;
  };
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <details ref={menuRef} className="relative">
        <summary className="flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted">
          <Download className="size-4" /> Descargar <span aria-hidden="true">▾</span>
        </summary>
        <div className="absolute right-0 z-30 mt-2 w-64 rounded-lg border border-border-line bg-white p-1.5 shadow-lg">
          <CrossDownloadOption label="Tabla CSV" help="Matriz tal como se ve" onClick={() => download("csv")} />
          <CrossDownloadOption label="Excel (.xlsx)" help="Matriz + hoja de parámetros" onClick={() => download("xlsx")} />
          <CrossDownloadOption label="Imagen PNG" help={activeView === "table" ? "Tabla tal como se ve" : "Solo el gráfico de barras"} onClick={() => download("png")} />
          <CrossDownloadOption label="PDF de esta vista" help="Tabla y barras · A4 horizontal" onClick={() => download("pdf")} />
        </div>
      </details>
    </div>
  );
}

function CrossDownloadOption({ label, help, disabled = false, onClick }: { label: string; help: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="flex w-full flex-col items-start rounded-md px-2.5 py-2 text-left hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-45">
      <span className="text-sm font-medium text-ink-900">{label}</span>
      <span className="text-xs text-ink-600">{help}</span>
    </button>
  );
}
