import { useEffect, useMemo, useState } from "react";
import { RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import type { AnalyticsSummary } from "@/features/analitica/api";
import { loadTituladosFilterQuery, saveTituladosFilterQuery } from "@/features/analitica/shared/tituladosFilterStorage";

/* Opciones con las etiquetas del formulario de titulados (form/form_export_titulados00.json). */
const LABOR_STATUS_OPTIONS = ["Trabaja en una organización", "Emprendimiento propio", "Actualmente no trabaja", "Sin respuesta"];
/* «Sin clasificar» agrupa la respuesta «No trabaja» del formulario; «Sin respuesta», a quienes no tienen sector
   porque no trabajan en una organización. Con ambas, las opciones cubren a todas las personas. */
const SECTOR_OPTIONS = ["Público", "Privado", "Independiente", "ONG", "Sin clasificar", "Sin respuesta"];
const GENDER_OPTIONS = ["Hombre", "Mujer"];
const AGE_RANGE_OPTIONS = ["15 - 18 años", "19 - 22 años", "23 - 26 años", "27 - 30 años", "31 - 34 años", "35 años o más", "Sin respuesta"];
const POSTGRADUATE_INTEREST_OPTIONS = ["Sí", "No", "Sin respuesta"];

/** Filtros de selección múltiple de titulados: clave del estado → parámetro de la URL y opciones. */
const MULTI_FILTERS = [
  { key: "laborStatuses", param: "laborStatus", label: "Estado laboral", options: LABOR_STATUS_OPTIONS },
  { key: "sectors", param: "sector", label: "Sector", options: SECTOR_OPTIONS },
  { key: "genders", param: "gender", label: "Género", options: GENDER_OPTIONS },
  { key: "ageRanges", param: "ageRange", label: "Rango de edad", options: AGE_RANGE_OPTIONS },
  { key: "postgraduateInterest", param: "postgraduateInterest", label: "Interés en posgrado", options: POSTGRADUATE_INTEREST_OPTIONS },
] as const;

type MultiKey = (typeof MULTI_FILTERS)[number]["key"];

export type TituladosFilterState = { yearFrom?: number; yearTo?: number } & Record<MultiKey, string[]>;

const EMPTY_MULTI = Object.fromEntries(MULTI_FILTERS.map((filter) => [filter.key, []])) as unknown as Record<MultiKey, string[]>;

function tituladosFilterQuery(filters: TituladosFilterState) {
  const params = new URLSearchParams();
  if (filters.yearFrom !== undefined) params.set("yearFrom", String(filters.yearFrom));
  if (filters.yearTo !== undefined) params.set("yearTo", String(filters.yearTo));
  MULTI_FILTERS.forEach((filter) => filters[filter.key].forEach((value) => params.append(filter.param, value)));
  const query = params.toString();
  return query ? `&${query}` : "";
}

export function FilterToolbar({ summary, onQueryChange, count, onReset }: { summary?: AnalyticsSummary; onQueryChange?: (query: string) => void; count?: string; onReset?: () => void }) {
  if (!summary) return <div className="filter-toolbar flex items-center gap-3"><SlidersHorizontal className="h-4 w-4 text-primary" /><span className="text-sm">{count ?? "Filtros"}</span>{onReset && <Button type="button" variant="ghost" size="sm" onClick={onReset}>Limpiar filtros</Button>}</div>;
  return <TituladosFilterToolbar summary={summary} onQueryChange={onQueryChange} />;
}

function TituladosFilterToolbar({ summary, onQueryChange }: { summary: AnalyticsSummary; onQueryChange?: (query: string) => void }) {
  const [filters, setFilters] = useState<TituladosFilterState>({ ...EMPTY_MULTI });
  const [initialized, setInitialized] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const minYear = summary.yearMin ?? undefined;
  const maxYear = summary.yearMax ?? undefined;
  useEffect(() => {
    const saved = loadTituladosFilterQuery(summary.datasetId);
    const params = saved ? new URLSearchParams(saved.replace(/^&/, "")) : null;
    const savedFrom = params?.get("yearFrom");
    const savedTo = params?.get("yearTo");
    // Solo valores vigentes del filtro; «No trabaja» (opción anterior de sector) pasa a «Sin clasificar».
    const restored = (filter: (typeof MULTI_FILTERS)[number]) => [...new Set((params?.getAll(filter.param) ?? []).map((value) => (filter.key === "sectors" && value === "No trabaja" ? "Sin clasificar" : value)))].filter((value) => (filter.options as readonly string[]).includes(value));
    const multi = Object.fromEntries(MULTI_FILTERS.map((filter) => [filter.key, restored(filter)])) as unknown as Record<MultiKey, string[]>;
    setFilters({ yearFrom: savedFrom ? Number(savedFrom) : minYear, yearTo: savedTo ? Number(savedTo) : maxYear, ...multi });
    setInitialized(true);
  }, [summary.datasetId, minYear, maxYear]);
  const query = useMemo(() => tituladosFilterQuery({ ...filters,
    yearFrom: filters.yearFrom === minYear ? undefined : filters.yearFrom,
    yearTo: filters.yearTo === maxYear ? undefined : filters.yearTo,
  }), [filters, minYear, maxYear]);
  useEffect(() => {
    if (!initialized) return;
    const timer = window.setTimeout(() => {
      onQueryChange?.(query);
      saveTituladosFilterQuery(summary.datasetId, query);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [initialized, query, onQueryChange, summary.datasetId]);
  const update = (next: TituladosFilterState) => setFilters(next);
  const toggle = (key: MultiKey, value: string) => update({ ...filters, [key]: filters[key].includes(value) ? filters[key].filter((item) => item !== value) : [...filters[key], value] });
  const reset = () => update({ yearFrom: minYear, yearTo: maxYear, ...EMPTY_MULTI });
  const yearReady = minYear !== undefined && maxYear !== undefined;
  const rangeLabel = yearReady && filters.yearFrom !== undefined && filters.yearTo !== undefined ? `${filters.yearFrom} – ${filters.yearTo}` : "Todos los años";
  const selectionLabel = (values: string[]) => values.length === 0 ? "Todos" : values.length === 1 ? values[0] : `${values.length} seleccionados`;
  const hasActiveFilters = (yearReady && (filters.yearFrom !== minYear || filters.yearTo !== maxYear)) || MULTI_FILTERS.some((filter) => filters[filter.key].length > 0);
  const countIsReduced = summary.validResponses < summary.totalResponses;
  return <div className="filter-toolbar mx-auto flex w-full max-w-[1440px] flex-wrap items-end gap-x-2 gap-y-2 p-3">
    <div className="flex h-10 w-[64px] shrink-0 items-center gap-1.5 text-sm font-medium text-ink-900"><SlidersHorizontal className="h-4 w-4 text-primary" />Filtros</div>
    <div className="grid h-14 w-[220px] shrink-0 gap-1">
      <div className="flex h-4 items-center justify-between text-xs text-ink-600"><span>Año de titulación</span><strong className="font-semibold text-ink-900">{rangeLabel}</strong></div>
      <div className="relative h-10 px-1 pt-2">
        <Slider aria-label="Rango de año de titulación" min={minYear ?? 0} max={maxYear ?? 0} step={1} value={yearReady ? [filters.yearFrom ?? minYear!, filters.yearTo ?? maxYear!] : [0, 0]} disabled={!yearReady || minYear === maxYear} onValueChange={(value) => update({ ...filters, yearFrom: value[0], yearTo: value[1] })} />
        {yearReady && <div className="pointer-events-none absolute inset-x-1 bottom-0 flex justify-between text-[10px] leading-none text-ink-500"><span>{minYear}</span><span>{maxYear}</span></div>}
      </div>
    </div>
    {MULTI_FILTERS.map((filter) => (
      <FilterMenu
        key={filter.key}
        label={filter.label}
        value={selectionLabel(filters[filter.key])}
        open={open === filter.key}
        onOpen={() => setOpen(open === filter.key ? null : filter.key)}
        options={[...filter.options]}
        selected={filters[filter.key]}
        onToggle={(value) => toggle(filter.key, value)}
        onClear={() => update({ ...filters, [filter.key]: [] })}
      />
    ))}
    <div className="min-w-0 flex-1" />
    <span className={`shrink-0 whitespace-nowrap text-[11px] ${countIsReduced ? "font-semibold text-primary" : "text-ink-600"}`}>Mostrando <strong>{summary.validResponses}</strong> de {summary.totalResponses} respuestas</span>
    <Button type="button" variant="ghost" size="sm" disabled={!hasActiveFilters} onClick={reset} className={`shrink-0 whitespace-nowrap px-0 text-xs ${hasActiveFilters ? "text-primary hover:text-primary" : "text-ink-400"}`}><RotateCcw className="mr-1 h-3.5 w-3.5" />Limpiar filtros</Button>
  </div>;
}

export function FilterMenu({ label, value, open, onOpen, options, selected, onToggle, onClear }: { label: string; value: string; open: boolean; onOpen: () => void; options: string[]; selected: string[]; onToggle: (value: string) => void; onClear: () => void }) {
  return <div className="relative w-[170px] shrink-0"><button type="button" className="grid h-14 w-full gap-1 text-left" onClick={onOpen} aria-expanded={open}><span className="h-4 text-xs text-ink-600">{label}</span><span className="flex h-10 min-w-0 items-center rounded-md border border-surface-container-high bg-white px-3 text-sm text-ink-900" title={value}><span className="truncate">{value}</span></span></button>
    {open && <div className="absolute z-20 mt-1 max-h-80 w-72 overflow-y-auto rounded-md border border-surface-container-high bg-white p-3 shadow-lg"><div className="grid gap-2">{options.map((option) => <label key={option} className="flex items-center gap-2 text-sm"><Checkbox checked={selected.includes(option)} onCheckedChange={() => onToggle(option)} />{option}</label>)}</div><Button type="button" variant="ghost" size="sm" className="mt-2 px-0" onClick={onClear}>Limpiar</Button></div>}
  </div>;
}
