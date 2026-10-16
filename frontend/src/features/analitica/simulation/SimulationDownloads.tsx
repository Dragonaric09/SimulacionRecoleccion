import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { buildSimulationPdf, exportSimulationCsv, exportSimulationExcel, exportSimulationPng, type SimulationExportData } from "../shared/simulationExportUtils";

export type SimulationRun = SimulationExportData & {
  datasetId: string;
  variable: string;
  weights: Record<string, number>;
  scenarioPercentages: Record<string, number> | null;
  segment: string;
};

export function SimulationDownloadMenu({ run }: { run: SimulationRun | null }) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  useEffect(() => {
    const closeWhenClickingOutside = (event: MouseEvent) => {
      if (menuRef.current?.open && event.target instanceof Node && !menuRef.current.contains(event.target)) menuRef.current.open = false;
    };
    document.addEventListener("mousedown", closeWhenClickingOutside);
    return () => document.removeEventListener("mousedown", closeWhenClickingOutside);
  }, []);
  useEffect(() => () => { if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl); }, [pdfPreviewUrl]);
  if (!run) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span><Button type="button" variant="outline" disabled><Download className="size-4" /> Descargar <span aria-hidden="true">▾</span></Button></span>
          </TooltipTrigger>
          <TooltipContent>Esperando los datos para calcular la simulación</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  const download = (format: "pdf" | "xlsx" | "csv" | "png") => {
    if (format === "pdf") {
      setPdfLoading(true);
      void buildSimulationPdf(run).then((blob) => {
        setPdfBlob(blob);
        setPdfPreviewUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return URL.createObjectURL(blob);
        });
      }).finally(() => setPdfLoading(false));
    }
    if (format === "xlsx") exportSimulationExcel(run);
    if (format === "csv") exportSimulationCsv(run);
    if (format === "png") exportSimulationPng(run);
    if (menuRef.current) menuRef.current.open = false;
  };
  const closePreview = () => {
    setPdfPreviewUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    setPdfBlob(null);
  };
  const downloadPreview = () => {
    if (!pdfBlob) return;
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "titulados_simulacion.pdf";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };
  return (
    <>
    <div className="flex shrink-0 flex-col items-end gap-1">
      <details ref={menuRef} className="relative">
        <summary className="flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted">
          <Download className="size-4" /> Descargar <span aria-hidden="true">▾</span>
        </summary>
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-lg border border-border-line bg-white p-1.5 shadow-lg">
          <SimulationDownloadOption label={pdfLoading ? "Preparando PDF..." : "Previsualizar PDF"} help="Revisar parámetros, gráfica y tabla antes de descargar" onClick={() => !pdfLoading && download("pdf")} />
          <SimulationDownloadOption label="Excel (.xlsx)" help="Tabla comparativa + hoja de parámetros" onClick={() => download("xlsx")} />
          <SimulationDownloadOption label="Tabla CSV" help="Solo la tabla comparativa" onClick={() => download("csv")} />
          <SimulationDownloadOption label="Imagen PNG" help="Gráfico de rangos" onClick={() => download("png")} />
        </div>
      </details>
    </div>
    {pdfPreviewUrl && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Previsualización del PDF de simulación">
      <div className="flex h-[min(92vh,900px)] w-[min(1200px,96vw)] flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-border-line px-4 py-3">
          <div><p className="text-sm font-semibold text-ink-900">Previsualización del PDF</p><p className="text-xs text-ink-600">Revisa el documento antes de descargarlo.</p></div>
          <button type="button" onClick={closePreview} className="rounded-md px-2 py-1 text-sm text-ink-600 hover:bg-surface-container-low" aria-label="Cerrar previsualización">Cerrar</button>
        </div>
        <iframe title="PDF de simulación" src={pdfPreviewUrl} className="min-h-0 flex-1 bg-slate-100" />
        <div className="flex justify-end gap-2 border-t border-border-line px-4 py-3">
          <Button type="button" variant="outline" onClick={closePreview}>Cerrar</Button>
          <Button type="button" onClick={downloadPreview}>Descargar PDF</Button>
        </div>
      </div>
    </div>}
    </>
  );
}

function SimulationDownloadOption({ label, help, onClick }: { label: string; help: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex w-full flex-col items-start rounded-md px-2.5 py-2 text-left hover:bg-surface-container-low"><span className="text-sm font-medium text-ink-900">{label}</span><span className="text-xs text-ink-600">{help}</span></button>;
}
