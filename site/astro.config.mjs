// @ts-check
import { defineConfig } from "astro/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Locales come from the owner's profile — the engine never hardcodes them.
 * sourceLang is the default locale served at "/", targets at "/<lang>/".
 */
const profile = JSON.parse(
  readFileSync(fileURLToPath(new URL("../data/profile.json", import.meta.url)), "utf8")
);

export default defineConfig({
  site: profile.siteUrl ?? "https://example.pages.dev",
  i18n: {
    defaultLocale: profile.sourceLang,
    locales: [profile.sourceLang, ...profile.targetLangs],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  vite: {
    server: {
      fs: {
        // allow importing engine schemas and data/ from outside site/
        allow: [".."],
      },
    },
  },
});
