/**
 * Quiet Luxury — a printed monograph on warm paper. Fraunces (high-contrast
 * serif, opsz intact) for display, Source Serif 4 for reading prose, Source
 * Sans 3 as the interface voice, JetBrains Mono for every script-produced
 * number. Two editorial accents — interactive clay and moss — annotate, never
 * flood; hierarchy comes from paper, hairlines and type scale, not boxes.
 * CJK display degrades gracefully: Shippori Mincho / Noto Sans JP are stack
 * names only (users who have them win), falling back to system JP faces —
 * no multi-MB CJK webfonts are shipped.
 */
import type { ThemeTokens } from "../../lib/theme-types.js";

const LATIN_RANGE =
  "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const LATIN_EXT_RANGE =
  "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF";

export const theme: ThemeTokens = {
  /** Interactive clay — links, receipts, index numbers (5.4:1 on paper). */
  accent: "#9E4A2E",
  accentSoft: "#F2E3D5",

  /** Warm paper base. */
  bg: "#F6F1E7",
  bgRaised: "#FCFAF4",
  bgOverlay: "#EFE7D8",
  line: "#E3DACA",

  text: "#1F1D1A",
  textDim: "#56503F",
  textFaint: "#6E6656",

  /** Semantic — moss ok is graphic-only, never body text. */
  ok: "#6F7D58",
  warn: "#82631E",
  error: "#8C3021",

  /** Data-viz ramp (language bars, heatmap), pale parchment to clay. */
  viz: ["#E7DCC4", "#D6BE96", "#C79A6B", "#C15F3C", "#9E4A2E"],

  fontSans:
    "'Source Sans 3', 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic Medium', 'Meiryo', system-ui, -apple-system, 'Segoe UI', sans-serif",
  fontMono:
    "'JetBrains Mono', ui-monospace, 'Cascadia Code', Consolas, monospace",
  fontDisplay:
    "'Fraunces', 'Shippori Mincho', 'Noto Serif JP', 'Hiragino Mincho ProN', 'Yu Mincho', 'Source Serif 4', Georgia, serif",

  radius: "6px",
  radiusSmall: "4px",
  maxWidth: "68rem",

  colorScheme: "light",

  /** --space-1..10 */
  space: [
    "0.25rem",
    "0.5rem",
    "0.75rem",
    "1rem",
    "1.5rem",
    "2rem",
    "3rem",
    "4rem",
    "6rem",
    "8rem",
  ],

  /** --text-* */
  fontSize: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.25rem",
    xl: "1.75rem",
    display: "clamp(2.4rem, 5vw, 3.5rem)",
  },

  /** Warm, low elevation — plates lift on hover only. */
  shadow: {
    sm: "0 1px 2px rgba(60,42,28,.06)",
    md: "0 1px 2px rgba(60,42,28,.06), 0 10px 30px rgba(60,42,28,.07)",
    lg: "0 2px 4px rgba(60,42,28,.05), 0 24px 60px rgba(60,42,28,.10)",
  },

  /** Display clay: large type accents and graphics only (3.8:1). */
  showcase: {
    accent2: "#C15F3C",
    heroScale: "clamp(3.5rem, 9vw, 7rem)",
  },

  /**
   * Self-hosted latin/latin-ext variable subsets (site/public/fonts/).
   * Source Serif 4 ships latin-only (both styles) to stay inside the
   * webfont budget; latin-ext prose glyphs fall back to Georgia.
   */
  webfonts: [
    {
      family: "Fraunces",
      file: "FrauncesVariable.woff2",
      weight: "300 700",
      style: "normal",
      preload: true,
      unicodeRange: LATIN_RANGE,
    },
    {
      family: "Fraunces",
      file: "FrauncesVariable-LatinExt.woff2",
      weight: "300 700",
      style: "normal",
      unicodeRange: LATIN_EXT_RANGE,
    },
    {
      family: "Source Sans 3",
      file: "SourceSans3Variable.woff2",
      weight: "300 700",
      style: "normal",
      preload: true,
      unicodeRange: LATIN_RANGE,
    },
    {
      family: "Source Sans 3",
      file: "SourceSans3Variable-LatinExt.woff2",
      weight: "300 700",
      style: "normal",
      unicodeRange: LATIN_EXT_RANGE,
    },
    {
      family: "Source Serif 4",
      file: "SourceSerif4Variable.woff2",
      weight: "300 700",
      style: "normal",
      unicodeRange: LATIN_RANGE,
    },
    {
      family: "Source Serif 4",
      file: "SourceSerif4Variable-Italic.woff2",
      weight: "300 700",
      style: "italic",
      unicodeRange: LATIN_RANGE,
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
