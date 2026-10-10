export function normalizeAnalyticsLabel(value: string) {
  return value
    .toLocaleLowerCase("es-BO")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[‐‑‒–—-]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function displayLaborLabel(value: string) {
  const normalized = normalizeAnalyticsLabel(value);
  return normalized.includes("no trabaja") || normalized.includes("no trabajo") || normalized.includes("busqueda") || normalized.includes("desemple") || normalized.includes("sin empleo")
    ? "Sin empleo"
    : value;
}
