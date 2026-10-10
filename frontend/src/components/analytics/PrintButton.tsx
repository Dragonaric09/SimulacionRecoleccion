import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export type PrintDomain = "TITULADOS" | "EMPLEADORES";

function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function printAnalyticsPdf(domain: PrintDomain, kind: "completo" | "cruce" | "simulacion" = "completo") {
  const previousTitle = document.title;
  const prefix = domain === "TITULADOS" ? "titulados" : "empleadores";
  document.title = `${prefix}_${kind}_${today()}`;
  const restore = () => {
    document.title = previousTitle;
    document.documentElement.classList.remove("is-printing");
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  await waitForPrintContent();
  document.documentElement.classList.add("is-printing");
  window.print();
}

function waitForPrintContent() {
  if (!document.querySelector(".status-loading")) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const finish = () => {
      observer.disconnect();
      window.clearTimeout(timeout);
      resolve();
    };
    const observer = new MutationObserver(() => {
      if (!document.querySelector(".status-loading")) finish();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    const timeout = window.setTimeout(finish, 10000);
  });
}

export function PrintButton({ domain, kind = "completo", disabled = false }: { domain: PrintDomain; kind?: "completo" | "cruce" | "simulacion"; disabled?: boolean }) {
  return (
    <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => printAnalyticsPdf(domain, kind)}>
      <Printer />
      {kind === "cruce" ? "PDF de esta vista" : kind === "simulacion" ? "PDF de simulación" : `Descargar PDF de ${domain === "TITULADOS" ? "Titulados" : "Empleadores"}`}
    </Button>
  );
}
