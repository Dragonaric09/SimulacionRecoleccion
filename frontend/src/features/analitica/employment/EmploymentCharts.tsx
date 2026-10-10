import { Info } from "lucide-react";
import { Empty, EmptyTitle } from "@/components/ui/empty";
import type { CategoryDistribution } from "../api";

export function MiniDistribution({
  title,
  distribution,
  accent = "blue",
  note,
}: {
  title: string;
  distribution?: CategoryDistribution;
  accent?: "blue" | "teal" | "purple" | "amber";
  note?: string;
}) {
  const entries = Object.entries(distribution?.counts ?? {}).sort(([, a], [, b]) => b - a);
  const accentColor = {
    blue: "#1f6fb5",
    teal: "#0f766e",
    purple: "#7c5ac7",
    amber: "#d8891e",
  }[accent];
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        {note && <span className="text-xs text-ink-600">{note}</span>}
      </div>
      {entries.length ? (
        <div className="space-y-3">
          {entries.map(([label, count]) => {
            const percentage = distribution?.percentages[label] ?? 0;
            return (
              <div key={label} className="space-y-1">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="min-w-0 break-words">{label}</span>
                  <span className="whitespace-nowrap tabular-nums font-semibold">{count} de {distribution?.validCount} ({percentage}%)</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                  <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: accentColor }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty className="py-6"><EmptyTitle>Sin respuestas disponibles</EmptyTitle></Empty>
      )}
    </div>
  );
}

export function StackedRelevanceCard({ distribution }: { distribution?: CategoryDistribution }) {
  const entries = Object.entries(distribution?.counts ?? {});
  const total = distribution?.validCount ?? 0;
  const colors = ["#1f6fb5", "#7db1dd", "#f2a33a", "#d64545"];
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-ink-900">Pertinencia de formación para el cargo</h3>
        <Info className="size-4 text-ink-600" />
      </div>
      {entries.length ? (
        <>
          <div className="flex h-5 overflow-hidden rounded-md bg-surface-container-high">
            {entries.map(([label, count], index) => {
              const percentage = total ? (count / total) * 100 : 0;
              return <div key={label} className="h-full" style={{ width: `${percentage}%`, backgroundColor: colors[index % colors.length] }} title={`${label}: ${count} (${percentage.toFixed(1)}%)`} />;
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-600">
            {entries.map(([label], index) => <span key={label} className="flex items-center gap-1"><i className="size-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />{label} ({distribution?.percentages[label]}%)</span>)}
          </div>
        </>
      ) : (
        <Empty className="py-6"><EmptyTitle>Sin respuestas disponibles</EmptyTitle></Empty>
      )}
    </div>
  );
}
