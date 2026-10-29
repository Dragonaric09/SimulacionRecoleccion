import { useEffect, useMemo, useState } from "react";
import { ChevronDown, RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  const hasActiveFilters = (yearReady && (filters.yearFrom !== minYear || filters.yearTo !== maxYear)) || MULTI_FILTERS.some((filter) => filters[filter.key].length > 0);
  const countIsReduced = summary.validResponses < summary.totalResponses;
  return <div className="filter-toolbar mx-auto flex w-full max-w-[1440px] flex-wrap items-end gap-x-2 gap-y-2 p-3 [--filter-accent:var(--primary)]">
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
        options={[...filter.options]}
        selected={filters[filter.key]}
        onToggle={(value) => toggle(filter.key, value)}
        onClear={() => update({ ...filters, [filter.key]: [] })}
      />
    ))}
    <div className="min-w-0 flex-1" />
    <span className={`shrink-0 whitespace-nowrap text-[11px] ${countIsReduced ? "font-semibold text-primary" : "text-ink-600"}`}>Mostrando <strong>{summary.validResponses}</strong> de {summary.totalResponses} respuestas</span>
    <Button type="button" variant="ghost" size="sm" disabled={!hasActiveFilters} onClick={reset} className={`shrink-0 whitespace-nowrap px-0 text-xs ${hasActiveFilters ? "text-primary hover:text-primary" : "text-ink-400"}`}><RotateCcw className="mr-1 h-3.5 w-3.5" />Limpiar filtros</Button>
    <ActiveFilterChips
      groups={MULTI_FILTERS.map((filter) => ({ key: filter.key, label: filter.label, values: filters[filter.key] }))}
      onRemove={(key, value) => toggle(key as MultiKey, value)}
    />
  </div>;
}

export type FilterTone = "titulados" | "empleadores";
const ACCENT: Record<FilterTone, string> = {
  titulados: "[--filter-accent:var(--primary)]",
  empleadores: "[--filter-accent:var(--empleadores)]",
};

/** A partir de este número de opciones el menú ofrece un buscador. */
const SEARCH_THRESHOLD = 8;

/**
 * Filtro de selección múltiple, único en el sistema (titulados y empleadores). El tono fija el color de acento
 * (--filter-accent) en el botón y en el menú, que se dibuja fuera de la barra y no hereda sus variables.
 */
export function FilterMenu({ label, options, selected, onToggle, onClear, tone = "titulados" }: { label: string; options: string[]; selected: string[]; onToggle: (value: string) => void; onClear: () => void; tone?: FilterTone }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const active = selected.length > 0;
  // Se respeta el orden del formulario: el botón muestra la primera opción elegida y cuántas más hay.
  const ordered = options.filter((option) => selected.includes(option));
  const value = ordered[0] ?? "Todos";
  const summary = ordered.length > 1 ? `${ordered.length} seleccionados: ${ordered.join(", ")}` : value;
  const normalized = (text: string) => text.toLocaleLowerCase("es-BO").normalize("NFD").replace(/[̀-ͯ]/g, "");
  const visible = search ? options.filter((option) => normalized(option).includes(normalized(search))) : options;
  return <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setSearch(""); }}>
    <div className={`grid w-[calc(50%-6px)] min-w-0 shrink-0 gap-1 sm:w-[170px] ${ACCENT[tone]}`}>
      <span className="h-4 truncate text-xs leading-4 text-ink-600" title={label}>{label}</span>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${summary}`}
          data-active={active || undefined}
          className="group/filter flex h-10 w-full min-w-0 items-center gap-2 rounded-lg border border-surface-container-high bg-white px-3 text-left text-sm text-ink-900 shadow-xs transition-colors hover:border-ink-400 focus-visible:ring-3 focus-visible:ring-(--filter-accent)/25 focus-visible:outline-none aria-expanded:border-(--filter-accent) data-active:border-(--filter-accent)/60 data-active:bg-(--filter-accent)/5 data-active:font-medium data-active:text-(--filter-accent)"
          title={summary}
        >
          <span className="min-w-0 flex-1 truncate">{value}</span>
          {ordered.length > 1 && <span className="shrink-0 rounded-full bg-(--filter-accent) px-1.5 text-[11px] leading-5 font-semibold text-white tabular-nums">+{ordered.length - 1}</span>}
          <ChevronDown className="size-4 shrink-0 text-ink-500 transition-transform group-aria-expanded/filter:rotate-180" />
        </button>
      </PopoverTrigger>
    </div>
    <PopoverContent align="start" className={`w-72 gap-0 p-0 ${ACCENT[tone]}`}>
      <div className="flex items-center justify-between gap-2 border-b border-border-line px-3 py-2">
        <span className="text-sm font-semibold text-ink-900">{label}</span>
        <span className="text-xs text-ink-600">{active ? `${selected.length} de ${options.length}` : "Todos"}</span>
      </div>
      {options.length >= SEARCH_THRESHOLD && (
        <div className="border-b border-border-line p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-500" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar opción" aria-label={`Buscar en ${label}`} className="h-8 pl-8 text-sm" />
          </div>
        </div>
      )}
      <div className="max-h-72 overflow-y-auto p-1" role="group" aria-label={label}>
        {visible.map((option) => {
          const checked = selected.includes(option);
          return <label key={option} className={`flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 text-sm transition-colors hover:bg-surface-container-low ${checked ? "font-medium text-ink-900" : "text-ink-700"}`}>
            <Checkbox checked={checked} onCheckedChange={() => onToggle(option)} className="mt-0.5 data-checked:border-(--filter-accent) data-checked:bg-(--filter-accent)" />
            <span className="min-w-0 leading-snug">{option}</span>
          </label>;
        })}
        {visible.length === 0 && <p className="px-2 py-3 text-center text-xs text-ink-600">Ninguna opción coincide con «{search}».</p>}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border-line px-2 py-1.5">
        <Button type="button" variant="ghost" size="sm" disabled={!active} onClick={onClear} className="text-xs text-ink-600">Quitar selección</Button>
        <Button type="button" size="sm" onClick={() => setOpen(false)} className="bg-(--filter-accent) text-xs text-white hover:bg-(--filter-accent)/90">Listo</Button>
      </div>
    </PopoverContent>
  </Popover>;
}

/** Selecciones activas como chips removibles, debajo de la barra de filtros. */
export function ActiveFilterChips({ groups, onRemove }: { groups: { key: string; label: string; values: string[] }[]; onRemove: (key: string, value: string) => void }) {
  const active = groups.filter((group) => group.values.length > 0);
  if (active.length === 0) return null;
  return <div className="flex w-full flex-wrap items-center gap-1.5 border-t border-border-line pt-2">
    {active.flatMap((group) => group.values.map((value) => (
      <span key={`${group.key}-${value}`} className="inline-flex max-w-full items-center gap-1 rounded-full border border-(--filter-accent)/30 bg-(--filter-accent)/8 py-0.5 pr-0.5 pl-2.5 text-xs text-ink-900">
        <span className="text-ink-600">{group.label}:</span>
        <span className="truncate font-medium">{value}</span>
        <button type="button" onClick={() => onRemove(group.key, value)} aria-label={`Quitar ${group.label}: ${value}`} className="grid size-5 shrink-0 place-items-center rounded-full text-ink-500 transition-colors hover:bg-(--filter-accent)/15 hover:text-ink-900">
          <X className="size-3" />
        </button>
      </span>
    )))}
  </div>;
}
