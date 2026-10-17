import { useEffect, useState } from "react";
import { apiRequest } from "@/api/client";
import { navigate } from "@/app/navigation";
import { useDatasetContext } from "@/app/DatasetContext";
import { Badge } from "@/components/analytics/Badge";
import { StatusPanel } from "@/components/analytics/StatusPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeading } from "@/features/analitica/shared/AnalyticsPrimitives";

type Grupo = {
  n: number;
  media: number | null;
  mediana: number | null;
  desviacion: number | null;
  niveles: Record<string, number>;
  noObservado: number;
};

type Prueba = {
  codigo: "MANN_WHITNEY" | "MANN_WHITNEY_PERMUTACION" | "NO_APLICABLE";
  nombre: string;
  aplicable: boolean;
  u: number | null;
  z: number | null;
  pValor: number | null;
  pAjustado: number | null;
  significativa: boolean;
  rBiserial: number | null;
  motivo: string;
};

type Competencia = {
  code: string;
  name: string;
  group: "HARD_SKILL" | "SOFT_SKILL";
  titulados: Grupo;
  empleadores: Grupo;
  diferenciaMedias: number | null;
  diferenciaMedianas: number | null;
  prueba: Prueba;
};

type Comparacion = {
  tituladosDatasetId: string;
  tituladosDataset: string;
  empleadoresDatasetId: string;
  empleadoresDataset: string;
  alfa: number;
  ajusteMultiple: string;
  competencias: Competencia[];
};

const TITULADOS_COLOR = "var(--titulados)";
const EMPLEADORES_COLOR = "var(--empleadores)";

const decimal = (value: number | null | undefined, digits = 2) =>
  value == null ? "—" : value.toFixed(digits).replace(".", ",");

const signed = (value: number | null | undefined) =>
  value == null ? "—" : `${value > 0 ? "+" : ""}${decimal(value)}`;

const pValue = (value: number | null | undefined) =>
  value == null ? "—" : value < 0.001 ? "< 0,001" : decimal(value, 3);

function effectSize(r: number | null) {
  if (r == null) return "—";
  const magnitude = Math.abs(r);
  return magnitude < 0.1 ? "despreciable" : magnitude < 0.3 ? "pequeño" : magnitude < 0.5 ? "mediano" : "grande";
}

export function ComparacionPage() {
  const { datasets, activeIds } = useDatasetContext();
  const tituladosId = activeIds.TITULADOS;
  const empleadoresId = activeIds.EMPLEADORES;
  const [data, setData] = useState<Comparacion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tituladosId || !empleadoresId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiRequest<Comparacion>(
      `/analytics/comparison/competencies?tituladosDatasetId=${encodeURIComponent(tituladosId)}&empleadoresDatasetId=${encodeURIComponent(empleadoresId)}&alfa=0.05`,
    )
      .then((result) => { if (!cancelled) setData(result); })
      .catch((cause) => { if (!cancelled) { setData(null); setError(cause instanceof Error ? cause.message : String(cause)); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tituladosId, empleadoresId]);

  const missing = [
    !datasets.TITULADOS.length && "titulados",
    !datasets.EMPLEADORES.length && "empleadores",
  ].filter(Boolean) as string[];

  const competencias = data?.competencias ?? [];
  const tested = competencias.filter((item) => item.prueba.aplicable);
  const significant = tested.filter((item) => item.prueba.significativa);
  const largestGap = competencias
    .filter((item) => item.diferenciaMedias != null)
    .sort((a, b) => Math.abs(b.diferenciaMedias ?? 0) - Math.abs(a.diferenciaMedias ?? 0))[0];

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
          {loading && <StatusPanel kind="loading" title="Calculando comparación" description="Aplicando la prueba U de Mann-Whitney en cada competencia." />}
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

              <Card className="rounded-xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="title-card">Medias por competencia</CardTitle>
                  <CardDescription>
                    Cada fila une la media de titulados con la de empleadores; la línea es la brecha. Las competencias marcadas difieren de forma estadísticamente significativa.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Legend />
                  {(["HARD_SKILL", "SOFT_SKILL"] as const).map((group) => {
                    const items = competencias.filter((item) => item.group === group);
                    if (!items.length) return null;
                    return (
                      <div key={group} className="space-y-3">
                        <p className="caption-bold uppercase tracking-wider text-ink-600">
                          {group === "HARD_SKILL" ? "Competencias técnicas" : "Competencias transversales"}
                        </p>
                        {items.map((item) => <DumbbellRow key={item.code} item={item} />)}
                      </div>
                    );
                  })}
                  <ScaleAxis />
                </CardContent>
              </Card>

              <Card className="rounded-xl border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="title-card">Prueba por competencia</CardTitle>
                  <CardDescription>
                    Δ = empleadores − titulados. Un valor negativo indica que los empleadores observan un nivel menor al que los titulados perciben en sí mismos.
                  </CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
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
                          <TableCell className="p-2 text-xs" title={item.prueba.motivo}>{item.prueba.nombre}</TableCell>
                          <TableCell className="p-2 text-right tabular-nums">{pValue(item.prueba.pValor)}</TableCell>
                          <TableCell className="p-2 text-right tabular-nums">{pValue(item.prueba.pAjustado)}</TableCell>
                          <TableCell className="p-2 text-right tabular-nums">
                            {decimal(item.prueba.rBiserial)}
                            {item.prueba.rBiserial != null && <span className="block text-[11px] text-ink-600">{effectSize(item.prueba.rBiserial)}</span>}
                          </TableCell>
                          <TableCell className="p-2">
                            {!item.prueba.aplicable
                              ? <Badge tone="neutral" title={item.prueba.motivo}>No aplicable</Badge>
                              : item.prueba.significativa
                                ? <Badge tone="warning">Difieren</Badge>
                                : <Badge tone="success">Sin diferencia</Badge>}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

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

function Kpi({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="gap-1 rounded-xl border-0 py-4 shadow-sm">
      <CardContent className="space-y-1 px-4">
        <p className="caption-meta">{label}</p>
        <p className="display-kpi tabular-nums text-ink-900">{value}</p>
        <p className="truncate text-xs text-ink-600" title={detail}>{detail}</p>
      </CardContent>
    </Card>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-ink-600">
      <span className="flex items-center gap-1.5"><i className="size-3 rounded-full" style={{ backgroundColor: TITULADOS_COLOR }} /> Titulados (autopercepción)</span>
      <span className="flex items-center gap-1.5"><i className="size-3 rounded-full" style={{ backgroundColor: EMPLEADORES_COLOR }} /> Empleadores (nivel observado)</span>
      <span className="flex items-center gap-1.5"><Badge tone="warning">Difieren</Badge> p ajustado &lt; α</span>
    </div>
  );
}

/** Posición horizontal (0–100 %) de un valor de la escala 1–5. */
const position = (value: number) => ((value - 1) / 4) * 100;

function DumbbellRow({ item }: { item: Competencia }) {
  const t = item.titulados.media;
  const e = item.empleadores.media;
  const both = t != null && e != null;
  const tooltip = `Titulados ${decimal(t)} · Empleadores ${decimal(e)} · Δ ${signed(item.diferenciaMedias)}`;
  return (
    <div className="grid items-center gap-x-4 gap-y-1 sm:grid-cols-[minmax(160px,260px)_1fr]" title={tooltip}>
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="truncate text-ink-900">{item.name}</span>
        {item.prueba.significativa && <Badge tone="warning">Difieren</Badge>}
      </div>
      <div className="relative h-6">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-surface-container-high" />
        {both && (
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-ink-600/30"
            style={{ left: `${position(Math.min(t, e))}%`, width: `${Math.abs(position(e) - position(t))}%` }}
          />
        )}
        {t != null && <Dot value={t} color={TITULADOS_COLOR} label={`Titulados: ${decimal(t)}`} />}
        {e != null && <Dot value={e} color={EMPLEADORES_COLOR} label={`Empleadores: ${decimal(e)}`} />}
      </div>
    </div>
  );
}

function Dot({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <span
      aria-label={label}
      className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
      style={{ left: `${position(value)}%`, backgroundColor: color }}
    />
  );
}

function ScaleAxis() {
  return (
    <div className="grid gap-x-4 sm:grid-cols-[minmax(160px,260px)_1fr]">
      <span className="hidden sm:block" />
      <div className="relative h-8 border-t border-surface-container-high text-[11px] text-ink-600">
        {[1, 2, 3, 4, 5].map((tick) => (
          <span key={tick} className="absolute top-1 -translate-x-1/2 text-center" style={{ left: `${position(tick)}%` }}>
            {tick}
            {tick === 1 && <span className="block">Muy insuf.</span>}
            {tick === 5 && <span className="block">Muy suf.</span>}
          </span>
        ))}
      </div>
    </div>
  );
}
