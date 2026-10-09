import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileUp,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusPanel } from "@/components/analytics/StatusPanel";
import { Badge } from "@/components/analytics/Badge";
import {
  deleteDataset,
  importDataset,
  listDatasets,
  validateDataset,
  type DatasetSummary,
  type ImportReport,
} from "./api";

type SurveyType = "TITULADOS" | "EMPLEADORES";

export function CargarDatosPage() {
  const [surveyType, setSurveyType] = useState<SurveyType>("TITULADOS");
  const [file, setFile] = useState<File | null>(null);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [loading, setLoading] = useState<"validate" | "import" | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [datasetToDelete, setDatasetToDelete] = useState<DatasetSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listDatasets()
      .then(setDatasets)
      .catch(() => undefined);
  }, []);

  function chooseFile(next: File | null) {
    setFile(next);
    setReport(null);
    setError(null);
  }

  async function validate() {
    if (!file) return;
    setLoading("validate");
    setError(null);
    try {
      const next = await validateDataset(file);
      setReport(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(null);
    }
  }

  async function process() {
    if (!file || !report || report.errors > 0 || report.rowsValid === 0) return;
    setLoading("import");
    setError(null);
    try {
      const imported = await importDataset(file);
      setReport(imported);
      const nextDatasets = await listDatasets();
      setDatasets(nextDatasets);
      if (imported.datasetId)
        localStorage.setItem(
          "simulacionem.activeDatasetId",
          imported.datasetId,
        );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(null);
    }
  }

  async function removeDataset(dataset: DatasetSummary) {
    setDeletingId(dataset.id);
    setError(null);
    try {
      await deleteDataset(dataset.id);
      setDatasets((current) =>
        current.filter((item) => item.id !== dataset.id),
      );
      if (localStorage.getItem("simulacionem.activeDatasetId") === dataset.id)
        localStorage.removeItem("simulacionem.activeDatasetId");
      if (report?.datasetId === dataset.id) setReport(null);
      setDatasetToDelete(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setDeletingId(null);
    }
  }

  function requestRemoveDataset(dataset: DatasetSummary) {
    setDatasetToDelete(dataset);
  }

  const surveyLabel = surveyType === "TITULADOS" ? "Titulados" : "Empleadores";
  const canProcess = Boolean(
    file &&
    report &&
    report.errors === 0 &&
    report.rowsValid > 0 &&
    report.surveyType === surveyType,
  );

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 pt-1 md:flex-row md:items-end">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone="neutral">
              <UploadCloud className="mr-1 size-3.5" />
              Importación de datos
            </Badge>
            <Badge tone={datasets.length > 0 ? "success" : "neutral"}>
              <span className="mr-1.5 size-1.5 rounded-full bg-current" />
              {datasets.length > 0
                ? "Datasets disponibles"
                : "Esperando archivo"}
            </Badge>
          </div>
          <h1 className="headline-page tracking-tight">Cargar datos</h1>
          <p className="mt-1 max-w-3xl text-sm text-ink-600">
            Importa el CSV exportado desde Google Forms para validar su
            estructura y preparar el dataset para el análisis cuantitativo.
          </p>
        </div>
        <div className="hidden items-center gap-2 text-xs text-ink-600 sm:flex">
          <FileSpreadsheet className="size-4 text-titulados" />
          CSV UTF-8 · respuestas agregadas
        </div>
      </div>

      <div className="flex flex-col justify-between gap-3 rounded-xl bg-amber-50/80 p-4 shadow-sm md:flex-row md:items-center">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-status-success" />
          <p className="text-sm text-ink-600">
            <strong className="text-ink-900">Flujo de importación:</strong>{" "}
            selecciona la encuesta, carga el CSV, valida sus incidencias y
            procesa únicamente cuando no existan errores.
          </p>
        </div>
        <span className="whitespace-nowrap rounded bg-white/70 px-2 py-1 text-xs font-medium text-ink-600">
          Google Forms → CSV → Analizador
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(["TITULADOS", "EMPLEADORES"] as SurveyType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setSurveyType(type)}
            className={`overflow-hidden rounded-xl border bg-surface-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${surveyType === type ? (type === "TITULADOS" ? "border-titulados ring-1 ring-titulados/20" : "border-empleadores ring-1 ring-empleadores/20") : "border-transparent"}`}
          >
            <div
              className={`h-1.5 ${type === "TITULADOS" ? "bg-titulados" : "bg-empleadores"}`}
            />
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="title-card">
                    {type === "TITULADOS"
                      ? "1. Encuesta a titulados"
                      : "2. Encuesta a empleadores"}
                  </p>
                  <p className="mt-1 text-sm text-ink-600">
                    {type === "TITULADOS"
                      ? "Perfil, empleabilidad y formación continua."
                      : "Contratación, valoración y competencias."}
                  </p>
                </div>
                <Badge
                  tone={type === "TITULADOS" ? "titulados" : "empleadores"}
                >
                  {surveyType === type ? "Seleccionada" : "Seleccionar"}
                </Badge>
              </div>
              <span className="mt-4 inline-block text-xs font-medium text-ink-600">
                Tipo esperado: {type}
              </span>
            </div>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden rounded-xl border-0 shadow-sm">
        <div className="h-1.5 bg-titulados" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2 title-card">
            <UploadCloud className="size-5 text-titulados" />
            Archivo de respuestas
          </CardTitle>
          <CardDescription>
            Formato disponible: CSV UTF-8 exportado desde Google Forms. El
            backend detecta la encuesta y valida sus encabezados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="group flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-line bg-surface-container-low p-10 text-center transition-colors hover:border-titulados hover:bg-titulados/5"
          >
            <span className="flex size-12 items-center justify-center rounded-lg bg-surface-white text-titulados shadow-sm">
              <FileUp className="size-7 transition-transform group-hover:-translate-y-0.5" />
            </span>
            <span className="font-medium text-ink-900">
              Seleccionar CSV de {surveyLabel.toLowerCase()}
            </span>
            <span className="text-xs text-ink-600">
              {file
                ? file.name
                : "Haz clic para buscar un archivo desde tu equipo"}
            </span>
          </button>
          {file && (
            <Attachment className="w-full border-border-line bg-white">
              <AttachmentMedia>
                <FileSpreadsheet className="text-titulados" />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>{file.name}</AttachmentTitle>
                <AttachmentDescription>
                  {(file.size / 1024).toFixed(1)} KB · Archivo CSV seleccionado
                </AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction variant="outline" size="sm" onClick={() => chooseFile(null)}>
                  Quitar archivo
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={validate} disabled={!file || loading !== null}>
              {loading === "validate" ? (
                <>
                  <RefreshCw className="animate-spin" />
                  Validando…
                </>
              ) : (
                "Validar archivo"
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={process}
              disabled={!canProcess || loading !== null}
            >
              {loading === "import" ? (
                <>
                  <RefreshCw className="animate-spin" />
                  Procesando…
                </>
              ) : (
                "Procesar dataset"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <StatusPanel
          kind="warning"
          title="No se pudo completar la operación"
          description={error}
        />
      )}
      {report && <ImportReportView report={report} expectedType={surveyType} />}
      <DatasetList
        datasets={datasets}
        deletingId={deletingId}
        onDelete={requestRemoveDataset}
      />
      <AlertDialog
        open={datasetToDelete !== null}
        onOpenChange={(open) => !open && setDatasetToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este dataset?</AlertDialogTitle>
            <AlertDialogDescription>
              {datasetToDelete && (
                <>
                  Se eliminará <strong>{datasetToDelete.sourceFileName}</strong> junto con sus respuestas e incidencias. Esta acción no se puede deshacer.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => datasetToDelete && void removeDataset(datasetToDelete)}
            >
              Eliminar dataset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ImportReportView({
  report,
  expectedType,
}: {
  report: ImportReport;
  expectedType: SurveyType;
}) {
  const typeMismatch = report.surveyType !== expectedType;
  const groupedIssues = groupIssues(report.issues);
  return (
    <Card className="rounded-xl border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 title-card">
          {report.errors === 0 ? (
            <CheckCircle2 className="text-status-success" />
          ) : (
            <AlertTriangle className="text-status-warning" />
          )}
          Resultado de validación
        </CardTitle>
        <CardDescription>
          {typeMismatch
            ? `El archivo fue detectado como ${formatSurveyType(report.surveyType)}, pero se esperaba ${formatSurveyType(expectedType)}.`
            : `Tipo detectado: ${formatSurveyType(report.surveyType)}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Leídas", report.rowsRead],
            ["Válidas", report.rowsValid],
            ["Rechazadas", report.rowsRejected],
            ["Avisos", report.warnings],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-lg bg-surface-container-low p-3"
            >
              <p className="caption-meta uppercase tracking-wider text-ink-600">
                {label}
              </p>
              <p className="display-kpi tabular-nums text-ink-900">{value}</p>
            </div>
          ))}
        </div>
        {groupedIssues.length > 0 && (
          <div className="space-y-2">
            <p className="label-default text-ink-600">Incidencias detectadas</p>
            <div className="scrollbar-sidebar max-h-64 space-y-2 overflow-y-auto">
              {groupedIssues.map((issue) => (
                <div
                  key={`${issue.severity}-${issue.code}-${issue.message}`}
                  className={`rounded-lg border p-3 text-sm ${issue.severity === "ERROR" ? "border-red-200 bg-red-50 text-red-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}
                >
                  <p className="font-medium">
                    {formatIssueSeverity(issue.severity)} · {formatIssueCode(issue.code)}
                    {issue.count > 1 ? ` · ${issue.count} casos` : ""}
                  </p>
                  <p>{issue.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        {report.datasetId && (
          <StatusPanel
            kind="success"
            title="Dataset disponible"
            description={`Identificador: ${report.datasetId}`}
          />
        )}
      </CardContent>
    </Card>
  );
}

function groupIssues(issues: ImportReport["issues"]) {
  const groups = new Map<
    string,
    { severity: string; code: string; message: string; count: number }
  >();
  issues.forEach((issue) => {
    const key = `${issue.severity}|${issue.code}|${issue.message}`;
    const current = groups.get(key);
    if (current) current.count += 1;
    else
      groups.set(key, {
        severity: issue.severity,
        code: issue.code,
        message: issue.message,
        count: 1,
      });
  });
  return [...groups.values()];
}

function DatasetList({
  datasets,
  deletingId,
  onDelete,
}: {
  datasets: DatasetSummary[];
  deletingId: string | null;
  onDelete: (dataset: DatasetSummary) => void;
}) {
  return (
    <Card className="rounded-xl border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="title-card">Datasets disponibles</CardTitle>
        <CardDescription>
          {datasets.length
            ? "Selecciona el dataset activo o elimina un dataset que ya no necesites."
            : "Todavía no hay datasets importados en el backend."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {datasets.length > 0 && (
          <RadioGroup
            defaultValue={
              localStorage.getItem("simulacionem.activeDatasetId") ?? undefined
            }
            onValueChange={(value) =>
              localStorage.setItem("simulacionem.activeDatasetId", value)
            }
            className="space-y-2"
          >
            {datasets
              .slice()
              .reverse()
              .map((dataset) => (
                <div
                  key={dataset.id}
                  className="flex items-center gap-3 rounded-lg border border-border-line bg-surface-white p-3 transition-colors hover:bg-surface-container-low"
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <RadioGroupItem value={dataset.id} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {dataset.sourceFileName}
                      </span>
                      <span className="block text-xs text-ink-600">
                        {formatSurveyType(dataset.surveyType)} · {dataset.rowsValid} válidas ·{" "}
                        {formatDatasetStatus(dataset.status)}
                      </span>
                    </span>
                    <span className="hidden text-xs text-ink-600 md:block">
                      {dataset.id}
                    </span>
                  </label>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(dataset)}
                    disabled={deletingId !== null}
                    aria-label={`Eliminar ${dataset.sourceFileName}`}
                  >
                    <Trash2 />
                    {deletingId === dataset.id ? "Eliminando…" : "Eliminar"}
                  </Button>
                </div>
              ))}
          </RadioGroup>
        )}
      </CardContent>
    </Card>
  );
}

function formatSurveyType(value: string) {
  const labels: Record<string, string> = {
    TITULADOS: "Titulados",
    EMPLEADORES: "Empleadores",
  };
  return labels[value] ?? formatTechnicalLabel(value);
}

function formatDatasetStatus(value: string) {
  const labels: Record<string, string> = {
    CARGADO: "Cargado",
    VALIDANDO: "Validando",
    CON_ADVERTENCIAS: "Con advertencias",
    CON_ERRORES: "Con errores",
    LISTO: "Listo",
    VALIDADO: "Validado",
    VALIDADA: "Validada",
    PROCESADO: "Procesado",
    PROCESADA: "Procesada",
    IMPORTADO: "Importado",
    IMPORTADA: "Importada",
  };
  return labels[value] ?? formatTechnicalLabel(value);
}

function formatIssueSeverity(value: string) {
  const labels: Record<string, string> = {
    ERROR: "Error",
    ADVERTENCIA: "Advertencia",
    WARNING: "Advertencia",
  };
  return labels[value] ?? formatTechnicalLabel(value);
}

function formatIssueCode(value: string) {
  const labels: Record<string, string> = {
    TIPO_NO_RECONOCIDO: "Tipo no reconocido",
    COLUMNA_SIN_NOMBRE: "Columna sin nombre",
    ENCABEZADO_DUPLICADO: "Encabezado duplicado",
    FILA_DESALINEADA: "Fila desalineada",
    FECHA_NO_RECONOCIDA: "Fecha no reconocida",
    NUMERO_NO_RECONOCIDO: "Número no reconocido",
  };
  return labels[value] ?? formatTechnicalLabel(value);
}

function formatTechnicalLabel(value: string) {
  return value
    .toLocaleLowerCase("es")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase("es"));
}
