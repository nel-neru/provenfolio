/**
 * Editorial Swiss — the portfolio as a beautifully set annual report.
 * Swiss/International typographic order on warm near-white paper: one
 * grotesque (Archivo) for all identity work, hierarchy from scale jumps,
 * ink rules and numbered sections, and exactly one small Swiss-red accent.
 * Zero radius, zero shadows (the shadow key is deliberately omitted).
 *
 * Webfonts: Archivo variable is self-hosted as latin + latin-ext subsets;
 * JetBrains Mono reuses the engine's full static builds (which carry the
 * U+2116 numero glyph this theme leans on — all "N°" marks are set in
 * mono). CJK is NOT self-hosted: 'Noto Sans JP' is named in the stacks so
 * visitors who have it win, degrading to the system JP stack (Hiragino
 * Sans / Yu Gothic UI / Meiryo) with no layout impact.
 */
import type { ThemeTokens } from "../../lib/theme-types.js";

export const theme: ThemeTokens = {
  /** Text-safe Swiss red — small sizes only (marks, receipts, links). */
  accent: "#B81D18",
  accentSoft: "#F5E4E2",

  /** Paper surfaces: warm near-white, true-white hover rows, sunken panels. */
  bg: "#FAFAF7",
  bgRaised: "#FFFFFF",
  bgOverlay: "#F3F2ED",
  line: "#E4E2DB",

  text: "#111110",
  textDim: "#55524B",
  textFaint: "#807C72",

  /** Semantic. error reuses the accent: one red on the whole surface. */
  ok: "#1E7A3C",
  warn: "#9A6A00",
  error: "#B81D18",

  /** Ink ramp for data viz — grayscale on paper, darkest = most. */
  viz: ["#E4E2DB", "#C6C3B9", "#9B978B", "#55524B", "#111110"],

  fontSans:
    "'Archivo', 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic UI', 'Meiryo', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, 'Cascadia Code', monospace",
  fontDisplay:
    "'Archivo', 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic UI', 'Meiryo', sans-serif",

  radius: "0px",
  radiusSmall: "2px",
  maxWidth: "1200px",

  colorScheme: "light",

  /** --space-1..10 */
  space: [
    "4px",
    "8px",
    "12px",
    "16px",
    "24px",
    "32px",
    "48px",
    "64px",
    "96px",
    "160px",
  ],

  /** --text-* */
  fontSize: {
    xs: "12px",
    sm: "14px",
    base: "17px",
    lg: "24px",
    xl: "40px",
    display: "clamp(3.5rem, 10vw, 8.5rem)",
  },

  /** Bright red is reserved for the two large brand rules (home, cover). */
  showcase: {
    accent2: "#D6221C",
    heroScale: "clamp(3.5rem, 10vw, 8.5rem)",
  },

  /** Self-hosted (site/public/fonts/). CJK stays on the system stack. */
  webfonts: [
    {
      family: "Archivo",
      file: "ArchivoVariable.woff2",
      weight: "100 900",
      style: "normal",
      preload: true,
      unicodeRange:
        "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    },
    {
      family: "Archivo",
      file: "ArchivoVariable-LatinExt.woff2",
      weight: "100 900",
      style: "normal",
      unicodeRange:
        "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF",
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
