/**
 * Acid-lab — a Y2K acid-graphics laboratory where the portfolio's real
 * instrumentation is the decoration. Chrome-gradient display type
 * (Unbounded) on a violet-black base, one hot acid-lime accent, magenta as
 * a large-size-only secondary, and a JetBrains Mono cockpit voice that
 * renders script-produced metrics as system readouts. Chaos is quantized:
 * one dither texture, one blink behavior, two radii (pill / 10px), fixed
 * sticker rotations, hard offset shadows — never soft elevation.
 *
 * CJK degradation: only Latin subsets are self-hosted. 'Noto Sans JP' is a
 * named fallback (users who have it win), then the system JP stack; the
 * pixel face (DotGothic16) ships Latin-only, so Japanese pixel text falls
 * back to the mono/system stack by design.
 */
import type { ThemeTokens } from "../../lib/theme-types.js";

const LATIN_RANGE =
  "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const LATIN_EXT_RANGE =
  "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF";

export const theme: ThemeTokens = {
  /** Single chromatic accent — acid lime (links, receipts, viz emphasis). */
  accent: "#c8ff00",
  accentSoft: "#c8ff0026",

  /** Violet-black base surfaces. */
  bg: "#0d0b14",
  bgRaised: "#161221",
  bgOverlay: "#1e1930",
  line: "#2e2745",

  text: "#f1edfa",
  textDim: "#b4abcf",
  textFaint: "#7e7499",

  /** Semantic. */
  ok: "#7dd957",
  warn: "#ffc82e",
  error: "#ff5c5c",

  /** Data-viz ramp, low -> high: violet dusk up to hot magenta and acid. */
  viz: ["#2e2745", "#453a66", "#8800ff", "#ff4fd8", "#c8ff00"],

  fontSans:
    "'Space Grotesk', 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic UI', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', ui-monospace, Consolas, monospace",
  fontDisplay: "'Unbounded', 'Noto Sans JP', sans-serif",

  /** The quantized two-radius system: 10px frames, pills for everything small. */
  radius: "10px",
  radiusSmall: "999px",
  maxWidth: "1120px",

  colorScheme: "dark",

  /** --space-1..10 (4px grid). */
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
    "128px",
  ],

  /** --text-* modular scale. */
  fontSize: {
    xs: "12px",
    sm: "13px",
    base: "16px",
    lg: "19px",
    xl: "clamp(22px, 2.6vw, 28px)",
    display: "clamp(40px, 6vw, 56px)",
  },

  /** Hard offset shadows (sm acid / md magenta) + one accent glow. */
  shadow: {
    sm: "2px 2px 0 #c8ff00",
    md: "6px 6px 0 #ff4fd8",
    lg: "0 0 24px color-mix(in srgb, #c8ff00 35%, transparent)",
  },

  showcase: {
    accent2: "#ff4fd8",
    heroScale: "clamp(40px, 10.5vw, 118px)",
  },

  /** Self-hosted Latin subsets (site/public/fonts/); CJK stays on the system stack. */
  webfonts: [
    {
      family: "Unbounded",
      file: "Unbounded-Variable.woff2",
      weight: "200 900",
      style: "normal",
      preload: true,
      unicodeRange: LATIN_RANGE,
    },
    {
      family: "Unbounded",
      file: "Unbounded-Variable-LatinExt.woff2",
      weight: "200 900",
      style: "normal",
      unicodeRange: LATIN_EXT_RANGE,
    },
    {
      family: "Space Grotesk",
      file: "SpaceGrotesk-Variable.woff2",
      weight: "300 700",
      style: "normal",
      preload: true,
      unicodeRange: LATIN_RANGE,
    },
    {
      family: "Space Grotesk",
      file: "SpaceGrotesk-Variable-LatinExt.woff2",
      weight: "300 700",
      style: "normal",
      unicodeRange: LATIN_EXT_RANGE,
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
    {
      family: "DotGothic16",
      file: "DotGothic16-Latin.woff2",
      weight: "400",
      style: "normal",
      unicodeRange: LATIN_RANGE,
    },
  ],
};
