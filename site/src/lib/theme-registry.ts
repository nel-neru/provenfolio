/**
 * Multi-theme registry — Vite-only (import.meta.glob). Powers the visitor
 * theme switcher and the /t/<theme>/ prerendered trees: every installed
 * theme's manifest is discoverable and loaded lazily.
 *
 * CSS scoping: theme manifests must NOT side-effect-import styles.css.
 * Astro bundles every stylesheet reachable through the dynamic-import
 * graph into each page that imports this registry — i.e. ALL themes' CSS
 * on ALL pages, with alphabetically-later themes winning the cascade.
 * Instead, each theme's styles.css is emitted as a standalone asset via
 * the `?url` glob below, and the page shell links exactly one of them per
 * page (see themeStylesheetHref).
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

// `?url` makes Vite emit each stylesheet as an independent asset and hand
// back its final URL — the CSS is never injected into a page's bundled
// styles, even with `eager: true` (eager only resolves URLs at build time).
const stylesheetUrls = import.meta.glob<string>("../themes/*/styles.css", {
  query: "?url",
  import: "default",
  eager: true,
});

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

/**
 * Build-time asset URL of a theme's styles.css. The page shell must link
 * exactly one of these per page — the page's own theme — which is what
 * keeps theme CSS scoped per page (theme CSS must come after global.css
 * in the head so it wins the cascade).
 */
export function themeStylesheetHref(name: string): string {
  const href = stylesheetUrls[`../themes/${name}/styles.css`];
  if (!href) {
    throw new Error(
      `Theme "${name}" has no styles.css — installed: ${listInstalledThemes().join(
        ", "
      )}`
    );
  }
  return href;
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
