import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileUp,
  Pencil,
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusPanel } from "@/components/analytics/StatusPanel";
import { Badge } from "@/components/analytics/Badge";
import { useDatasetContext } from "@/app/DatasetContext";
import {
  deleteDataset,
  importDataset,
  listDatasetIssues,
  listDatasets,
  renameDataset,
  validateDataset,
  type DatasetSummary,
  type Issue,
  type ImportReport,
} from "./api";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

type SurveyType = "TITULADOS" | "EMPLEADORES";

export function CargarDatosPage() {
  const { activeIds, refreshDatasets, setActiveDataset } = useDatasetContext();
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

  async function chooseFile(next: File | null) {
    setFile(next);
    setReport(null);
    setError(null);
    if (!next) return;
    setLoading("validate");
    try {
      const nextReport = await validateDataset(next);
      setReport(nextReport);
      if (nextReport.surveyType === "TITULADOS" || nextReport.surveyType === "EMPLEADORES") {
        setSurveyType(nextReport.surveyType);
      }
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
        setActiveDataset(imported.surveyType as SurveyType, imported.datasetId);
      refreshDatasets();
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
      if (activeIds[dataset.surveyType as SurveyType] === dataset.id)
        setActiveDataset(dataset.surveyType as SurveyType, undefined);
      refreshDatasets();
      if (report?.datasetId === dataset.id) setReport(null);
      setDatasetToDelete(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setDeletingId(null);
    }
  }

  async function rename(dataset: DatasetSummary) {
    const name = window.prompt("Nombre visible del dataset", dataset.displayName ?? dataset.sourceFileName);
    if (name === null || !name.trim()) return;
    try {
      const updated = await renameDataset(dataset.id, name);
      setDatasets((current) => current.map((item) => item.id === updated.id ? updated : item));
      refreshDatasets();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  function requestRemoveDataset(dataset: DatasetSummary) {
    setDatasetToDelete(dataset);
  }

  const surveyLabel = surveyType === "TITULADOS" ? "Titulados" : "Empleadores";
  const surveyAccent = surveyType === "TITULADOS"
    ? {
        text: "text-titulados",
        borderHover: "hover:border-titulados",
        backgroundHover: "hover:bg-titulados/5",
      }
    : {
        text: "text-empleadores",
        borderHover: "hover:border-empleadores",
        backgroundHover: "hover:bg-empleadores/5",
      };
  const visibleDatasets = datasets.filter((dataset) => dataset.surveyType === surveyType);
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
          <h1 className="headline-page tracking-tight">Cargar datos</h1>
          <p className="mt-1 max-w-3xl text-sm text-ink-600">
            Importa el CSV para validar su
            estructura y preparar el dataset para el análisis cuantitativo.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="inline-flex rounded-lg border border-border-line bg-surface-container-low p-1">
        {(["TITULADOS", "EMPLEADORES"] as SurveyType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setSurveyType(type)}
            className={`rounded-md px-5 py-2 text-sm font-medium transition-colors ${surveyType === type ? "bg-surface-white text-ink-900 shadow-sm" : "text-ink-600 hover:text-ink-900"}`}
          >
            {type === "TITULADOS" ? "Titulados" : "Empleadores"}
          </button>
        ))}
        </div>
        <p className="text-sm text-ink-600">Selecciona el tipo de encuesta para cargar un archivo y ver sus archivos importados.</p>
      </div>

      <Card className="overflow-hidden rounded-xl border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 title-card">
            <UploadCloud className={`size-5 ${surveyAccent.text}`} />
            Archivo de respuestas
          </CardTitle>
          <CardDescription>Archivo CSV (UTF-8) exportado desde Google Forms</CardDescription>
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
            className={`group flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border-line bg-surface-container-low p-10 text-center transition-colors ${surveyAccent.borderHover} ${surveyAccent.backgroundHover}`}
          >
            <span className={`flex size-12 items-center justify-center rounded-lg bg-surface-white shadow-sm ${surveyAccent.text}`}>
              <FileUp className="size-7 transition-transform group-hover:-translate-y-0.5" />
            </span>
            <span className="font-medium text-ink-900">
              Haz clic para buscar un archivo… o arrástralo aquí
            </span>
            <span className="text-xs text-ink-600">
              {file
                ? file.name
                : `Archivo de ${surveyLabel.toLowerCase()}`}
            </span>
          </button>
          {file && (
            <Attachment className="w-full border-border-line bg-white">
              <AttachmentMedia>
                <FileSpreadsheet className={surveyAccent.text} />
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
                "Importar"
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
        datasets={visibleDatasets}
        activeId={activeIds[surveyType]}
        onUse={(dataset) => setActiveDataset(surveyType, dataset.id)}
        deletingId={deletingId}
        onDelete={requestRemoveDataset}
        onRename={rename}
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
              ? `Este archivo parece de ${formatSurveyType(report.surveyType).toLowerCase()}. Seleccionaste ${formatSurveyType(expectedType).toLowerCase()}.`
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
  activeId,
  onUse,
  deletingId,
  onDelete,
  onRename,
}: {
  datasets: DatasetSummary[];
  activeId?: string;
  onUse: (dataset: DatasetSummary) => void;
  deletingId: string | null;
  onDelete: (dataset: DatasetSummary) => void;
  onRename: (dataset: DatasetSummary) => void;
}) {
  return (
    <Card className="rounded-xl border-0 shadow-sm">
      <CardHeader>
        <CardTitle className="title-card">Archivos cargados</CardTitle>
        <CardDescription>
          {datasets.length
            ? "El archivo marcado como En uso alimenta las pantallas de análisis."
            : "Todavía no hay archivos cargados de este tipo de encuesta."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {datasets.length > 0 && (
          <div className="space-y-2">
            {datasets
              .slice()
              .reverse()
              .map((dataset) => (
                <div
                  key={dataset.id}
                  className="flex items-center gap-3 rounded-lg border border-border-line bg-surface-white p-3 transition-colors hover:bg-surface-container-low"
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    onClick={() => onUse(dataset)}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {dataset.displayName ?? dataset.sourceFileName}
                      </span>
                      <span className="block text-xs text-ink-600">
                        {formatSurveyType(dataset.surveyType)} · {dataset.rowsValid} respuestas válidas · {formatDatasetDate(dataset.importedAt)}
                      </span>
                    </span>
                    {activeId === dataset.id && <Badge tone="success">En uso</Badge>}
                  </button>
                  {dataset.warnings > 0 && (
                    <DatasetWarningsPopover dataset={dataset} />
                  )}
                  <Button variant="outline" size="sm" onClick={() => onRename(dataset)} aria-label={`Renombrar ${dataset.displayName ?? dataset.sourceFileName}`}>
                    <Pencil />
                    Renombrar
                  </Button>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DatasetWarningsPopover({ dataset }: { dataset: DatasetSummary }) {
  const [open, setOpen] = useState(false);
  const [issues, setIssues] = useState<Issue[] | null>(null);
  const [loading, setLoading] = useState(false);
  const groupedIssues = issues === null ? null : groupIssues(issues);

  useEffect(() => {
    if (!open || issues !== null) return;
    setLoading(true);
    listDatasetIssues(dataset.id)
      .then(setIssues)
      .catch(() => setIssues([]))
      .finally(() => setLoading(false));
  }, [dataset.id, issues, open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="text-xs font-medium text-amber-700 underline underline-offset-2">
          Con advertencias ({dataset.warnings})
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-80 overflow-y-auto">
        <PopoverHeader>
          <PopoverTitle>Advertencias del archivo</PopoverTitle>
          <PopoverDescription>
            {dataset.warnings} caso{dataset.warnings === 1 ? "" : "s"} en {groupedIssues?.length ?? "…"} tipo{groupedIssues?.length === 1 ? "" : "s"} de advertencia.
          </PopoverDescription>
        </PopoverHeader>
        {loading && <p className="text-xs text-ink-600">Cargando detalle…</p>}
        {!loading && issues?.length === 0 && (
          <p className="text-xs text-ink-600">No se pudo recuperar el detalle de las incidencias.</p>
        )}
        {!loading && groupedIssues && groupedIssues.length > 0 && (
          <div className="space-y-2">
            {groupedIssues.map((issue) => (
              <div key={`${issue.severity}-${issue.code}-${issue.message}`} className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-950">
                <p className="font-medium">
                  {formatIssueSeverity(issue.severity)} · {formatIssueCode(issue.code)}
                  {issue.count > 1 ? ` · ${issue.count} casos` : ""}
                </p>
                <p>{issue.message}</p>
              </div>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function formatDatasetDate(value?: string) {
  return value
    ? new Intl.DateTimeFormat("es-BO", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value))
    : "Fecha no disponible";
}

function formatSurveyType(value: string) {
  const labels: Record<string, string> = {
    TITULADOS: "Titulados",
    EMPLEADORES: "Empleadores",
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
