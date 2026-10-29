import { useEffect, useState } from "react";
import { apiRequest } from "@/api/client";
import { navigate } from "@/app/navigation";
import { useDatasetContext } from "@/app/DatasetContext";
import { Badge } from "@/components/analytics/Badge";
import { ChartCard } from "@/components/analytics/ChartCard";
import { StatusPanel } from "@/components/analytics/StatusPanel";
import { TapTooltip } from "@/components/analytics/TapTooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeading } from "@/features/analitica/shared/AnalyticsPrimitives";
import { downloadCsv } from "@/features/empleadores/employerData";
import { GapBarsChart, MeansDumbbellChart } from "./ComparisonCharts";
import { decimal, effectSize, groupLabel, pValue, signed, type Comparison, type ComparisonCompetence } from "./comparisonTypes";

export function ComparacionPage() {
  const { datasets, activeIds, loading: datasetsLoading } = useDatasetContext();
  const tituladosId = activeIds.TITULADOS;
  const empleadoresId = activeIds.EMPLEADORES;
  const [data, setData] = useState<Comparison | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tituladosId || !empleadoresId) {
      setData(null);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    apiRequest<Comparison>(
      `/analytics/comparison/competencies?tituladosDatasetId=${encodeURIComponent(tituladosId)}&empleadoresDatasetId=${encodeURIComponent(empleadoresId)}&alfa=0.05`,
      { signal: controller.signal },
    )
      .then((result) => { if (!controller.signal.aborted) setData(result); })
      .catch((cause) => {
        if (controller.signal.aborted) return;
        setData(null);
        setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tituladosId, empleadoresId]);

  // Mientras se cargan los datasets no se afirma que falten datos (antes aparecía «Faltan datos» un instante).
  const missing = datasetsLoading
    ? []
    : ([!datasets.TITULADOS.length && "titulados", !datasets.EMPLEADORES.length && "empleadores"].filter(Boolean) as string[]);

  const competencias = data?.competencias ?? [];
  const tested = competencias.filter((item) => item.prueba.aplicable);
  const significant = tested.filter((item) => item.prueba.significativa);
  const largestGap = competencias
    .filter((item) => item.diferenciaMedias != null)
    .sort((a, b) => Math.abs(b.diferenciaMedias ?? 0) - Math.abs(a.diferenciaMedias ?? 0))[0];
  const loadingData = loading || (datasetsLoading && !data);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <PageHeading
        title="Cruce titulados y empleadores"
        description="Compara, competencia por competencia, cómo valoran los titulados su preparación y qué nivel observan los empleadores. Ambas encuestas usan la misma escala de 1 (muy insuficiente) a 5 (muy suficiente)."
        tone="titulados"
      />

      {missing.length > 0 ? (
        <StatusPanel
          kind="warning"
          title="Faltan datos para comparar"
          description={`Carga la encuesta de ${missing.join(" y de ")} para habilitar el cruce entre ambas.`}
        >
          <Button size="sm" variant="outline" onClick={() => navigate("/cargar-datos")}>Ir a Cargar datos</Button>
        </StatusPanel>
      ) : (
        <>
          {loadingData && <StatusPanel kind="loading" title="Calculando comparación" description="Aplicando la prueba U de Mann-Whitney en cada competencia." />}
          {error && <StatusPanel kind="warning" title="No se pudo calcular la comparación" description={error} />}
          {data && !loading && (
            <>
              <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Kpi label="Competencias comparadas" value={String(competencias.length)} detail={`${tested.length} con muestra suficiente para la prueba`} />
                <Kpi label="Diferencias significativas" value={String(significant.length)} detail={`p ajustado (${data.ajusteMultiple}) < ${decimal(data.alfa)}`} />
                <Kpi
                  label="Mayor brecha de medias"
                  value={largestGap ? signed(largestGap.diferenciaMedias) : "—"}
                  detail={largestGap ? largestGap.name : "Sin datos"}
                />
                <Kpi label="Datasets" value="2" detail={`${data.tituladosDataset} · ${data.empleadoresDataset}`} />
              </section>

              <div className="grid gap-5 xl:grid-cols-2">
                <ChartCard
                  title="Medias por competencia"
                  help="Cada fila une la media de titulados (autopercepción) con la de empleadores (nivel observado) en la escala 1–5; el segmento gris es la brecha. ◆ marca las competencias que difieren de forma significativa tras el ajuste de Holm. Toque o pase el cursor por una fila para ver n, Δ y p."
                  onExportCsv={() => exportMeans(data)}
                >
                  <MeansDumbbellChart items={competencias} />
                </ChartCard>
                <ChartCard
                  title="Brecha por competencia (empleadores − titulados)"
                  help="Diferencia de medias, de la más negativa a la más positiva. Negativo: los empleadores observan menos de lo que los titulados perciben en sí mismos. El color indica si la diferencia es significativa (Holm, α = 0,05)."
                  onExportCsv={() => exportMeans(data)}
                >
                  <GapBarsChart items={competencias} />
                </ChartCard>
              </div>

              <ChartCard
                title="Prueba por competencia"
                help="Δ = empleadores − titulados. p ajustado con Holm sobre las competencias con prueba aplicable. Efecto: r biserial por rangos, de −1 a 1."
                onExportCsv={() => exportTests(data)}
              >
                <div className="overflow-x-auto">
                  <Table className="min-w-[900px] text-sm">
                    <TableHeader>
                      <TableRow className="bg-surface-container-low hover:bg-surface-container-low">
                        <TableHead className="p-2">Competencia</TableHead>
                        <TableHead className="p-2 text-right">Titulados<br /><span className="font-normal">media (n)</span></TableHead>
                        <TableHead className="p-2 text-right">Empleadores<br /><span className="font-normal">media (n)</span></TableHead>
                        <TableHead className="p-2 text-right">Δ medias</TableHead>
                        <TableHead className="p-2 text-right">Δ medianas</TableHead>
                        <TableHead className="p-2">Prueba</TableHead>
                        <TableHead className="p-2 text-right">p</TableHead>
                        <TableHead className="p-2 text-right">p ajustado</TableHead>
                        <TableHead className="p-2 text-right">Efecto (r)</TableHead>
                        <TableHead className="p-2">Resultado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {competencias.map((item) => (
                        <TableRow key={item.code} className="border-t hover:bg-transparent">
                          <TableCell className="p-2 font-medium">{item.name}</TableCell>
                          <TableCell className="p-2 text-right tabular-nums">{decimal(item.titulados.media)} ({item.titulados.n})</TableCell>
                          <TableCell className="p-2 text-right tabular-nums">
                            {decimal(item.empleadores.media)} ({item.empleadores.n})
                            {item.empleadores.noObservado > 0 && <span className="block text-[11px] text-ink-600">{item.empleadores.noObservado} no observado</span>}
                          </TableCell>
                          <TableCell className={`p-2 text-right font-semibold tabular-nums ${(item.diferenciaMedias ?? 0) < 0 ? "text-amber-700" : "text-emerald-700"}`}>
                            {signed(item.diferenciaMedias)}
                          </TableCell>
                          <TableCell className="p-2 text-right tabular-nums">{signed(item.diferenciaMedianas)}</TableCell>
                          <TableCell className="p-2 text-xs">
                            <TapTooltip content={item.prueba.motivo}>
                              <button type="button" className="cursor-help text-left underline decoration-dotted underline-offset-2">{item.prueba.nombre}</button>
                            </TapTooltip>
                          </TableCell>
                          <TableCell className="p-2 text-right tabular-nums">{pValue(item.prueba.pValor)}</TableCell>
                          <TableCell className="p-2 text-right tabular-nums">{pValue(item.prueba.pAjustado)}</TableCell>
                          <TableCell className="p-2 text-right tabular-nums">
                            {decimal(item.prueba.rBiserial)}
                            {item.prueba.rBiserial != null && <span className="block text-[11px] text-ink-600">{effectSize(item.prueba.rBiserial)}</span>}
                          </TableCell>
                          <TableCell className="p-2"><ResultBadge item={item} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ChartCard>

              <Card className="rounded-xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="title-card">Por qué esta prueba</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-ink-600">
                  <p><strong className="text-ink-900">U de Mann-Whitney.</strong> Las valoraciones son ordinales (escala Likert 1–5), vienen de dos grupos independientes de distinto tamaño y no siguen una distribución normal. Por eso no corresponde t de Student (supone escala de intervalo y normalidad) ni χ² (descarta el orden de los niveles).</p>
                  <p><strong className="text-ink-900">Tamaño de muestra.</strong> Con menos de 5 valoraciones en algún grupo la prueba no se aplica. Si algún grupo tiene menos de 10, el p-valor se calcula por permutación (20 000 reordenamientos); con más, por aproximación normal con corrección por empates.</p>
                  <p><strong className="text-ink-900">Comparaciones múltiples.</strong> Se contrastan {competencias.length} competencias a la vez, así que los p-valores se ajustan con Holm para que la probabilidad de un falso positivo en el conjunto se mantenga en α = {decimal(data.alfa)}.</p>
                  <p><strong className="text-ink-900">Tamaño del efecto.</strong> r biserial por rangos, entre −1 y 1: positivo significa que los empleadores valoran más alto que los titulados y negativo, más bajo. «No observado» se excluye.</p>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

function ResultBadge({ item }: { item: ComparisonCompetence }) {
  if (!item.prueba.aplicable) {
    return (
      <TapTooltip content={item.prueba.motivo}>
        <button type="button" className="cursor-help"><Badge tone="neutral">No aplicable</Badge></button>
      </TapTooltip>
    );
  }
  return item.prueba.significativa ? <Badge tone="warning">Difieren</Badge> : <Badge tone="success">Sin diferencia</Badge>;
}

function Kpi({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="gap-1 rounded-xl border-0 py-4 shadow-sm">
      <CardContent className="space-y-1 px-4">
        <p className="caption-meta">{label}</p>
        <p className="display-kpi tabular-nums text-ink-900">{value}</p>
        {/* El detalle se muestra completo: truncado solo era legible con el cursor encima. */}
        <p className="break-words text-xs text-ink-600">{detail}</p>
      </CardContent>
    </Card>
  );
}

function exportMeans(data: Comparison) {
  downloadCsv("comparacion-medias-por-competencia.csv", [
    ["Competencia", "Grupo", "Media titulados", "n titulados", "Media empleadores", "n empleadores", "Δ medias (E − T)", "Significativa (Holm)"],
    ...data.competencias.map((item) => [
      item.name,
      groupLabel(item.group),
      decimal(item.titulados.media),
      item.titulados.n,
      decimal(item.empleadores.media),
      item.empleadores.n,
      signed(item.diferenciaMedias),
      !item.prueba.aplicable ? "No aplicable" : item.prueba.significativa ? "Sí" : "No",
    ]),
  ]);
}

function exportTests(data: Comparison) {
  downloadCsv("comparacion-prueba-por-competencia.csv", [
    ["Titulados", data.tituladosDataset, "Empleadores", data.empleadoresDataset, "α", decimal(data.alfa), "Ajuste", data.ajusteMultiple],
    [],
    ["Competencia", "Media titulados", "n titulados", "Media empleadores", "n empleadores", "No observado (empleadores)", "Δ medias", "Δ medianas", "Prueba", "p", "p ajustado", "r biserial", "Resultado", "Motivo"],
    ...data.competencias.map((item) => [
      item.name,
      decimal(item.titulados.media),
      item.titulados.n,
      decimal(item.empleadores.media),
      item.empleadores.n,
      item.empleadores.noObservado,
      signed(item.diferenciaMedias),
      signed(item.diferenciaMedianas),
      item.prueba.nombre,
      pValue(item.prueba.pValor),
      pValue(item.prueba.pAjustado),
      decimal(item.prueba.rBiserial),
      !item.prueba.aplicable ? "No aplicable" : item.prueba.significativa ? "Difieren" : "Sin diferencia",
      item.prueba.motivo,
    ]),
  ]);
}
