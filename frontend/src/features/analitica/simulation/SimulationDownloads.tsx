import { useEffect, useRef } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { printAnalyticsPdf } from "@/components/analytics/PrintButton";
import { exportSimulationCsv, exportSimulationExcel, exportSimulationPng, type SimulationExportData } from "../shared/simulationExportUtils";

export type SimulationRun = SimulationExportData & {
  datasetId: string;
  variable: string;
  weights: Record<string, number>;
  scenarioPercentages: Record<string, number> | null;
};

export function SimulationDownloadMenu({ run }: { run: SimulationRun | null }) {
  const menuRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeWhenClickingOutside = (event: MouseEvent) => {
      if (menuRef.current?.open && event.target instanceof Node && !menuRef.current.contains(event.target)) menuRef.current.open = false;
    };
    document.addEventListener("mousedown", closeWhenClickingOutside);
    return () => document.removeEventListener("mousedown", closeWhenClickingOutside);
  }, []);
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
    if (format === "pdf") void printAnalyticsPdf("TITULADOS", "simulacion");
    if (format === "xlsx") exportSimulationExcel(run);
    if (format === "csv") exportSimulationCsv(run);
    if (format === "png") exportSimulationPng(run);
    if (menuRef.current) menuRef.current.open = false;
  };
  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <details ref={menuRef} className="relative">
        <summary className="flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium hover:bg-muted">
          <Download className="size-4" /> Descargar <span aria-hidden="true">▾</span>
        </summary>
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-lg border border-border-line bg-white p-1.5 shadow-lg">
          <SimulationDownloadOption label="PDF de simulación" help="Parámetros, gráfico y tabla · A4 horizontal" onClick={() => download("pdf")} />
          <SimulationDownloadOption label="Excel (.xlsx)" help="Tabla comparativa + hoja de parámetros" onClick={() => download("xlsx")} />
          <SimulationDownloadOption label="Tabla CSV" help="Solo la tabla comparativa" onClick={() => download("csv")} />
          <SimulationDownloadOption label="Imagen PNG" help="Gráfico de rangos" onClick={() => download("png")} />
        </div>
      </details>
    </div>
  );
}

function SimulationDownloadOption({ label, help, onClick }: { label: string; help: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="flex w-full flex-col items-start rounded-md px-2.5 py-2 text-left hover:bg-surface-container-low"><span className="text-sm font-medium text-ink-900">{label}</span><span className="text-xs text-ink-600">{help}</span></button>;
}
