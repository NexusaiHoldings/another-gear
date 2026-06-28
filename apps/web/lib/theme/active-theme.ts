/**
 * active-theme — the resolved ThemeContract this company wears.
 * Written by provisioning (_step_substrate_install): an approved mood
 * board's derived theme wins, else the CMO's authored ThemeContract
 * (company-theme-authoring-001 / visual phase 3b). Do NOT hand-edit.
 */
import type { ThemeContract } from "./contract";

export const activeTheme: ThemeContract = {
  "type": {
    "fontBody": "inter",
    "fontHeading": "space-grotesk"
  },
  "color": {
    "bg": "#111111",
    "text": "#f0f0f0",
    "accent": "#e8c840",
    "border": "#2e2e2e",
    "danger": "#d94f4f",
    "success": "#3aaa6e",
    "surface": "#1a1a1a",
    "textMuted": "#999999",
    "accentText": "#111111",
    "surfaceAlt": "#242424",
    "borderStrong": "#444444"
  },
  "shape": {
    "radius": 2
  }
};
