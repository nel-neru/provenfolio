/**
 * Data-forensic — the portfolio as a forensic dossier. Charcoal with a
 * faint green cast, one phosphor-green accent used with total discipline,
 * evidence-amber for stamps; IBM Plex Mono marks "this text is data"
 * (SHAs, metrics, labels, ledger rows) while Plex Sans carries prose.
 * Hairlines, dotted leaders, and file metadata are the only ornament.
 * CJK degradation: "IBM Plex Sans JP" is referenced by name only (never
 * self-hosted); systems without it fall back to Noto Sans JP / Hiragino /
 * Yu Gothic — a designed, weight-free degradation.
 */
import type { ThemeTokens } from "../../lib/theme-types.js";

const LATIN =
  "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const LATIN_EXT =
  "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF";

export const theme: ThemeTokens = {
  /** Phosphor green — interactive + evidence, nothing else */
  accent: "#3DD68C",
  accentSoft: "rgba(61, 214, 140, 0.12)",

  /** Charcoal with a faint green cast */
  bg: "#0A0D0C",
  bgRaised: "#101513",
  bgOverlay: "#161C1A",
  line: "#232B28",

  text: "#C9D2CC",
  textDim: "#93A09A",
  textFaint: "#77867E",

  /** Semantic: ok mirrors the accent; amber is the evidence stamp */
  ok: "#3DD68C",
  warn: "#FFA133",
  error: "#FF5D5D",

  /** Green phosphor ramp; viz[4] is the bright "live edge" cap */
  viz: ["#16352A", "#1E7A52", "#2AA96F", "#3DD68C", "#8CF0BE"],

  fontSans:
    "'IBM Plex Sans', 'IBM Plex Sans JP', 'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic Medium', 'Meiryo', system-ui, sans-serif",
  fontMono:
    "'IBM Plex Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace",
  fontDisplay: "'IBM Plex Mono', ui-monospace, monospace",

  /** Square voice: hairline radii, none on chips/badges */
  radius: "2px",
  radiusSmall: "0px",
  maxWidth: "72rem",

  colorScheme: "dark",

  /** --space-1..8 — the ledger rhythm every margin/padding snaps to */
  space: ["4px", "8px", "12px", "16px", "24px", "32px", "48px", "72px"],

  /** Modular scale: 12 caps meta / 14 data / 16 prose / 22 names / 28 stats */
  fontSize: {
    xs: "12px",
    sm: "14px",
    base: "16px",
    lg: "22px",
    xl: "28px",
    display: "clamp(2.375rem, 7vw, 3.25rem)",
  },

  /** sm/md reserved for hard-offset panels; lg is the :target phosphor glow */
  shadow: {
    sm: "4px 4px 0 rgba(0, 0, 0, 0.35)",
    md: "8px 8px 0 rgba(0, 0, 0, 0.4)",
    lg: "0 0 24px rgba(61, 214, 140, 0.12)",
  },

  showcase: {
    accent2: "#FFA133",
    heroScale: "clamp(2.375rem, 7vw, 3.25rem)",
  },

  /**
   * Self-hosted latin/latin-ext subsets only (~164 KB total). Plex Sans is
   * a single variable file (wght 100-700); Plex Mono ships 400/600/700.
   */
  webfonts: [
    {
      family: "IBM Plex Mono",
      file: "IBMPlexMono-Regular.woff2",
      weight: "400",
      preload: true,
      unicodeRange: LATIN,
    },
    {
      family: "IBM Plex Mono",
      file: "IBMPlexMono-Regular-LatinExt.woff2",
      weight: "400",
      unicodeRange: LATIN_EXT,
    },
    {
      family: "IBM Plex Mono",
      file: "IBMPlexMono-SemiBold.woff2",
      weight: "600",
      unicodeRange: LATIN,
    },
    {
      family: "IBM Plex Mono",
      file: "IBMPlexMono-SemiBold-LatinExt.woff2",
      weight: "600",
      unicodeRange: LATIN_EXT,
    },
    {
      family: "IBM Plex Mono",
      file: "IBMPlexMono-Bold.woff2",
      weight: "700",
      unicodeRange: LATIN,
    },
    {
      family: "IBM Plex Mono",
      file: "IBMPlexMono-Bold-LatinExt.woff2",
      weight: "700",
      unicodeRange: LATIN_EXT,
    },
    {
      family: "IBM Plex Sans",
      file: "IBMPlexSans-Variable.woff2",
      weight: "100 700",
      preload: true,
      unicodeRange: LATIN,
    },
    {
      family: "IBM Plex Sans",
      file: "IBMPlexSans-Variable-LatinExt.woff2",
      weight: "100 700",
      unicodeRange: LATIN_EXT,
    },
  ],
};
