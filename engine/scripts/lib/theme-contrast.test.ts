/**
 * Theme contrast regression test — every installed theme's text roles must
 * clear WCAG AA (4.5:1) against every base surface, so future theme
 * additions or token color tweaks cannot ship unreadable text.
 *
 * Themes are discovered from site/src/themes/ and loaded via dynamic
 * import(pathToFileURL(...)) — tsx resolves the .ts files at runtime, and
 * a new theme directory is covered without editing this test.
 *
 * Measured minima when this test was written (worst surface per role,
 * across all seven shipped themes): text 11.17:1, textDim 5.67:1,
 * textFaint 4.51:1 — the asserted floor is the AA normal-text threshold.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "./paths.js";
import type { ThemeTokens } from "../../../site/src/lib/theme-types.js";

const THEMES_DIR = path.join(ROOT, "site", "src", "themes");

/** Engine-shipped themes — discovery must find at least these. */
const SHIPPED_THEMES = [
  "acid-lab",
  "data-forensic",
  "editorial-swiss",
  "kinetic-type",
  "midnight",
  "neo-brutalist",
  "quiet-luxury",
];

const SURFACES = ["bg", "bgRaised", "bgOverlay"] as const;
const ROLES = ["text", "textDim", "textFaint"] as const;

/** WCAG AA contrast threshold for normal-size text. */
const MIN_RATIO = 4.5;

/** WCAG 2.x sRGB channel linearization. */
function linearize(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  assert.match(
    hex,
    /^#[0-9a-f]{6}$/i,
    `expected a 6-digit hex color, got "${hex}"`
  );
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Every theme directory that ships a tokens.ts. */
function listThemes(): string[] {
  return readdirSync(THEMES_DIR, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(path.join(THEMES_DIR, entry.name, "tokens.ts"))
    )
    .map((entry) => entry.name)
    .sort();
}

async function loadTokens(name: string): Promise<ThemeTokens> {
  const url = pathToFileURL(path.join(THEMES_DIR, name, "tokens.ts")).href;
  const mod = (await import(url)) as { theme?: ThemeTokens };
  assert.ok(mod.theme, `${name}/tokens.ts must export "theme"`);
  return mod.theme;
}

test("theme discovery finds every engine-shipped theme", () => {
  const found = listThemes();
  for (const name of SHIPPED_THEMES) {
    assert.ok(
      found.includes(name),
      `shipped theme "${name}" not found in ${THEMES_DIR} (found: ${found.join(", ")})`
    );
  }
});

test("text roles clear WCAG AA on every base surface", async (t) => {
  for (const name of listThemes()) {
    await t.test(name, async () => {
      const tokens = await loadTokens(name);
      for (const role of ROLES) {
        for (const surface of SURFACES) {
          const ratio = contrastRatio(tokens[role], tokens[surface]);
          assert.ok(
            ratio >= MIN_RATIO,
            `${role} (${tokens[role]}) on ${surface} (${tokens[surface]}) ` +
              `is ${ratio.toFixed(2)}:1 — must be >= ${MIN_RATIO}:1`
          );
        }
      }
    });
  }
});

test("text hierarchy holds: text > textDim > textFaint contrast on bg", async (t) => {
  for (const name of listThemes()) {
    await t.test(name, async () => {
      const tokens = await loadTokens(name);
      const text = contrastRatio(tokens.text, tokens.bg);
      const dim = contrastRatio(tokens.textDim, tokens.bg);
      const faint = contrastRatio(tokens.textFaint, tokens.bg);
      assert.ok(
        text > dim,
        `text (${text.toFixed(2)}:1) must out-contrast textDim (${dim.toFixed(2)}:1)`
      );
      assert.ok(
        dim > faint,
        `textDim (${dim.toFixed(2)}:1) must out-contrast textFaint (${faint.toFixed(2)}:1)`
      );
    });
  }
});
