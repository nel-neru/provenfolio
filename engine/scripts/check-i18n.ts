/**
 * Bilingual-docs guard + stray-Japanese lint. Two rules, CI-enforced:
 *
 * 1. Every user-facing doc ships as an EN+JA pair. The translation file
 *    carries a marker recording the sha256 of the canonical file; editing
 *    the canonical without re-translating breaks the marker and fails CI.
 *    Canonical side: README is authored in Japanese (marketing copy);
 *    engine/docs are authored in English.
 * 2. Japanese text may appear ONLY in *.ja.md and the i18n dictionaries
 *    (site i18n.ts, studio i18n.js, the ja lint wordlist, translator
 *    example). Everything else — code, comments, CLI output, CHANGELOG,
 *    commit-adjacent files — is English-only.
 *
 * Usage:
 *   tsx engine/scripts/check-i18n.ts            # check (CI mode)
 *   tsx engine/scripts/check-i18n.ts --stamp    # refresh markers after
 *                                               # updating translations
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { ROOT } from "./lib/paths.js";

const DOC_PAIRS: Array<{ canonical: string; translation: string }> = [
  // marketing copy is authored in Japanese; README.md is the translation
  { canonical: "README.ja.md", translation: "README.md" },
  ...[
    "GETTING-STARTED",
    "UPDATING",
    "CUSTOMIZING",
    "DATA-CONTRACT",
    "EXTENDING-SOURCES",
    "PIPELINE",
  ].map((n) => ({
    canonical: `engine/docs/${n}.md`,
    translation: `engine/docs/${n}.ja.md`,
  })),
];

/** Files allowed to contain Japanese (legitimate i18n content). */
const JAPANESE_ALLOWLIST: RegExp[] = [
  // instance CONTENT is whatever language the owner writes in — never lint it
  // (instance repos track data/ and run this same CI)
  /^data\//,
  /\.ja\.md$/,
  /^site\/src\/lib\/i18n\.ts$/,
  /^studio\/public\/i18n\.js$/,
  /^engine\/scripts\/lib\/lints\.ts$/,
  // agent instructions are English, but these two carry illustrative Japanese
  // examples (politeness formulas / banned-puffery phrases)
  /^\.claude\/agents\/(translator|case-study-writer)\.md$/,
];

/** The standard cross-language link line ("> [ja-version]: ...") is exempt. */
const LANGUAGE_LINK_RE = /^>\s*\u65e5\u672c\u8a9e\u7248:/;

/** Hiragana, katakana, CJK ideographs (escaped so this linter passes itself). */
const JAPANESE_RE = /[\u3040-\u30ff\u4e00-\u9fff]/;
const SCAN_EXTENSIONS = new Set([
  ".ts", ".js", ".mjs", ".cjs", ".astro", ".html", ".md", ".json", ".yml", ".yaml",
]);
const MARKER_RE = /<!--\s*i18n:source=(\S+)\s+sha256=([0-9a-f]{64})\s*-->/;

const stamp = process.argv.includes("--stamp");
const errors: string[] = [];

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function canonicalHash(rel: string): string {
  const normalized = read(rel).replace(/\r\n/g, "\n");
  return crypto.createHash("sha256").update(normalized, "utf8").digest("hex");
}

// --- rule 1: doc pairs in sync -------------------------------------------
for (const pair of DOC_PAIRS) {
  const canonicalExists = fs.existsSync(path.join(ROOT, pair.canonical));
  const translationExists = fs.existsSync(path.join(ROOT, pair.translation));
  if (!canonicalExists) {
    errors.push(`${pair.canonical}: canonical file missing`);
    continue;
  }
  if (!translationExists) {
    errors.push(`${pair.translation}: translation missing (canonical: ${pair.canonical})`);
    continue;
  }

  const hash = canonicalHash(pair.canonical);
  const marker = `<!-- i18n:source=${pair.canonical} sha256=${hash} -->`;
  const content = read(pair.translation);
  const found = content.match(MARKER_RE);

  if (stamp) {
    const next = found
      ? content.replace(MARKER_RE, marker)
      : `${content.replace(/\n*$/, "\n")}\n${marker}\n`;
    if (next !== content) {
      fs.writeFileSync(path.join(ROOT, pair.translation), next, "utf8");
      console.log(`stamped: ${pair.translation}`);
    }
    continue;
  }

  if (!found) {
    errors.push(
      `${pair.translation}: no i18n marker — run \`npm run check:i18n -- --stamp\` after translating`
    );
  } else if (found[1] !== pair.canonical) {
    errors.push(`${pair.translation}: marker points at ${found[1]}, expected ${pair.canonical}`);
  } else if (found[2] !== hash) {
    errors.push(
      `${pair.translation}: out of date — ${pair.canonical} changed since last translation. ` +
        "Update the translation, then run `npm run check:i18n -- --stamp`."
    );
  }
}

// --- rule 2: no stray Japanese outside the allowlist ----------------------
// tracked + untracked-but-not-ignored, so new files are caught BEFORE commit
const tracked = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }
)
  .split("\n")
  .filter(Boolean);

for (const rel of tracked) {
  if (!SCAN_EXTENSIONS.has(path.extname(rel))) continue;
  if (JAPANESE_ALLOWLIST.some((re) => re.test(rel))) continue;
  const lines = read(rel).split("\n");
  const hits: number[] = [];
  lines.forEach((line, i) => {
    if (JAPANESE_RE.test(line) && !LANGUAGE_LINK_RE.test(line)) hits.push(i + 1);
  });
  if (hits.length > 0) {
    errors.push(
      `${rel}: Japanese text outside i18n files (lines ${hits.slice(0, 5).join(", ")}${hits.length > 5 ? ", …" : ""}) — move it to a dictionary/translation file or write it in English`
    );
  }
}

// --- report ----------------------------------------------------------------
if (errors.length > 0) {
  for (const e of errors) console.error(`✗ ${e}`);
  process.exit(1);
}
console.log(
  stamp
    ? `✓ markers stamped for ${DOC_PAIRS.length} doc pair(s)`
    : `✓ i18n contract holds (${DOC_PAIRS.length} doc pairs in sync, no stray Japanese in ${tracked.length} tracked files)`
);
