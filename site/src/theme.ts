/**
 * Active-theme access for non-Vite consumers (OG exporter, Studio) — both
 * run under tsx, so this module resolves the theme at import time from
 * site/theme.config.mjs. Site code must NOT import this file: inside Astro
 * use the `@theme` alias (e.g. `import { theme } from "@theme/tokens"`),
 * which the Vite config points at the same active theme directory.
 *
 * To change the look, edit your theme under src/themes/ and select it in
 * theme.config.mjs — never this shim.
 */
import { activeTheme } from "../theme.config.mjs";
import { cssVarsFor, fontFacesFor } from "./lib/theme-css.js";
import type { ThemeTokens } from "./lib/theme-types.js";

const mod = (await import(`./themes/${activeTheme}/tokens.ts`)) as {
  theme: ThemeTokens;
};

export const theme: ThemeTokens = mod.theme;
export type Theme = ThemeTokens;
export type { ThemeTokens, ThemeWebfont } from "./lib/theme-types.js";

/** Inject tokens as CSS custom properties (Studio /theme.css route). */
export function themeCssVars(): string {
  return cssVarsFor(theme);
}

/** Render the active theme's @font-face blocks. */
export function themeFontFaces(baseUrl = "/fonts"): string {
  return fontFacesFor(theme, baseUrl);
}
