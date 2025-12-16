import type { NoteBackgroundData } from "./types";

export const SOLID_COLORS: NoteBackgroundData[] = [
  { id: "color_red", isPattern: false, lightColor: "#FFEBEE", darkColor: "#4A1C1C" },
  { id: "color_orange", isPattern: false, lightColor: "#FFF3E0", darkColor: "#4A2C1C" },
  { id: "color_yellow", isPattern: false, lightColor: "#FFFDE7", darkColor: "#4A4A1C" },
  { id: "color_green", isPattern: false, lightColor: "#E8F5E9", darkColor: "#1C4A1C" },
  { id: "color_teal", isPattern: false, lightColor: "#E0F2F1", darkColor: "#1C4A4A" },
  { id: "color_blue", isPattern: false, lightColor: "#E3F2FD", darkColor: "#1C2C4A" },
  { id: "color_purple", isPattern: false, lightColor: "#F3E5F5", darkColor: "#3A1C4A" },
  { id: "color_pink", isPattern: false, lightColor: "#FCE4EC", darkColor: "#4A1C3A" },
  { id: "color_brown", isPattern: false, lightColor: "#EFEBE9", darkColor: "#3A2C1C" },
  { id: "color_gray", isPattern: false, lightColor: "#ECEFF1", darkColor: "#2C2C2C" },
];

export const PATTERNS: NoteBackgroundData[] = [
  { id: "pattern_dots", isPattern: true, lightColor: "#FAFAFA", darkColor: "#1A1A1A" },
  { id: "pattern_grid", isPattern: true, lightColor: "#FAFAFA", darkColor: "#1A1A1A" },
  { id: "pattern_lines", isPattern: true, lightColor: "#FAFAFA", darkColor: "#1A1A1A" },
  { id: "pattern_waves", isPattern: true, lightColor: "#E3F2FD", darkColor: "#1C2C4A" },
  { id: "pattern_groceries", isPattern: true, lightColor: "#FFF3E0", darkColor: "#4A2C1C" },
  { id: "pattern_music", isPattern: true, lightColor: "#F3E5F5", darkColor: "#3A1C4A" },
  { id: "pattern_travel", isPattern: true, lightColor: "#E0F2F1", darkColor: "#1C4A4A" },
  { id: "pattern_code", isPattern: true, lightColor: "#ECEFF1", darkColor: "#2C2C2C" },
];

export const NOTE_BACKGROUND_STYLES: NoteBackgroundData[] = [
  ...SOLID_COLORS,
  ...PATTERNS,
];
