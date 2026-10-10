import { useEffect, useState } from "react";
import { apiRequest } from "@/api/client";
import { FilterToolbar } from "@/components/analytics/FilterToolbar";
import { StatusPanel } from "@/components/analytics/StatusPanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AnalyticsSummary } from "../api";
import type { Cross } from "../shared/analyticsTypes";
import { DatasetSelect, DistributionCard, PageHeading, useDatasets } from "../shared/AnalyticsPrimitives";
import { ChiSquareCard, CrossTable } from "../cross/CrossVisualizations";

type ChiResult = {
  estadistico: number;
  gradosLibertad: number;
  pValor: number;
  alfa: number;
  rechazaIndependencia: boolean;
};

export function FinancingCompletePage() {
  const { datasets, datasetId, setDatasetId, loading: datasetsLoading } = useDatasets("TITULADOS");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [cross, setCross] = useState<Cross | null>(null);
  const [chi, setChi] = useState<ChiResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [includeTotals, setIncludeTotals] = useState(true);
  const [colorHeatmap, setColorHeatmap] = useState(false);
  const rowField = "financiamiento_posgrado_estimado";
  const [columnField, setColumnField] = useState("nivel_posgrado_interes");
  const financingColumns = [
    { key: "nivel_posgrado_interes", label: "Nivel de posgrado de interés" },
    { key: "area_posgrado_interes", label: "Área de interés" },
    { key: "modalidad_posgrado", label: "Modalidad" },
  ];
  useEffect(() => {
    if (!datasetId) { setSummary(null); setCross(null); setChi(null); return; }
    setError(null);
    Promise.all([
      apiRequest<AnalyticsSummary>("/analytics/titulados/financing?datasetId=" + encodeURIComponent(datasetId) + filterQuery),
      apiRequest<Cross>("/analytics/crosses?datasetId=" + encodeURIComponent(datasetId) + "&rowField=" + rowField + "&columnField=" + columnField + filterQuery),
    ]).then(async ([nextSummary, nextCross]) => {
      setSummary(nextSummary); setCross(nextCross);
      const frequencies = nextCross.rowCategories.map((row) => nextCross.columnCategories.map((column) => nextCross.counts[row]?.[column] ?? 0));
      try {
        setChi(await apiRequest<ChiResult>("/analitica/chi-cuadrado", { method: "POST", body: JSON.stringify({ frecuencias: frequencies, alfa: 0.05 }) }));
      } catch { setChi(null); }
    }).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, [datasetId, columnField, filterQuery]);
  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <PageHeading title="Financiamiento" description="Fuente estimada para financiar estudios de posgrado y su relación con el nivel de interés." tone="titulados" />
      <DatasetSelect datasets={datasets} value={datasetId} onChange={setDatasetId} loading={datasetsLoading} />
      {error && <StatusPanel kind="warning" title="No se pudo cargar financiamiento" description={error} />}
      {summary && <FilterToolbar summary={summary} onQueryChange={setFilterQuery} />}
      {summary && <DistributionCard title="Fuente de financiamiento estimada para posgrado" distribution={summary.distributions.financiamiento_posgrado_estimado ?? { validCount: 0, counts: {}, percentages: {} }} tone="titulados" />}
      <Card className="rounded-xl border-0 shadow-sm"><CardContent className="flex flex-wrap items-center gap-4 py-4">
        <span className="label-default text-ink-600">FILAS: <strong className="text-ink-900">Fuente de financiamiento estimada</strong></span>
        <label className="label-default flex items-center gap-2">COLUMNAS:
          <Select value={columnField} onValueChange={setColumnField}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent>{financingColumns.map((field) => <SelectItem key={field.key} value={field.key}>{field.label}</SelectItem>)}</SelectContent></Select>
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-600"><Checkbox checked={includeTotals} onCheckedChange={(checked) => setIncludeTotals(checked === true)} /> Totales</label>
        <label className="flex items-center gap-2 text-sm text-ink-600"><Checkbox checked={colorHeatmap} onCheckedChange={(checked) => setColorHeatmap(checked === true)} /> Aplicar mapa de calor</label>
      </CardContent></Card>
      {cross && <><CrossTable cross={cross} includeTotals={includeTotals} colorHeatmap={colorHeatmap} metric="count" /><div className="w-full"><ChiSquareCard result={chi} cross={cross} /></div></>}
    </div>
  );
}

export function FinancingPage() {
  const { datasets, datasetId, setDatasetId, loading: datasetsLoading } = useDatasets("TITULADOS");
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [cross, setCross] = useState<Cross | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowField, setRowField] = useState("financiamiento_posgrado_estimado");
  const [columnField, setColumnField] = useState("nivel_posgrado_interes");
  useEffect(() => {
    if (!datasetId) { setSummary(null); return; }
    setLoading(true); setError(null);
    apiRequest<AnalyticsSummary>(`/analytics/titulados/financing?datasetId=${encodeURIComponent(datasetId)}${filterQuery}`).then(setSummary).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause))).finally(() => setLoading(false));
  }, [datasetId, filterQuery]);
  async function loadCross() {
    if (!datasetId || rowField === columnField) return;
    setLoading(true); setError(null);
    try { setCross(await apiRequest<Cross>(`/analytics/crosses?datasetId=${encodeURIComponent(datasetId)}&rowField=${encodeURIComponent(rowField)}&columnField=${encodeURIComponent(columnField)}${filterQuery}`)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadCross(); }, [datasetId, rowField, columnField, filterQuery]);
  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <PageHeading title="Financiamiento" description="Fuente estimada para financiar estudios de posgrado y su relación con el nivel de interés." tone="titulados" />
      <DatasetSelect datasets={datasets} value={datasetId} onChange={setDatasetId} loading={datasetsLoading} />
      {summary && <FilterToolbar summary={summary} onQueryChange={setFilterQuery} />}
      {error && <StatusPanel kind="warning" title="No se pudo cargar financiamiento" description={error} />}
      {loading && <StatusPanel kind="loading" title="Cargando financiamiento" description="Consultando las respuestas del dataset." />}
      {summary && <><FilterToolbar summary={summary} onQueryChange={setFilterQuery} /><DistributionCard title="Fuente de financiamiento estimada para posgrado" distribution={summary.distributions.financiamiento_posgrado_estimado ?? { validCount: 0, counts: {}, percentages: {} }} tone="titulados" />
        <Card className="rounded-xl border-0 shadow-sm"><CardHeader><CardTitle className="title-card">Cruce: financiamiento vs. nivel de posgrado</CardTitle><CardDescription>Selecciona las variables y genera la tabla de contingencia.</CardDescription></CardHeader><CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="label-default grid gap-1">Filas<Select value={rowField} onValueChange={setRowField}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="financiamiento_posgrado_estimado">Fuente de financiamiento estimada</SelectItem><SelectItem value="financiamiento_posgrado_cursado">Financiamiento del posgrado cursado</SelectItem></SelectContent></Select></label>
          <label className="label-default grid gap-1">Columnas<Select value={columnField} onValueChange={setColumnField}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="nivel_posgrado_interes">Nivel de posgrado de interés</SelectItem><SelectItem value="area_posgrado_interes">Área de interés</SelectItem><SelectItem value="modalidad_posgrado">Modalidad</SelectItem></SelectContent></Select></label>
          <Button onClick={loadCross} disabled={loading || !datasetId || rowField === columnField}>Generar tabla</Button>
        </CardContent></Card>
        {cross && <CrossTable cross={cross} includeTotals colorHeatmap={false} metric="count" />}
      </>}
    </div>
  );
}
