/**
 * Neo-brutalist — paper, ink, and one shrieking orange. Every block sits on
 * a 2px ink border with hard zero-blur offset shadows; zero radius anywhere.
 * Archivo Black + Space Mono carry the printed-freight voice; the accent
 * #FF4D00 is never body text — only fills, meters, underlines, focus rings
 * (filled controls at body size use the yellow --show-accent2 instead).
 * CJK degradation: "Dela Gothic One" / "Noto Sans JP" are referenced by name
 * only (multi-MB CJK faces are not self-hosted); machines without them fall
 * back to the system JP stack (Hiragino Sans / Yu Gothic UI / Meiryo).
 */
import type { ThemeTokens } from "../../lib/theme-types.js";

const LATIN =
  "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const LATIN_EXT =
  "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF";

export const theme: ThemeTokens = {
  /** Identity accent — fills under ink type, meters, underlines, focus. */
  accent: "#FF4D00",
  accentSoft: "#FFDCCC",

  /** Paper base */
  bg: "#F4F1E8",
  bgRaised: "#FFFFFF",
  bgOverlay: "#EDE9DC",
  line: "#0A0A0A",

  text: "#0A0A0A",
  textDim: "#4A4740",
  textFaint: "#6E6A61",

  /** Semantic */
  ok: "#1D7A36",
  warn: "#9A6700",
  error: "#B3261E",

  /** Data-viz ramp (language bars, heatmap intensities), low to high */
  viz: ["#FFDCCC", "#FFAE8F", "#FF7E4D", "#FF4D00", "#C23A00"],

  fontSans:
    "'Public Sans', 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic UI', 'Meiryo', system-ui, -apple-system, 'Segoe UI', sans-serif",
  fontMono:
    "'Space Mono', 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic UI', 'Meiryo', ui-monospace, Consolas, monospace",
  fontDisplay:
    "'Archivo Black', 'Dela Gothic One', 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic UI', 'Meiryo', sans-serif",

  /** Zero radius — the whole theme is drawn with a ruler. */
  radius: "0px",
  radiusSmall: "0px",
  maxWidth: "1200px",

  colorScheme: "light",

  /** --space-1..9 (4px base rhythm) */
  space: ["4px", "8px", "12px", "16px", "24px", "32px", "48px", "64px", "96px"],

  /** Modular scale — 17px base x ~1.28 */
  fontSize: {
    xs: "11px",
    sm: "13px",
    base: "17px",
    lg: "22px",
    xl: "28px",
    display: "clamp(40px, 9.5vw, 150px)",
  },

  /** Hard offset shadows — zero blur, ink colored. */
  shadow: {
    sm: "3px 3px 0 #0A0A0A",
    md: "4px 4px 0 #0A0A0A",
    lg: "8px 8px 0 #0A0A0A",
  },

  /** Yellow is the only filled-control color at body size. */
  showcase: {
    accent2: "#FFC900",
    heroScale: "clamp(40px, 9.5vw, 150px)",
  },

  /** Self-hosted latin/latin-ext subsets (site/public/fonts/). */
  webfonts: [
    {
      family: "Archivo Black",
      file: "ArchivoBlack-Regular.woff2",
      weight: "400",
      preload: true,
      unicodeRange: LATIN,
    },
    {
      family: "Archivo Black",
      file: "ArchivoBlack-Regular-LatinExt.woff2",
      weight: "400",
      unicodeRange: LATIN_EXT,
    },
    {
      family: "Public Sans",
      file: "PublicSans-Variable.woff2",
      weight: "100 900",
      preload: true,
      unicodeRange: LATIN,
    },
    {
      family: "Public Sans",
      file: "PublicSans-Variable-LatinExt.woff2",
      weight: "100 900",
      unicodeRange: LATIN_EXT,
    },
    {
      family: "Space Mono",
      file: "SpaceMono-Regular.woff2",
      weight: "400",
      unicodeRange: LATIN,
    },
    {
      family: "Space Mono",
      file: "SpaceMono-Regular-LatinExt.woff2",
      weight: "400",
      unicodeRange: LATIN_EXT,
    },
    {
      family: "Space Mono",
      file: "SpaceMono-Bold.woff2",
      weight: "700",
      unicodeRange: LATIN,
    },
    {
      family: "Space Mono",
      file: "SpaceMono-Bold-LatinExt.woff2",
      weight: "700",
      unicodeRange: LATIN_EXT,
    },
  ],
};
