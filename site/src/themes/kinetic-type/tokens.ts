/**
 * Kinetic Type — typography IS the interface. One near-black poster ground,
 * a single signal-orange accent, Archivo (variable wght+wdth) set at
 * viewport scale, JetBrains Mono for every machine-made number, 0-radius
 * edges with 999px mono pills as the only soft shape. Motion is semantic
 * (scroll-scrubbed axes, marquee bands, count-ups) and lives entirely
 * behind prefers-reduced-motion: the resting page is a designed poster.
 * CJK degradation: 'Noto Sans JP' is referenced by name only (never
 * self-hosted); systems without it fall back to Hiragino Sans / Yu Gothic
 * Medium / Meiryo, and CJK display lines get weight, not width, variation.
 */
import type { ThemeTokens } from "../../lib/theme-types.js";

export const theme: ThemeTokens = {
  /** Signal orange — large/bold type, rules, fills, flood-fill hovers. */
  accent: "#FF4D00",
  accentSoft: "rgba(255, 77, 0, 0.12)",

  /** Near-black poster ground. */
  bg: "#0E0E0E",
  bgRaised: "#161616",
  bgOverlay: "#1E1E1E",
  line: "#2A2A2A",

  text: "#F2F0EC",
  textDim: "#9A9691",
  textFaint: "#89857F",

  /** Semantic. */
  ok: "#46A758",
  warn: "#FFB224",
  error: "#E5484D",

  /** Data-viz ramp — burnt-orange scale ending at the accent. */
  viz: ["#3A2417", "#6B3A1B", "#A34A15", "#D94E08", "#FF4D00"],

  fontSans:
    "'Archivo', 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic Medium', 'Meiryo', system-ui, sans-serif",
  fontMono:
    "'JetBrains Mono', ui-monospace, 'Cascadia Code', 'Noto Sans JP', 'Meiryo', monospace",
  fontDisplay:
    "'Archivo', 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic Medium', 'Meiryo', system-ui, sans-serif",

  /** Poster edges: no rounding anywhere (pills opt out via 999px locally). */
  radius: "0px",
  radiusSmall: "0px",
  maxWidth: "1280px",

  colorScheme: "dark",

  /** --space-1..7 */
  space: ["0.25rem", "0.5rem", "1rem", "2rem", "3.5rem", "6rem", "10rem"],

  /** --text-* modular scale; fluid poster sizes clamp into this scale. */
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.25rem",
    xl: "2.5rem",
    display: "clamp(3.5rem, 14vw, 12rem)",
  },

  /** Hero name scale on the showcase surface. */
  showcase: {
    heroScale: "clamp(4rem, 21vw, 19rem)",
  },

  /**
   * Self-hosted (site/public/fonts/). The Archivo files here are the
   * wght+wdth build (the width axis drives the scroll scrub) — distinct
   * from the wght-only ArchivoVariable.woff2 other themes may ship.
   */
  webfonts: [
    {
      family: "Archivo",
      file: "ArchivoWidthVariable.woff2",
      weight: "100 900",
      style: "normal",
      preload: true,
      unicodeRange:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
    {
      family: "Archivo",
      file: "ArchivoWidthVariable-LatinExt.woff2",
      weight: "100 900",
      style: "normal",
      unicodeRange:
        "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF",
    },
    {
      family: "JetBrains Mono",
      file: "JetBrainsMonoVariable.woff2",
      weight: "100 800",
      style: "normal",
      preload: true,
      unicodeRange:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
    {
      family: "JetBrains Mono",
      file: "JetBrainsMonoVariable-LatinExt.woff2",
      weight: "100 800",
      style: "normal",
      unicodeRange:
        "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF",
    },
  ],
};
