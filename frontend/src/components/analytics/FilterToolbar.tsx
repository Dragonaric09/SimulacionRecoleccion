import { useEffect, useMemo, useState } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import type { AnalyticsSummary } from "@/features/analitica/api";

export const LABOR_STATUS_OPTIONS = ["Trabaja en una organización", "Emprendimiento propio", "Actualmente no trabaja", "Sin respuesta"];
export const SECTOR_OPTIONS = ["Público", "Privado", "Independiente", "ONG", "No trabaja"];

export type TituladosFilterState = { yearFrom?: number; yearTo?: number; laborStatuses: string[]; sectors: string[] };

export function tituladosFilterQuery(filters: TituladosFilterState) {
  const params = new URLSearchParams();
  if (filters.yearFrom !== undefined) params.set("yearFrom", String(filters.yearFrom));
  if (filters.yearTo !== undefined) params.set("yearTo", String(filters.yearTo));
  filters.laborStatuses.forEach((value) => params.append("laborStatus", value));
  filters.sectors.forEach((value) => params.append("sector", value));
  const query = params.toString();
  return query ? `&${query}` : "";
}

export function FilterToolbar({ summary, onQueryChange, count, onReset }: { summary?: AnalyticsSummary; onQueryChange?: (query: string) => void; count?: string; onReset?: () => void }) {
  if (!summary) return <div className="filter-toolbar flex items-center gap-3"><SlidersHorizontal className="h-4 w-4 text-primary" /><span className="text-sm">{count ?? "Filtros"}</span>{onReset && <Button type="button" variant="ghost" size="sm" onClick={onReset}>Limpiar filtros</Button>}</div>;
  return <TituladosFilterToolbar summary={summary} onQueryChange={onQueryChange} />;
}

function TituladosFilterToolbar({ summary, onQueryChange }: { summary: AnalyticsSummary; onQueryChange?: (query: string) => void }) {
  const [filters, setFilters] = useState<TituladosFilterState>({ laborStatuses: [], sectors: [] });
  const [open, setOpen] = useState<string | null>(null);
  // Jackson serializa los límites ausentes como null; normalizarlos evita
  // mostrar "null – null" y mantiene el control en estado neutral.
  const minYear = summary.yearMin ?? undefined;
  const maxYear = summary.yearMax ?? undefined;
  useEffect(() => setFilters({ yearFrom: minYear, yearTo: maxYear, laborStatuses: [], sectors: [] }), [summary.datasetId, minYear, maxYear]);
  const query = useMemo(() => tituladosFilterQuery({ ...filters,
    yearFrom: filters.yearFrom === minYear ? undefined : filters.yearFrom,
    yearTo: filters.yearTo === maxYear ? undefined : filters.yearTo,
  }), [filters, minYear, maxYear]);
  useEffect(() => onQueryChange?.(query), [query, onQueryChange]);
  const update = (next: TituladosFilterState) => setFilters(next);
  const toggle = (key: "laborStatuses" | "sectors", value: string) => update({ ...filters, [key]: filters[key].includes(value) ? filters[key].filter((item) => item !== value) : [...filters[key], value] });
  const reset = () => update({ yearFrom: minYear, yearTo: maxYear, laborStatuses: [], sectors: [] });
  const yearReady = minYear !== undefined && maxYear !== undefined;
  const rangeLabel = yearReady && filters.yearFrom !== undefined && filters.yearTo !== undefined ? `${filters.yearFrom} – ${filters.yearTo}` : "Todos los años";
  const selectionLabel = (values: string[]) => values.length === 0 ? "Todos" : `${values.length} seleccionados`;
  const hasActiveFilters = (yearReady && (filters.yearFrom !== minYear || filters.yearTo !== maxYear)) || filters.laborStatuses.length > 0 || filters.sectors.length > 0;
  const countIsReduced = summary.validResponses < summary.totalResponses;
  return <div className="filter-toolbar mx-auto flex w-full max-w-[1440px] flex-wrap items-end gap-x-2 gap-y-2 p-3 min-[1100px]:flex-nowrap">
    <div className="flex h-10 w-[64px] shrink-0 items-center gap-1.5 text-sm font-medium text-ink-900"><SlidersHorizontal className="h-4 w-4 text-primary" />Filtros</div>
    <div className="grid h-14 w-[220px] shrink-0 gap-1">
      <div className="flex h-4 items-center justify-between text-xs text-ink-600"><span>Año de titulación</span><strong className="font-semibold text-ink-900">{rangeLabel}</strong></div>
      <div className="relative h-10 px-1 pt-2">
        <Slider aria-label="Rango de año de titulación" min={minYear ?? 0} max={maxYear ?? 0} step={1} value={yearReady ? [filters.yearFrom ?? minYear!, filters.yearTo ?? maxYear!] : [0, 0]} disabled={!yearReady || minYear === maxYear} onValueChange={(value) => update({ ...filters, yearFrom: value[0], yearTo: value[1] })} />
        {yearReady && <div className="pointer-events-none absolute inset-x-1 bottom-0 flex justify-between text-[10px] leading-none text-ink-500"><span>{minYear}</span><span>{maxYear}</span></div>}
      </div>
    </div>
    <FilterMenu label="Estado laboral" value={selectionLabel(filters.laborStatuses)} open={open === "labor"} onOpen={() => setOpen(open === "labor" ? null : "labor")} options={LABOR_STATUS_OPTIONS} selected={filters.laborStatuses} onToggle={(value) => toggle("laborStatuses", value)} onClear={() => update({ ...filters, laborStatuses: [] })} />
    <FilterMenu label="Sector" value={selectionLabel(filters.sectors)} open={open === "sector"} onOpen={() => setOpen(open === "sector" ? null : "sector")} options={SECTOR_OPTIONS} selected={filters.sectors} onToggle={(value) => toggle("sectors", value)} onClear={() => update({ ...filters, sectors: [] })} />
    <div className="min-w-0 flex-1" />
    <span className={`shrink-0 whitespace-nowrap text-[11px] ${countIsReduced ? "font-semibold text-primary" : "text-ink-600"}`}>Mostrando <strong>{summary.validResponses}</strong> de {summary.totalResponses} respuestas</span>
    <Button type="button" variant="ghost" size="sm" disabled={!hasActiveFilters} onClick={reset} className={`shrink-0 whitespace-nowrap px-0 text-xs ${hasActiveFilters ? "text-primary hover:text-primary" : "text-ink-400"}`}><RotateCcw className="mr-1 h-3.5 w-3.5" />Limpiar filtros</Button>
  </div>;
}

function FilterMenu({ label, value, open, onOpen, options, selected, onToggle, onClear }: { label: string; value: string; open: boolean; onOpen: () => void; options: string[]; selected: string[]; onToggle: (value: string) => void; onClear: () => void }) {
  return <div className="relative w-[170px] shrink-0"><button type="button" className="grid h-14 w-full gap-1 text-left" onClick={onOpen} aria-expanded={open}><span className="h-4 text-xs text-ink-600">{label}</span><span className="flex h-10 items-center rounded-md border border-surface-container-high bg-white px-3 text-sm text-ink-900">{value}</span></button>
    {open && <div className="absolute z-20 mt-1 w-64 rounded-md border border-surface-container-high bg-white p-3 shadow-lg"><div className="grid gap-2">{options.map((option) => <label key={option} className="flex items-center gap-2 text-sm"><Checkbox checked={selected.includes(option)} onCheckedChange={() => onToggle(option)} />{option}</label>)}</div><Button type="button" variant="ghost" size="sm" className="mt-2 px-0" onClick={onClear}>Limpiar</Button></div>}
  </div>;
}
