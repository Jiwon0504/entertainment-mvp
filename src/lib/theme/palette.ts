import { Theme } from "./ThemeContext";

// Chart color constants for both surfaces (validated palette).
// See dataviz skill: references/palette.md for the source of truth.

export const seriesColorLight = {
  1: "#2a78d6",
  2: "#eb6834",
  3: "#1baf7a",
  4: "#eda100",
  5: "#e87ba4",
  6: "#008300",
  7: "#4a3aa7",
  8: "#e34948",
} as const;

export const seriesColorDark = {
  1: "#3987e5",
  2: "#d95926",
  3: "#199e70",
  4: "#c98500",
  5: "#d55181",
  6: "#008300",
  7: "#9085e9",
  8: "#e66767",
} as const;

export const statusColorLight = {
  good: "#0ca30c",
  warning: "#fab219",
  serious: "#ec835a",
  critical: "#d03b3b",
} as const;

export const statusColorDark = statusColorLight;

export const chartInkLight = {
  primary: "#0b0b0b",
  secondary: "#52514e",
  muted: "#898781",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  surface: "#fcfcfb",
} as const;

export const chartInkDark = {
  primary: "#ffffff",
  secondary: "#c3c2b7",
  muted: "#898781",
  grid: "#2c2c2a",
  axis: "#383835",
  surface: "#1a1a19",
} as const;

export function getChartPalette(theme: Theme) {
  return theme === "dark"
    ? { series: seriesColorDark, status: statusColorDark, ink: chartInkDark }
    : { series: seriesColorLight, status: statusColorLight, ink: chartInkLight };
}

// Backwards-compatible light-mode exports (used before theme-awareness existed).
export const seriesColor = seriesColorLight;
export const statusColor = statusColorLight;
export const chartInk = chartInkLight;
