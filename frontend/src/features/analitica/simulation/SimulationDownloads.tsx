import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { exportSimulationCsv, exportSimulationExcel, exportSimulationPng, openSimulationPdf, preloadSimulationPdf, type SimulationExportData } from "../shared/simulationExportUtils";

export type SimulationRun = SimulationExportData & {
  datasetId: string;
  variable: string;
  weights: Record<string, number>;
  scenarioPercentages: Record<string, number> | null;
  segment: string;
};

export function SimulationDownloadMenu({ run }: { run: SimulationRun | null }) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  useEffect(() => {
    const closeWhenClickingOutside = (event: MouseEvent) => {
      if (menuRef.current?.open && event.target instanceof Node && !menuRef.current.contains(event.target)) menuRef.current.open = false;
    };
    document.addEventListener("mousedown", closeWhenClickingOutside);
    return () => document.removeEventListener("mousedown", closeWhenClickingOutside);
  }, []);
  useEffect(() => {
    if (run) preloadSimulationPdf();
  }, [run]);
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
      // Abrimos la pestaña dentro del gesto del usuario para que el navegador
      // no bloquee el popup mientras se genera el PDF de forma asíncrona.
      const previewWindow = window.open("", "_blank");
      if (!previewWindow) {
        setPdfError("El navegador bloqueó la nueva pestaña. Permite ventanas emergentes para previsualizar el PDF.");
        return;
      }
      previewWindow.document.title = "Previsualización del PDF de simulación";
      previewWindow.document.body.innerHTML = "<p style=\"font-family: sans-serif; padding: 2rem\">Preparando la previsualización…</p>";
      setPdfLoading(true);
      setPdfError(null);
      void openSimulationPdf(run, previewWindow).then(() => {
        previewWindow.document.title = `Simulación de escenarios: ${run.variableLabel}`;
      }).catch((error: unknown) => {
        console.error("No se pudo generar el PDF de simulación", error);
        previewWindow.close();
        setPdfError("No se pudo generar la previsualización. Revisa la consola para más detalles.");
      }).finally(() => setPdfLoading(false));
    }
    if (format === "xlsx") exportSimulationExcel(run);
    if (format === "csv") exportSimulationCsv(run);
    if (format === "png") exportSimulationPng(run);
    if (menuRef.current) menuRef.current.open = false;
  };
  return (
    <>
    <div className="flex shrink-0 flex-col items-end gap-1">
      <details ref={menuRef} className="relative">
        <summary className="flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted">
          <Download className="size-4" /> Descargar <span aria-hidden="true">▾</span>
        </summary>
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-lg border border-border-line bg-white p-1.5 shadow-lg">
          <SimulationDownloadOption label={pdfLoading ? "Preparando PDF..." : "Previsualizar PDF"} help="Revisar el mismo PDF que se descargará" onClick={() => !pdfLoading && download("pdf")} />
          <SimulationDownloadOption label="Excel (.xlsx)" help="Tabla comparativa + hoja de parámetros" onClick={() => download("xlsx")} />
          <SimulationDownloadOption label="Tabla CSV" help="Solo la tabla comparativa" onClick={() => download("csv")} />
          <SimulationDownloadOption label="Imagen PNG" help="Gráfico de rangos" onClick={() => download("png")} />
        </div>
      </details>
    </div>
    {pdfError && <div role="alert" className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-red-200 bg-white px-4 py-3 text-sm text-red-800 shadow-lg">{pdfError}</div>}
    </>
  );
}

function SimulationDownloadOption({ label, help, onClick }: { label: string; help: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex w-full flex-col items-start rounded-md px-2.5 py-2 text-left hover:bg-surface-container-low"><span className="text-sm font-medium text-ink-900">{label}</span><span className="text-xs text-ink-600">{help}</span></button>;
}
