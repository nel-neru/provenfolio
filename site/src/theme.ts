/**
 * Design tokens — THE buyer customization surface (with src/overrides/).
 * Engine updates never touch this file. Every color/font/radius the site,
 * the 3D hero, and the OG images use comes from here.
 */
export const theme = {
  /** Single chromatic accent (links, receipts, data viz emphasis) */
  accent: "#7c9aff",
  accentSoft: "#7c9aff33",

  /** Dark cinematic base */
  bg: "#0b0d12",
  bgRaised: "#12151d",
  bgOverlay: "#1a1e28",
  line: "#262b38",

  text: "#e8eaf0",
  textDim: "#9aa1b5",
  textFaint: "#5c6375",

  /** Semantic */
  ok: "#5dd39e",
  warn: "#e8c268",

  /** Data-viz ramp (heatmap intensities, language bars) */
  viz: ["#1d2432", "#2b3a5c", "#3d5590", "#5b78c7", "#7c9aff"],

  fontSans:
    "'Inter Variable', 'Noto Sans JP', system-ui, -apple-system, 'Segoe UI', sans-serif",
  fontMono:
    "'JetBrains Mono', ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace",

  radius: "10px",
  radiusSmall: "6px",
  maxWidth: "72rem",
} as const;

export type Theme = typeof theme;

/** Inject tokens as CSS custom properties (used by Base layout). */
export function themeCssVars(): string {
  return `
    --accent: ${theme.accent};
    --accent-soft: ${theme.accentSoft};
    --bg: ${theme.bg};
    --bg-raised: ${theme.bgRaised};
    --bg-overlay: ${theme.bgOverlay};
    --line: ${theme.line};
    --text: ${theme.text};
    --text-dim: ${theme.textDim};
    --text-faint: ${theme.textFaint};
    --ok: ${theme.ok};
    --warn: ${theme.warn};
    --viz-0: ${theme.viz[0]};
    --viz-1: ${theme.viz[1]};
    --viz-2: ${theme.viz[2]};
    --viz-3: ${theme.viz[3]};
    --viz-4: ${theme.viz[4]};
    --font-sans: ${theme.fontSans};
    --font-mono: ${theme.fontMono};
    --radius: ${theme.radius};
    --radius-sm: ${theme.radiusSmall};
    --max-w: ${theme.maxWidth};
  `;
}
