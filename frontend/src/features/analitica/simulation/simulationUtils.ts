const NATURAL_POSTGRADUATE_LEVELS = ["Diplomado", "Especialidad", "Maestría", "Doctorado"];
const POSTGRADUATE_AREA_OPTIONS = [
  "Inteligencia Artificial",
  "Ciberseguridad",
  "Ciencia de Datos",
  "Cloud Computing y DevOps",
  "Ingeniería de Software",
  "Robótica",
  "Base de Datos",
];

export function simulationCategoryIdentity(label: string) {
  const normalized = label.toLocaleLowerCase("es-BO").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  if (normalized === "ia") return "inteligencia artificial";
  if (normalized.includes("base de dato")) return "base de datos";
  if (normalized.includes("cloud") || normalized.includes("devops")) return "cloud computing y devops";
  return normalized;
}

export function simulationCategoryLabel(label: string) {
  switch (simulationCategoryIdentity(label)) {
    case "inteligencia artificial": return "Inteligencia artificial";
    case "base de datos": return "Base de datos";
    case "cloud computing y devops": return "Cloud computing y DevOps";
    case "ciencia de datos": return "Ciencia de datos";
    case "ingenieria de software": return "Ingeniería de software";
    case "ciberseguridad": return "Ciberseguridad";
    case "robotica": return "Robótica";
    case "redes de datos y seguridad": return "Redes de datos y seguridad";
    default:
      if (label.toLowerCase() === "true") return "Sí";
      if (label.toLowerCase() === "false") return "No";
      return label;
  }
}

export function simulationCategories(variable: string, counts: Record<string, number>) {
  const categories = Object.keys(counts);
  if (variable === "area_posgrado_interes") {
    for (const option of POSTGRADUATE_AREA_OPTIONS) {
      if (!categories.some((category) => simulationCategoryIdentity(category) === simulationCategoryIdentity(option))) categories.push(option);
    }
    const optionOrder = POSTGRADUATE_AREA_OPTIONS.map(simulationCategoryIdentity);
    return categories.sort((a, b) => {
      const countDifference = (counts[b] ?? 0) - (counts[a] ?? 0);
      return countDifference !== 0 ? countDifference : optionOrder.indexOf(simulationCategoryIdentity(a)) - optionOrder.indexOf(simulationCategoryIdentity(b));
    });
  }
  if (variable !== "nivel_posgrado_interes") return categories;
  return categories.sort((a, b) => {
    const aIndex = NATURAL_POSTGRADUATE_LEVELS.indexOf(a);
    const bIndex = NATURAL_POSTGRADUATE_LEVELS.indexOf(b);
    return (aIndex < 0 ? NATURAL_POSTGRADUATE_LEVELS.length : aIndex) - (bIndex < 0 ? NATURAL_POSTGRADUATE_LEVELS.length : bIndex);
  });
}

export function simulationVariableLabel(variable: string) {
  const labels: Record<string, string> = {
    area_posgrado_interes: "Área de posgrado de interés",
    nivel_posgrado_interes: "Nivel de posgrado de interés",
    modalidad_posgrado: "Modalidad preferida",
    financiamiento_posgrado_estimado: "Fuente de financiamiento estimada",
    interes_posgrado: "Interés en posgrado",
    situacion_laboral_actual: "Estado laboral",
  };
  return labels[variable] ?? variable;
}

export function simulationPercent(value: number) {
  return `${value.toFixed(1).replace(".", ",")} %`;
}

export function simulationDelta(value: number, observed: number) {
  const delta = value - observed;
  return `${delta > 0 ? "+" : ""}${delta.toFixed(1).replace(".", ",")} pp`;
}

export function parseSimulationInteger(value: string, fallback: number) {
  if (value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}
