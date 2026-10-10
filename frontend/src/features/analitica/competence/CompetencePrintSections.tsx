import type { AnalyticsSummary } from "../api";
import type { Competence, Tone } from "../shared/analyticsTypes";
import { formatDecimal } from "../shared/analyticsFormatters";
import { KpiCard } from "@/components/analytics/KpiCard";
import { StatusPanel } from "@/components/analytics/StatusPanel";
import { BarChart3, ListChecks, TrendingDown, TrendingUp } from "lucide-react";
import { CompetenceMatrix as CompetenceHeatmap } from "./CompetenceMatrix";
import { CompetenceStatsTable as CompetenceStatsTableView } from "./CompetenceStatsTable";
import { CurriculumCard as CurriculumCardView } from "./CurriculumCard";
import { CompetenceRadar as CompetenceRadarView } from "./CompetenceRadar";
import { groupDisplayName } from "./competenceHelpers";

export function CurriculumPanel({ summary }: { summary: AnalyticsSummary | null }) {
  if (!summary) {
    return (
      <StatusPanel
        kind="loading"
        title="Cargando malla y asignaturas"
        description="Consultando las respuestas de selección múltiple."
      />
    );
  }
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <CurriculumCardView title="Aspectos de la Carrera que resultaron útiles" field="aspectos_utiles" summary={summary} tone="blue" />
      <CurriculumCardView title="Aspectos de la Carrera que pueden mejorarse" field="aspectos_mejorables" summary={summary} tone="orange" />
      <CurriculumCardView title="Asignaturas que dieron ventaja competitiva" field="asignaturas_ventaja" summary={summary} tone="teal" />
      <CurriculumCardView title="Asignaturas percibidas poco útiles o desactualizadas" field="asignaturas_poco_utiles" summary={summary} tone="orange" />
    </div>
  );
}

export function CompetencePrintGroup({ items, group, tone }: { items: Competence[]; group: string; tone: Tone }) {
  const average = items.length ? items.reduce((sum, item) => sum + item.average, 0) / items.length : 0;
  const lowest = items.length ? items.reduce((current, item) => item.average < current.average ? item : current) : undefined;
  const highest = items.length ? items.reduce((current, item) => item.average > current.average ? item : current) : undefined;
  return <>
    <div className="competence-kpi-grid grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="h-full"><KpiCard label="Competencias evaluadas" value={String(items.length)} detail={`${groupDisplayName(group)} evaluadas`} icon={ListChecks} tone={tone} /></div>
      <div className="h-full"><KpiCard label={`Promedio de ${groupDisplayName(group)}`} value={average ? `${formatDecimal(average)} de 5` : "—"} detail={`Promedio de las ${items.length} competencias`} icon={BarChart3} tone={tone} /></div>
      <div className="h-full"><KpiCard label="Competencia más baja" value={lowest ? formatDecimal(lowest.average) : "—"} detail={lowest?.name ?? "Sin datos"} icon={TrendingDown} tone={tone} /></div>
      <div className="h-full"><KpiCard label="Competencia más alta" value={highest ? formatDecimal(highest.average) : "—"} detail={highest?.name ?? "Sin datos"} icon={TrendingUp} tone={tone} /></div>
    </div>
    <div className="print-competence-matrix"><CompetenceHeatmap items={items} /></div>
    <div className="print-competence-radar"><CompetenceRadarView items={items} /></div>
    <CompetenceStatsTableView items={items} group={group} />
  </>;
}
