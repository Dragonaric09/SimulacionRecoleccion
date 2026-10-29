import { useEffect, useState } from "react";
import { DownloadMenu } from "@/components/analytics/DownloadMenu";
import { exportSimulationCsv, exportSimulationExcel, exportSimulationPng, openSimulationPdf, preloadSimulationPdf, type SimulationExportData } from "../shared/simulationExportUtils";

export type SimulationRun = SimulationExportData & {
  datasetId: string;
  variable: string;
  weights: Record<string, number>;
  scenarioPercentages: Record<string, number> | null;
  segment: string;
};

/** Descargas de la simulación con el mismo control (ícono) que el resto del sistema. */
export function SimulationDownloadMenu({ run }: { run: SimulationRun | null }) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  useEffect(() => {
    if (run) preloadSimulationPdf(run);
  }, [run]);
  const openPdf = (current: SimulationRun) => {
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
    void openSimulationPdf(current, previewWindow).then(() => {
      previewWindow.document.title = `Simulación de escenarios: ${current.variableLabel}`;
    }).catch((error: unknown) => {
      console.error("No se pudo generar el PDF de simulación", error);
      previewWindow.close();
      setPdfError("No se pudo generar la previsualización. Revisa la consola para más detalles.");
    }).finally(() => setPdfLoading(false));
  };
  return (
    <>
      <DownloadMenu
        title={run ? `Simulación de ${run.variableLabel}` : "Simulación"}
        disabled={!run}
        triggerText="Exportar simulación"
        triggerVariant="outline"
        triggerSize="sm"
        options={run ? [
          { label: pdfLoading ? "Preparando PDF…" : "Previsualizar PDF", help: "Revisar el mismo PDF que se descargará", disabled: pdfLoading, onSelect: () => openPdf(run) },
          { label: "Excel (.xlsx)", help: "Tabla comparativa + hoja de parámetros", onSelect: () => exportSimulationExcel(run) },
          { label: "Tabla CSV", help: "Solo la tabla comparativa", onSelect: () => exportSimulationCsv(run) },
          {
            label: "Imagen PNG",
            help: "Gráfico de rangos",
            onSelect: () => exportSimulationPng(run).catch((error: unknown) => {
              console.error("No se pudo generar el PNG de simulación", error);
              setPdfError("No se pudo generar la imagen PNG. Revisa la consola para más detalles.");
            }),
          },
        ] : [{ label: "Descargar", help: "Esperando los datos para calcular la simulación", disabled: true, onSelect: () => undefined }]}
      />
      {pdfError && <div role="alert" className="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg border border-red-200 bg-white px-4 py-3 text-sm text-red-800 shadow-lg">{pdfError}</div>}
    </>
  );
}
