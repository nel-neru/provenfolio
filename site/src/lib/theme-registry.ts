/**
 * Multi-theme registry — Vite-only (import.meta.glob). Powers the visitor
 * theme switcher and the /t/<theme>/ prerendered trees: every installed
 * theme's manifest is discoverable, loaded lazily so each built page
 * carries only its own theme's CSS (dynamic-import CSS collection is
 * verified to work in this Astro version).
 *
 * Non-Vite consumers (OG exporter, Studio) must keep using the
 * site/src/theme.ts shim instead.
 */
import { activeTheme, visitorThemes } from "../../theme.config.mjs";
import type { ThemeTokens } from "./theme-types.js";

/** An Astro component factory (typed loosely to avoid astro internals). */
export type ThemeComponent = (...args: unknown[]) => unknown;

export interface ThemeManifest {
  name: string;
  tokens: ThemeTokens;
  components: {
    Header: ThemeComponent;
    Footer: ThemeComponent;
    HomePage: ThemeComponent;
    ProjectsPage: ThemeComponent;
    ProjectPage: ThemeComponent;
    AboutPage: ThemeComponent;
    HistoryPage: ThemeComponent;
    OverviewPage: ThemeComponent;
  };
}

const manifestLoaders = import.meta.glob<{ manifest: ThemeManifest }>(
  "../themes/*/manifest.ts"
);

function nameFromKey(key: string): string {
  return key.split("/")[2] ?? key;
}

/** Every theme directory that ships a manifest.ts. */
export function listInstalledThemes(): string[] {
  return Object.keys(manifestLoaders).map(nameFromKey).sort();
}

/**
 * Themes exposed to the visitor switcher (theme.config.mjs visitorThemes:
 * "all" or an explicit array; unknown names are dropped).
 */
export function listVisitorThemes(): string[] {
  const installed = listInstalledThemes();
  if (visitorThemes === "all") return installed;
  if (!Array.isArray(visitorThemes)) {
    throw new Error(
      `theme.config.mjs: visitorThemes must be "all" or an array of theme names, got ${JSON.stringify(
        visitorThemes
      )}`
    );
  }
  return (visitorThemes as string[]).filter((t) => installed.includes(t));
}

/**
 * Themes to prerender under /t/<theme>/. The active theme already lives at
 * the root URLs (the switcher links to "/" for it), so it is excluded here
 * to avoid building an orphan duplicate tree.
 */
export function listPrerenderThemes(): string[] {
  return listVisitorThemes().filter((t) => t !== activeTheme);
}

export async function getManifest(name: string): Promise<ThemeManifest> {
  const key = `../themes/${name}/manifest.ts`;
  const load = manifestLoaders[key];
  if (!load) {
    throw new Error(
      `Unknown theme "${name}" — installed: ${listInstalledThemes().join(", ")}`
    );
  }
  const mod = await load();
  return mod.manifest;
}

export { activeTheme };
