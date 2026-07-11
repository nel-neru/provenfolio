/**
 * Convert raw stats (workspace/<id>/stats.json) into the contract's
 * projectMetrics block. Used by emit and refresh — the ONLY code path that
 * produces metrics, so numbers can never originate anywhere else.
 */
import type { RawStats, ProjectMetrics } from "../../schemas/index.js";

/** Map file extensions to display languages for the offline fallback. */
const EXT_LANGUAGES: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  rs: "Rust",
  py: "Python",
  go: "Go",
  java: "Java",
  kt: "Kotlin",
  swift: "Swift",
  c: "C",
  h: "C",
  cpp: "C++",
  hpp: "C++",
  cs: "C#",
  rb: "Ruby",
  php: "PHP",
  svelte: "Svelte",
  vue: "Vue",
  astro: "Astro",
  css: "CSS",
  scss: "SCSS",
  html: "HTML",
  sh: "Shell",
  ps1: "PowerShell",
  sql: "SQL",
  zig: "Zig",
  lua: "Lua",
  dart: "Dart",
  ex: "Elixir",
  exs: "Elixir",
};

export function toProjectMetrics(stats: RawStats): ProjectMetrics {
  const total = stats.git.total;

  const conventionalCount = Object.values(total.commitTypes ?? {}).reduce(
    (a, b) => a + b,
    0
  );

  // Prefer GitHub linguist bytes; fall back to file-count-by-extension.
  const languages =
    stats.github?.languages && stats.github.languages.length > 0
      ? stats.github.languages
      : extensionFallback(stats.filesByExtension);

  const ownerDiffers =
    stats.git.byOwner.commits !== total.commits && stats.git.byOwner.commits > 0;

  return {
    total,
    byOwner: ownerDiffers ? stats.git.byOwner : undefined,
    ownerCommitPct: stats.git.ownerCommitPct,
    languages,
    prCount: stats.github?.prCount,
    releaseCount: stats.github?.releaseCount,
    stars: stats.github?.stars,
    forks: stats.github?.forks,
    contributorCount: stats.github?.contributorCount,
    conventionalCommitPct:
      total.commits === 0
        ? undefined
        : Math.round((conventionalCount / total.commits) * 1000) / 10,
  };
}

function extensionFallback(
  filesByExtension: Record<string, number>
): ProjectMetrics["languages"] {
  const counts = new Map<string, number>();
  for (const [ext, n] of Object.entries(filesByExtension)) {
    const lang = EXT_LANGUAGES[ext];
    if (lang) counts.set(lang, (counts.get(lang) ?? 0) + n);
  }
  const totalFiles = [...counts.values()].reduce((a, b) => a + b, 0);
  return [...counts.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([name, n]) => ({
      name,
      pct: totalFiles === 0 ? 0 : Math.round((n / totalFiles) * 1000) / 10,
    }));
}
