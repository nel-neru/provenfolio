/**
 * The self-updating loop — "the portfolio that commits when you do."
 * Deterministically re-runs fetch/extract/emit for every github-sourced
 * project: metrics, heatmaps, language mixes update with ZERO AI cost.
 * Prose is never touched; when source drift exceeds thresholds the project
 * is flagged stale so Studio/`/refresh` can offer a re-enrich.
 *
 * Usage: npm run refresh   (also run by .github/workflows/refresh.yml)
 */
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import {
  projectSchema,
  rawStatsSchema,
  type Project,
} from "../schemas/index.js";
import { ROOT, PROJECTS_DIR, projectWorkspace } from "./lib/paths.js";
import { readJson, listJsonFiles, parseWith } from "./lib/io.js";
import fs from "node:fs";

/** Prose is considered stale when the source moved this much since analysis. */
const STALE_COMMITS = 30;
const STALE_DAYS = 60;

// tsx's exports map hides its CLI entry — resolve it via package.json + bin.
const require = createRequire(import.meta.url);
const tsxPkgPath = require.resolve("tsx/package.json", { paths: [ROOT] });
const tsxPkg = JSON.parse(fs.readFileSync(tsxPkgPath, "utf8")) as {
  bin: string | { tsx: string };
};
const tsxBin = typeof tsxPkg.bin === "string" ? tsxPkg.bin : tsxPkg.bin.tsx;
const tsxCli = path.join(path.dirname(tsxPkgPath), tsxBin);

function runScript(script: string, args: string[]): string {
  return execFileSync(process.execPath, [tsxCli, path.join(ROOT, script), ...args], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  });
}

const projects: Project[] = listJsonFiles(PROJECTS_DIR).map((f) =>
  parseWith(projectSchema, readJson(f), f)
);

let refreshed = 0;
let staled = 0;
let failed = 0;

for (const project of projects) {
  const gh = project.sources.find((s) => s.type === "github" && s.repoUrl);
  if (!gh?.repoUrl) continue;

  try {
    runScript("engine/sources/github/clone-repo.ts", [gh.repoUrl]);
    runScript("engine/sources/github/extract-git-stats.ts", [project.id]);
    runScript("engine/sources/github/fetch-github-meta.ts", [project.id, gh.repoUrl]);

    // drift detection: commits added / time passed since last enrich
    const statsPath = path.join(projectWorkspace(project.id), "stats.json");
    const stats = parseWith(rawStatsSchema, readJson(statsPath), statsPath);
    const commitDrift =
      stats.git.total.commits - (project.metrics?.total.commits ?? 0);
    const analyzedAt = Date.parse(project.generated.analyzedAt);
    const daysSinceAnalysis = (Date.now() - analyzedAt) / 86_400_000;
    const headMoved = stats.repo.headCommit !== gh.sourceCommit;
    const isStale =
      headMoved && (commitDrift >= STALE_COMMITS || daysSinceAnalysis >= STALE_DAYS);

    runScript(
      "engine/scripts/emit.ts",
      [project.id, "--metrics-only", ...(isStale ? ["--mark-stale"] : [])]
    );
    refreshed += 1;
    if (isStale) staled += 1;
    console.log(
      `✓ ${project.id}: refreshed (+${Math.max(0, commitDrift)} commits since analysis${isStale ? " — PROSE STALE, run /analyze --refresh " + project.id : ""})`
    );
  } catch (e) {
    failed += 1;
    console.error(`✗ ${project.id}: refresh failed — ${e instanceof Error ? e.message.split("\n")[0] : e}`);
  }
}

if (fs.existsSync(PROJECTS_DIR)) {
  console.log(
    `\nrefresh: ${refreshed}/${projects.length} project(s) refreshed` +
      (failed > 0 ? `, ${failed} failed` : "") +
      (staled > 0 ? `, ${staled} flagged stale (re-enrich recommended)` : "")
  );
}

// Per-project failures are logged and skipped above so one broken repo never
// blocks the rest, but the run as a whole must still fail (e.g. weekly CI).
if (failed > 0) {
  process.exitCode = 1;
}
