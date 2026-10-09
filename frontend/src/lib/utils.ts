export { cn } from "cn";

export function contrastTextColor(background: string) {
  const rgb = background.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i,
  );
  const hex = background.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
  let red: number;
  let green: number;
  let blue: number;
  let alpha = 1;

  if (rgb) {
    red = Number(rgb[1]);
    green = Number(rgb[2]);
    blue = Number(rgb[3]);
    alpha = rgb[4] == null ? 1 : Number(rgb[4]);
  } else if (hex) {
    const value = hex[1].length === 3
      ? hex[1].split("").map((part) => part + part).join("")
      : hex[1];
    red = parseInt(value.slice(0, 2), 16);
    green = parseInt(value.slice(2, 4), 16);
    blue = parseInt(value.slice(4, 6), 16);
  } else {
    return "#0f172a";
  }

  red = red * alpha + 255 * (1 - alpha);
  green = green * alpha + 255 * (1 - alpha);
  blue = blue * alpha + 255 * (1 - alpha);
  const channel = (value: number) => {
    const normalized = value / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
  return luminance < 0.35 ? "#ffffff" : "#0f172a";
}
