import type { AnalyticsSummary, CategoryDistribution } from "../api";
import { contrastTextColor } from "@/lib/utils";
import { StatusPanel } from "@/components/analytics/StatusPanel";
import {
  Empty,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";

type Scale = "agreement" | "satisfaction";

export function SatisfactionPanel({ summary }: { summary: AnalyticsSummary | null }) {
  const satisfaction = summary?.distributions.satisfaccion_formacion;
  const concordance = summary?.distributions.concordancia_formacion_requerimientos;
  if (!summary) {
    return (
      <StatusPanel
        kind="loading"
        title="Cargando satisfacción y pertinencia"
        description="Consultando las respuestas del dataset seleccionado."
      />
    );
  }
  return (
    <div className="space-y-4">
      <div className="grid gap-5 lg:grid-cols-2">
        <LikertStatement
          number="1."
          title="Satisfacción global con la formación recibida en la carrera"
          distribution={satisfaction}
          showSummary={false}
          scale="satisfaction"
        />
        <LikertStatement
          number="2."
          title="Concordancia entre la formación académica y los requerimientos del mercado laboral"
          distribution={concordance}
          showSummary={false}
          scale="agreement"
        />
      </div>
    </div>
  );
}

function LikertLegend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-lg bg-surface-container-low px-3 py-2.5 text-xs font-medium text-ink-700">
      <span><i className="mr-1.5 inline-block size-3 rounded bg-[#ed552f]" />Totalmente en desacuerdo</span>
      <span><i className="mr-1.5 inline-block size-3 rounded bg-[#f3a487]" />En desacuerdo</span>
      <span><i className="mr-1.5 inline-block size-3 rounded bg-[#7db1dd]" />De acuerdo</span>
      <span><i className="mr-1.5 inline-block size-3 rounded bg-[#1f6fb5]" />Totalmente de acuerdo</span>
    </div>
  );
}

function SatisfactionLegend() {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 rounded-lg bg-surface-container-low px-3 py-2.5 text-xs font-medium text-ink-700">
      <span><i className="mr-1.5 inline-block size-3 rounded bg-[#ed552f]" />Insatisfecho</span>
      <span><i className="mr-1.5 inline-block size-3 rounded bg-[#f3a487]" />Algo satisfecho</span>
      <span><i className="mr-1.5 inline-block size-3 rounded bg-[#1f6fb5]" />Satisfecho</span>
    </div>
  );
}

function LikertStatement({
  number,
  title,
  distribution,
  showSummary = true,
  scale = "agreement",
}: {
  number: string;
  title: string;
  distribution?: CategoryDistribution;
  showSummary?: boolean;
  scale?: Scale;
}) {
  const entries = orderedScaleEntries(distribution, scale);
  const colors = scale === "satisfaction"
    ? ["#ed552f", "#f3a487", "#1f6fb5"]
    : ["#ed552f", "#f3a487", "#7db1dd", "#1f6fb5"];
  const total = distribution?.validCount ?? 0;
  const favorable = favorableCount(distribution);
  return (
    <Card className="gap-3 rounded-xl border border-border-line py-4 shadow-sm">
      <CardHeader className="pb-0">
        {(showSummary || number || title) && (
          <div className="flex flex-col justify-between gap-1 md:flex-row md:items-center">
            <span className="font-semibold text-ink-900">{number} {title}</span>
            {showSummary && <span className="text-xs text-ink-600">{favorablePercentage(distribution)} % De acuerdo + Totalmente de acuerdo</span>}
          </div>
        )}
        <CardDescription>
          {scale === "satisfaction" ? "Escala de satisfacción (3 niveles)" : "Escala de acuerdo (4 niveles)"} · n = {total}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {scale === "satisfaction" ? <SatisfactionLegend /> : <LikertLegend />}
        {entries.length ? (
          <>
            <div className="flex h-11 overflow-hidden rounded-lg">
              {entries.map(([label, count], index) => (
                <div
                  key={label}
                  className="flex min-w-0 items-center justify-center px-1 text-xs font-semibold"
                  style={{ width: `${distribution?.percentages[label] ?? 0}%`, backgroundColor: colors[index], color: contrastTextColor(colors[index]) }}
                  title={`${label}: ${count} (${formatPercentValue(distribution?.percentages[label] ?? 0)})`}
                >
                  {(distribution?.percentages[label] ?? 0) >= 8 ? `${count} (${formatPercentValue(distribution?.percentages[label] ?? 0)})` : ""}
                </div>
              ))}
            </div>
            {scale === "satisfaction" ? (
              <div className="flex flex-wrap gap-x-5 gap-y-1 px-1 text-xs text-ink-600">
                {entries.map(([label, count]) => <span key={label}>{label}: {count} ({formatPercentValue(distribution?.percentages[label] ?? 0)})</span>)}
              </div>
            ) : (
              <div className="flex justify-between px-1 text-xs text-ink-600">
                <span>Desacuerdo (niveles 1 + 2): {total - favorable} ({formatPercentage(total - favorable, total)})</span>
                <span>De acuerdo + Totalmente de acuerdo: {favorable} ({formatPercentValue(total ? favorable * 100 / total : 0)})</span>
              </div>
            )}
          </>
        ) : (
          <Empty className="py-6"><EmptyTitle>Sin respuestas disponibles</EmptyTitle></Empty>
        )}
      </CardContent>
    </Card>
  );
}

function orderedLikertEntries(distribution?: CategoryDistribution) {
  const entries = Object.entries(distribution?.counts ?? {});
  const hasRecognizedLevel = entries.some(([label]) => likertLevel(label) > 0);
  return hasRecognizedLevel ? entries.sort(([a], [b]) => likertLevel(a) - likertLevel(b)) : entries;
}

function likertLevel(label: string) {
  const normalized = label.toLocaleLowerCase("es-BO").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const numericLevel = Number.parseInt(normalized.match(/^\s*(\d+)/)?.[1] ?? "", 10);
  if (Number.isInteger(numericLevel) && numericLevel >= 1 && numericLevel <= 4) return numericLevel;
  if (normalized.includes("desacuerdo")) return normalized.includes("totalmente") || normalized.includes("muy") ? 1 : 2;
  if (normalized.includes("acuerdo")) return normalized.includes("totalmente") || normalized.includes("muy") ? 4 : 3;
  if (normalized === "insatisfecho") return 1;
  if (normalized === "algo satisfecho") return 2;
  if (normalized === "satisfecho") return 3;
  return 0;
}

function favorableCount(distribution?: CategoryDistribution) {
  const entries = orderedLikertEntries(distribution);
  const hasRecognizedLevel = entries.some(([label]) => likertLevel(label) > 0);
  return entries.filter(([label], index) => {
    const level = likertLevel(label);
    const satisfactionScale = entries.some(([entryLabel]) => entryLabel.toLocaleLowerCase("es-BO").includes("satisfecho"));
    return satisfactionScale ? level === 3 : hasRecognizedLevel ? level === 3 || level === 4 : index >= 2;
  }).reduce((sum, [, count]) => sum + count, 0);
}

function favorablePercentage(distribution?: CategoryDistribution) {
  const total = distribution?.validCount ?? 0;
  return total ? ((favorableCount(distribution) / total) * 100).toFixed(1).replace(".", ",") : "—";
}

function formatPercentValue(value: number, digits = 1) {
  return `${value.toFixed(digits).replace(".", ",")} %`;
}

function orderedScaleEntries(distribution: CategoryDistribution | undefined, scale: Scale) {
  const labels = scale === "satisfaction"
    ? ["Insatisfecho", "Algo satisfecho", "Satisfecho"]
    : ["Totalmente en desacuerdo", "En desacuerdo", "De acuerdo", "Totalmente de acuerdo"];
  const existing = Object.keys(distribution?.counts ?? {});
  return labels.map((label) => {
    const actual = existing.find((candidate) => normalizeScaleLabel(candidate) === normalizeScaleLabel(label));
    return [actual ?? label, actual ? distribution?.counts[actual] ?? 0 : 0] as [string, number];
  });
}

function normalizeScaleLabel(label: string) {
  return label.toLocaleLowerCase("es-BO").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function formatPercentage(value: number, total: number) {
  return total ? `${((value / total) * 100).toFixed(1).replace(".", ",")} %` : "0,0 %";
}
