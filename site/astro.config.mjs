// @ts-check
import { defineConfig } from "astro/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { activeTheme } from "./theme.config.mjs";

/**
 * Locales come from the owner's profile — the engine never hardcodes them.
 * sourceLang is the default locale served at "/", targets at "/<lang>/".
 */
const profile = JSON.parse(
  readFileSync(fileURLToPath(new URL("../data/profile.json", import.meta.url)), "utf8")
);

/**
 * "@theme" resolves to the active theme package (theme.config.mjs). All
 * site code imports theme files through this alias so switching themes is
 * a one-line config change; the static imports keep Astro's CSS collection
 * intact (a dynamic-import resolver would not).
 */
const themeDir = fileURLToPath(
  new URL(`./src/themes/${activeTheme}`, import.meta.url)
);

export default defineConfig({
  site: profile.siteUrl ?? "https://example.pages.dev",
  i18n: {
    defaultLocale: profile.sourceLang,
    locales: [...new Set([profile.sourceLang, ...profile.targetLangs])],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    resolve: {
      alias: { "@theme": themeDir },
    },
    server: {
      fs: {
        // allow importing engine schemas and data/ from outside site/
        allow: [".."],
      },
    },
  },
});
