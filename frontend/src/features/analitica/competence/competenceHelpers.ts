export function parseInteger(value: string, fallback: number) {
  if (value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

export function groupLabel(group: string) {
  return group === "HARD_SKILL"
    ? "Hard skills"
    : group === "SOFT_SKILL"
      ? "Soft skills"
      : group.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function groupDisplayName(group: string) {
  return group === "HARD_SKILL" || group === "Hard skills"
    ? "hard skills"
    : group === "SOFT_SKILL" || group === "Soft skills"
      ? "soft skills"
      : groupLabel(group).toLowerCase();
}
