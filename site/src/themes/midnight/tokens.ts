/**
 * Midnight — the engine's default theme. Dark cinematic base, one
 * periwinkle accent, flat borders instead of shadows, restrained motion.
 * Every color/font/radius the site, the 3D hero, the OG images, and the
 * Studio use comes from here (selected via site/theme.config.mjs).
 */
import type { ThemeTokens } from "../../lib/theme-types.js";

export const theme: ThemeTokens = {
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
  textFaint: "#7d8599",

  /** Semantic */
  ok: "#5dd39e",
  warn: "#e8c268",
  error: "#e5636e",

  /** Data-viz ramp (heatmap intensities, language bars) */
  viz: ["#1d2432", "#2b3a5c", "#3d5590", "#5b78c7", "#7c9aff"],

  fontSans:
    "'Inter Variable', 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic UI', 'Meiryo', system-ui, -apple-system, 'Segoe UI', sans-serif",
  fontMono:
    "'JetBrains Mono', ui-monospace, 'Cascadia Code', 'Source Code Pro', monospace",

  radius: "10px",
  radiusSmall: "6px",
  maxWidth: "72rem",

  colorScheme: "dark",

  /** --space-1..8 */
  space: [
    "0.25rem",
    "0.5rem",
    "0.75rem",
    "1rem",
    "1.5rem",
    "2rem",
    "3rem",
    "4rem",
  ],

  /** --text-* */
  fontSize: {
    xs: "0.75rem",
    sm: "0.85rem",
    base: "1rem",
    lg: "1.15rem",
    xl: "clamp(1.8rem, 4vw, 2.4rem)",
    display: "clamp(2.5rem, 8vw, 4.5rem)",
  },

  /** Self-hosted (site/public/fonts/). CJK stays on the system stack. */
  webfonts: [
    {
      family: "Inter Variable",
      file: "InterVariable.woff2",
      weight: "100 900",
      style: "normal",
      preload: true,
    },
    {
      family: "Inter Variable",
      file: "InterVariable-Italic.woff2",
      weight: "100 900",
      style: "italic",
    },
    {
      family: "JetBrains Mono",
      file: "JetBrainsMono-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      family: "JetBrains Mono",
      file: "JetBrainsMono-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
};
