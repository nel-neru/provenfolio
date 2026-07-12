/**
 * Token → CSS emission, shared by the Base layout (Vite) and the Studio
 * /theme.css route (tsx). Pure functions over ThemeTokens; no Astro/Vite
 * APIs here.
 */
import type { ThemeTokens } from "./theme-types.js";

const REQUIRED_KEYS = [
  "accent",
  "accentSoft",
  "bg",
  "bgRaised",
  "bgOverlay",
  "line",
  "text",
  "textDim",
  "textFaint",
  "ok",
  "warn",
  "fontSans",
  "fontMono",
  "radius",
  "radiusSmall",
  "maxWidth",
] as const;

/**
 * Loud build-time guard: tsc only sees tokens.ts files that carry the
 * ThemeTokens annotation, so a malformed theme could otherwise ship
 * "--text-faint: undefined" silently. Every emission path goes through
 * cssVarsFor, which makes this the universal chokepoint.
 */
export function assertThemeTokens(t: ThemeTokens): void {
  const missing = REQUIRED_KEYS.filter(
    (k) => typeof t[k] !== "string" || t[k].trim() === ""
  );
  if (!Array.isArray(t.viz) || t.viz.length !== 5) {
    missing.push("viz" as (typeof REQUIRED_KEYS)[number]);
  }
  if (missing.length > 0) {
    throw new Error(
      `Theme tokens invalid — missing/empty required key(s): ${missing.join(", ")} (see site/src/lib/theme-types.ts)`
    );
  }
}

/** Render tokens as CSS custom property declarations (no selector). */
export function cssVarsFor(t: ThemeTokens): string {
  assertThemeTokens(t);
  const lines = [
    `--accent: ${t.accent};`,
    `--accent-soft: ${t.accentSoft};`,
    `--bg: ${t.bg};`,
    `--bg-raised: ${t.bgRaised};`,
    `--bg-overlay: ${t.bgOverlay};`,
    `--line: ${t.line};`,
    `--text: ${t.text};`,
    `--text-dim: ${t.textDim};`,
    `--text-faint: ${t.textFaint};`,
    `--ok: ${t.ok};`,
    `--warn: ${t.warn};`,
    `--viz-0: ${t.viz[0]};`,
    `--viz-1: ${t.viz[1]};`,
    `--viz-2: ${t.viz[2]};`,
    `--viz-3: ${t.viz[3]};`,
    `--viz-4: ${t.viz[4]};`,
    `--font-sans: ${t.fontSans};`,
    `--font-mono: ${t.fontMono};`,
    `--radius: ${t.radius};`,
    `--radius-sm: ${t.radiusSmall};`,
    `--max-w: ${t.maxWidth};`,
  ];

  if (t.error) lines.push(`--error: ${t.error};`);
  if (t.fontDisplay) lines.push(`--font-display: ${t.fontDisplay};`);
  if (t.colorScheme) lines.push(`--color-scheme: ${t.colorScheme};`);
  t.space?.forEach((v, i) => lines.push(`--space-${i + 1}: ${v};`));
  for (const [k, v] of Object.entries(t.fontSize ?? {})) {
    lines.push(`--text-${k}: ${v};`);
  }
  for (const [k, v] of Object.entries(t.shadow ?? {})) {
    lines.push(`--shadow-${k}: ${v};`);
  }
  if (t.showcase?.accent2) lines.push(`--show-accent2: ${t.showcase.accent2};`);
  if (t.showcase?.heroScale) {
    lines.push(`--show-hero-scale: ${t.showcase.heroScale};`);
  }

  return lines.join("\n");
}

/** Render the theme's webfonts as @font-face blocks. */
export function fontFacesFor(t: ThemeTokens, baseUrl = "/fonts"): string {
  return (t.webfonts ?? [])
    .map((f) => {
      const range = f.unicodeRange ? `\n  unicode-range: ${f.unicodeRange};` : "";
      return `@font-face {
  font-family: '${f.family}';
  src: url('${baseUrl}/${f.file}') format('woff2');
  font-weight: ${f.weight ?? "400"};
  font-style: ${f.style ?? "normal"};
  font-display: ${f.display ?? "swap"};${range}
}`;
    })
    .join("\n");
}
