/**
 * Theme token contract. Every theme package (site/src/themes/<name>/)
 * exports a `theme: ThemeTokens` from its tokens.ts. Plain TypeScript —
 * this module is imported both by Vite (site) and by tsx (OG exporter,
 * Studio), so it must never touch Astro/Vite-specific APIs.
 *
 * Required keys are the stable consumer contract: the OG-image exporter
 * reads bg/bgRaised/line/accent/text/textDim/textFaint, and the 3D hero
 * reads the emitted --viz-1/--accent CSS vars. Optional keys are additive
 * extensions; CSS that consumes them must provide var() fallbacks.
 */

/** A self-hosted webfont file (served from site/public/fonts/). */
export interface ThemeWebfont {
  /** font-family name as referenced by fontSans/fontMono/fontDisplay. */
  family: string;
  /** File name inside public/fonts/, e.g. "InterVariable.woff2". */
  file: string;
  /** CSS font-weight value or range, e.g. "400" or "100 900". */
  weight?: string;
  style?: "normal" | "italic";
  /** Defaults to "swap". */
  display?: string;
  /** Emit a <link rel="preload"> for this file. */
  preload?: boolean;
  /** Optional subsetting range, e.g. "U+0000-00FF". */
  unicodeRange?: string;
}

export interface ThemeTokens {
  /** Single chromatic accent (links, receipts, data viz emphasis). */
  accent: string;
  accentSoft: string;

  /** Base surfaces, darkest/lightest first. */
  bg: string;
  bgRaised: string;
  bgOverlay: string;
  line: string;

  text: string;
  textDim: string;
  textFaint: string;

  /** Semantic. */
  ok: string;
  warn: string;
  /** Optional third semantic (Studio meters, destructive actions). */
  error?: string;

  /** Data-viz ramp (heatmap intensities, language bars), low → high. */
  viz: readonly [string, string, string, string, string];

  fontSans: string;
  fontMono: string;
  /** Display face for oversized headings; falls back to fontSans. */
  fontDisplay?: string;

  radius: string;
  radiusSmall: string;
  maxWidth: string;

  /** Hints form controls / scrollbars; emitted as --color-scheme. */
  colorScheme?: "dark" | "light";

  /** Spacing scale, emitted as --space-1..n (smallest first). */
  space?: readonly string[];

  /** Type scale, emitted as --text-<key>. */
  fontSize?: Partial<
    Record<"xs" | "sm" | "base" | "lg" | "xl" | "display", string>
  >;

  /** Elevation, emitted as --shadow-<key>. Omit for a flat theme. */
  shadow?: Partial<Record<"sm" | "md" | "lg", string>>;

  /** Showcase-surface extras (home/landing may go wilder than inner pages). */
  showcase?: {
    /** Secondary accent, emitted as --show-accent2. */
    accent2?: string;
    /** Hero type scale, emitted as --show-hero-scale. */
    heroScale?: string;
  };

  /** Self-hosted webfonts rendered as @font-face blocks. */
  webfonts?: readonly ThemeWebfont[];
}
