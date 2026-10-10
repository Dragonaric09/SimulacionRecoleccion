export function formatDecimal(value: number, digits = 2) {
  return value.toFixed(digits).replace(".", ",");
}

export function formatPercentValue(value: number, digits = 1) {
  return `${formatDecimal(value, digits)} %`;
}

export function formatPercentage(value: number, total: number) {
  return formatPercentValue(total ? (value * 100) / total : 0);
}

export function formatCountPercent(count: number, total: number) {
  return `${count} de ${total} (${formatPercentage(count, total)})`;
}

export function sentenceCaseLabel(value: string) {
  const normalized = value.trim().replace(/\s+/g, " ").toLocaleLowerCase("es-BO");
  return normalized
    ? normalized.charAt(0).toLocaleUpperCase("es-BO") + normalized.slice(1)
    : normalized;
}
