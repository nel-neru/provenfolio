/**
 * The ONLY code path that writes data/projects/<id>.json (golden rule #4/#7).
 * Composes: stats.json (metrics — re-injected unconditionally) + intake
 * (owner facts) + prose.json (agent narrative) + existing file (human edits
 * protected via contentHashes), then lints, validates, upserts the manifest,
 * recomputes aggregates and completeness.
 *
 * Usage:
 *   tsx engine/scripts/emit.ts <projectId>                # full emit after enrich
 *   tsx engine/scripts/emit.ts <projectId> --metrics-only # refresh loop (no AI)
 *   tsx engine/scripts/emit.ts <projectId> --metrics-only --mark-stale
 *                                                         # + flag prose as stale
 *   tsx engine/scripts/emit.ts <projectId> --manual       # manual-source project
 *
 * Human-edit flags (see engine/scripts/lib/preserve.ts):
 *   --accept-regenerated <fieldPath|all>  # drop the owner's edit for that
 *                                         # field (repeatable) and rebaseline
 *                                         # to the regenerated text
 *   --keep-orphaned-edits                 # append human-edited entries that
 *                                         # no longer match the regenerated
 *                                         # draft instead of aborting
 *   --drop-orphaned-edits                 # discard such entries explicitly
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  SCHEMA_VERSION,
  projectSchema,
  proseSchema,
  intakeSchema,
  profileSchema,
  rawStatsSchema,
  manifestSchema,
  aggregatesSchema,
  type Project,
  type Prose,
  type Intake,
  type EvidenceRef,
  type ProjectCategory,
  type ProjectPlacement,
} from "../schemas/index.js";
import {
  ROOT,
  DATA_DIR,
  PROFILE_FILE,
  MANIFEST_FILE,
  AGGREGATES_FILE,
  PROJECTS_DIR,
  projectFile,
  intakeFile,
  projectWorkspace,
} from "./lib/paths.js";
import { readJson, writeJson, listJsonFiles, parseWith } from "./lib/io.js";
import { proseFieldPaths } from "./lib/hash.js";
import {
  preserveHumanEdits,
  keepOrphanedEntries,
  buildContentHashes,
} from "./lib/preserve.js";
import { evidenceFileProblem } from "./lib/evidence.js";
import { applyTechStackCorrections } from "./lib/tech-stack.js";
import { buildAllowedNumbers, lintNumbers, lintBannedPhrases } from "./lib/lints.js";
import { computeCompleteness } from "./lib/completeness.js";
import { computeAggregates } from "./lib/aggregate-lib.js";
import { toProjectMetrics } from "../sources/github/to-metrics.js";
import { parseRepoUrl } from "../sources/github/lib.js";

const ENGINE_VERSION = (readJson(path.join(ROOT, "package.json")) as {
  version: string;
}).version;

const projectId = process.argv[2];
const metricsOnly = process.argv.includes("--metrics-only");
const manual = process.argv.includes("--manual");
const keepOrphanedEdits = process.argv.includes("--keep-orphaned-edits");
const dropOrphanedEdits = process.argv.includes("--drop-orphaned-edits");
const acceptRegenerated = new Set<string>();
let acceptAllRegenerated = false;
for (let i = 3; i < process.argv.length; i += 1) {
  if (process.argv[i] !== "--accept-regenerated") continue;
  const value = process.argv[i + 1];
  if (!value || value.startsWith("--")) {
    console.error('--accept-regenerated requires a field path or "all"');
    process.exit(2);
  }
  if (value === "all") acceptAllRegenerated = true;
  else acceptRegenerated.add(value);
  i += 1;
}
if (!projectId) {
  console.error("usage: emit.ts <projectId> [--metrics-only|--manual]");
  process.exit(2);
}
if (keepOrphanedEdits && dropOrphanedEdits) {
  console.error("--keep-orphaned-edits and --drop-orphaned-edits are mutually exclusive");
  process.exit(2);
}

const now = new Date().toISOString();
const profile = parseWith(profileSchema, readJson(PROFILE_FILE), PROFILE_FILE);
const sl = profile.sourceLang;

// ---- inputs ----
const statsPath = path.join(projectWorkspace(projectId), "stats.json");
const prosePath = path.join(projectWorkspace(projectId), "prose.json");
const stats = fs.existsSync(statsPath)
  ? parseWith(rawStatsSchema, readJson(statsPath), statsPath)
  : undefined;
const intake: Intake | undefined = fs.existsSync(intakeFile(projectId))
  ? parseWith(intakeSchema, readJson(intakeFile(projectId)), intakeFile(projectId))
  : undefined;
const existing: Project | undefined = fs.existsSync(projectFile(projectId))
  ? parseWith(projectSchema, readJson(projectFile(projectId)), projectFile(projectId))
  : undefined;

if (!manual && !stats) {
  console.error(`No stats at ${statsPath} — run the github adapter first (or use --manual)`);
  process.exit(1);
}
if (metricsOnly && !existing) {
  console.error(`--metrics-only requires an existing data/projects/${projectId}.json`);
  process.exit(1);
}

// ---- metrics-only refresh: update numbers, never touch prose ----
if (metricsOnly && existing && stats) {
  const markStale = process.argv.includes("--mark-stale");
  const refreshed: Project = {
    ...existing,
    metrics: toProjectMetrics(stats),
    sources: existing.sources.map((s) =>
      s.type === "github" ? { ...s, sourceCommit: stats.repo.headCommit } : s
    ),
    generated: {
      ...existing.generated,
      lastRefreshedAt: now,
      staleSince: markStale
        ? (existing.generated.staleSince ?? now)
        : existing.generated.staleSince,
    },
  };
  finalize(refreshed);
  console.log(
    `✓ ${projectId}: metrics refreshed (prose untouched${markStale ? "; marked stale" : ""})`
  );
  process.exit(0);
}

// ---- full emit ----
const prose: Prose = parseWith(proseSchema, readJson(prosePath), prosePath);

const PLACEMENT_DEFAULT: Record<ProjectCategory, ProjectPlacement> = {
  product: "products",
  service: "products",
  client: "products",
  oss: "lab",
  hobby: "lab",
  learning: "archive",
};

const category = intake?.category ?? existing?.category;
if (!category) {
  console.error(
    `No category for ${projectId} — set it in data/intake/${projectId}.json (Studio or interview) before emitting`
  );
  process.exit(1);
}

const repoName = stats?.repo.url ? safeRepoName(stats.repo.url) : undefined;
const name = intake?.displayName ?? existing?.name ?? repoName ?? projectId;

const sources: Project["sources"] = stats
  ? [
      {
        type: "github",
        repoUrl: stats.repo.url.replace(/\.git$/, ""),
        sourceCommit: stats.repo.headCommit,
        defaultBranch: stats.repo.defaultBranch || undefined,
        visibility:
          intake?.visibilityOverride ??
          (stats.github?.isPrivate ? "private" : "public"),
        isFork: stats.github?.isFork ?? false,
      },
    ]
  : [
      {
        type: intake?.sourceType === "local" ? "local" : "manual",
        visibility: intake?.visibilityOverride ?? "public",
        isFork: false,
      },
    ];

// tech stack: analyzer proposal, corrected by the owner
const techStack = applyTechStackCorrections(
  prose.techStack,
  intake?.techStackCorrections
);

// links: owner intake first, analyzer-found second, dedupe by URL
const links = [...(intake?.links ?? [])];
for (const l of prose.links) {
  if (!links.some((x) => x.url === l.url)) links.push(l);
}
if (stats?.github?.homepage && !links.some((l) => l.url === stats.github!.homepage)) {
  const url = stats.github.homepage;
  if (/^https?:\/\//.test(url)) {
    // Locale → label map for the auto-added homepage link. check:i18n keeps
    // engine source English-only, so only English labels can live here;
    // locales without an entry fall back to the "en" value. Owners who want
    // a localized label add the link in intake, which wins the dedupe above.
    const websiteLabelEn = "Website";
    const knownLabels: Record<string, string> = { en: websiteLabelEn };
    const label: Record<string, string> = {};
    for (const locale of [sl, ...profile.targetLangs]) {
      label[locale] = knownLabels[locale] ?? websiteLabelEn;
    }
    links.push({ label, url, kind: "demo" });
  }
}

const candidate: Omit<Project, "completeness" | "generated"> = {
  schemaVersion: SCHEMA_VERSION,
  id: projectId,
  name,
  category,
  status: intake?.status ?? existing?.status ?? "active",
  featured: existing?.featured ?? false,
  placement: existing?.placement ?? PLACEMENT_DEFAULT[category],
  order: existing?.order ?? 0,
  sources,
  role: intake?.role
    ? {
        type: intake.role.type,
        scope: intake.role.scope ? { [sl]: intake.role.scope } : undefined,
      }
    : existing?.role,
  summary: prose.summary,
  caseStudy: prose.caseStudy,
  highlights: prose.highlights,
  techStack,
  metrics: stats ? toProjectMetrics(stats) : undefined,
  timeline: prose.timeline,
  links,
  screenshots: existing?.screenshots ?? [],
  architectureDiagram: existing?.architectureDiagram ?? maybeDiagram(),
};

// ---- human-edit protection ----
// contentHashes records the hash of the last AGENT-generated text per field
// (the baseline). A field whose current value differs from its baseline was
// edited by the owner: keep the owner's text, discard the regenerated one,
// and carry the baseline forward so the protection survives every future
// re-analysis. Entries are matched by stable evidence-derived keys, never by
// array index (see lib/preserve.ts).
let preservedPaths: string[] = [];
let baselineHashes: Record<string, string> = {};
if (existing && Object.keys(existing.generated.contentHashes).length > 0) {
  const protection = preserveHumanEdits({
    existing,
    candidate,
    contentHashes: existing.generated.contentHashes,
    sourceLang: sl,
    acceptRegenerated,
    acceptAllRegenerated,
  });
  preservedPaths = protection.preservedPaths;
  baselineHashes = protection.baselineHashes;
  if (protection.usedLegacyKeys) {
    console.error(
      "note: legacy index-based contentHashes detected — rewriting them in the stable-key format"
    );
  }
  if (protection.orphanedEdits.length > 0) {
    const previewText = (s: string) =>
      s.length > 60 ? `${s.slice(0, 57)}...` : s;
    if (keepOrphanedEdits) {
      Object.assign(
        baselineHashes,
        keepOrphanedEntries({
          existing,
          candidate,
          orphanedEdits: protection.orphanedEdits,
        })
      );
      preservedPaths.push(...protection.orphanedEdits.map((o) => o.path));
      console.error(
        `note: ${protection.orphanedEdits.length} orphaned human edit(s) re-appended to the draft (--keep-orphaned-edits)`
      );
    } else if (dropOrphanedEdits) {
      for (const o of protection.orphanedEdits) {
        console.error(
          `note: discarding human-edited ${o.path} (--drop-orphaned-edits): "${previewText(o.value)}"`
        );
      }
    } else {
      console.error(
        "✗ human-edited prose no longer matches any entry in the regenerated draft:"
      );
      for (const o of protection.orphanedEdits) {
        console.error(`  - ${o.path}: "${previewText(o.value)}"`);
      }
      console.error(
        "\nThese fields are human-owned and will not be merged or dropped silently. Either:\n" +
          "  (a) restore the matching entry (same evidence refs) in the workspace prose.json and re-run,\n" +
          "  (b) re-run with --keep-orphaned-edits to append the edited entries unchanged, or\n" +
          "  (c) re-run with --drop-orphaned-edits to discard these edits."
      );
      process.exit(1);
    }
  }
}

// ---- lints ----
const fields = proseFieldPaths(candidate);
const allowed = buildAllowedNumbers({
  metrics: candidate.metrics,
  intake,
  // the owner-corrected stack, not the raw analyzer proposal: owner-added
  // entries ("Vue 3") permit their version numbers, removed ones no longer do
  prose: { ...prose, techStack: candidate.techStack },
  projectName: name,
});
const lintErrors = [...lintNumbers(fields, allowed), ...lintBannedPhrases(fields)];

// ---- evidence verification (agents cannot fabricate receipts) ----
const repoDir = path.join(projectWorkspace(projectId), "repo");
const allEvidence: Array<[string, EvidenceRef]> = [
  ...candidate.highlights.flatMap((h, i) =>
    h.evidence.map((e): [string, EvidenceRef] => [`highlights[${i}]`, e])
  ),
  ...candidate.timeline.flatMap((t, i) =>
    t.evidence.map((e): [string, EvidenceRef] => [`timeline[${i}]`, e])
  ),
];
for (const [where, ev] of allEvidence) {
  const problem = verifyEvidence(ev);
  if (problem) lintErrors.push({ field: where, message: problem });
}

if (lintErrors.length > 0) {
  for (const e of lintErrors) console.error(`✗ ${e.field}: ${e.message}`);
  console.error(`\nemit: ${lintErrors.length} lint error(s) — fix workspace prose and re-run`);
  process.exit(1);
}

// ---- finalize ----
const project: Project = {
  ...candidate,
  completeness: computeCompleteness({ project: candidate, profile, intake }),
  generated: {
    engineVersion: ENGINE_VERSION,
    analyzedAt: now,
    // fresh hashes for agent-generated fields; carried-over agent baselines
    // for human-owned fields, so the mismatch (= protection) persists
    contentHashes: buildContentHashes(candidate, sl, baselineHashes),
    lastRefreshedAt: existing?.generated.lastRefreshedAt,
    metricsSnapshots: existing?.generated.metricsSnapshots,
  },
};
finalize(project);

// mark intake analyzed
if (intake) {
  writeJson(intakeFile(projectId), {
    ...intake,
    projectId,
    state: "analyzed",
    updatedAt: now,
  });
}

console.log(
  `✓ ${projectId}: emitted (completeness ${project.completeness?.score}/100` +
    (project.completeness?.missing.length
      ? `, missing: ${project.completeness.missing.join(", ")}`
      : "") +
    (preservedPaths.length > 0
      ? `; ${preservedPaths.length} human-edited field(s) preserved`
      : "") +
    `)`
);

// ---------------------------------------------------------------------------

function finalize(doc: Project): void {
  const valid = parseWith(projectSchema, doc, projectFile(projectId!));
  writeJson(projectFile(projectId!), valid);

  // manifest upsert (owner-controlled fields preserved)
  const manifest = parseWith(manifestSchema, readJson(MANIFEST_FILE), MANIFEST_FILE);
  const entry = manifest.projects.find((p) => p.id === valid.id);
  if (entry) {
    entry.placement = valid.placement;
  } else {
    manifest.projects.push({
      id: valid.id,
      featured: valid.featured,
      placement: valid.placement,
      order: valid.order,
    });
  }
  manifest.engineVersion = ENGINE_VERSION;
  manifest.lastUpdated = now;
  writeJson(MANIFEST_FILE, parseWith(manifestSchema, manifest, MANIFEST_FILE));

  // aggregates
  const projects = listJsonFiles(PROJECTS_DIR).map((f) =>
    parseWith(projectSchema, readJson(f), f)
  );
  writeJson(
    AGGREGATES_FILE,
    parseWith(aggregatesSchema, computeAggregates(projects, now), AGGREGATES_FILE)
  );
}

function safeRepoName(url: string): string | undefined {
  try {
    return parseRepoUrl(url).name;
  } catch {
    return undefined;
  }
}

function maybeDiagram(): string | undefined {
  // repo-analyzer may have produced an architecture SVG in the workspace;
  // adopt it into data/assets if present.
  const src = path.join(projectWorkspace(projectId!), "findings", "architecture.svg");
  if (!fs.existsSync(src)) return undefined;
  const relTarget = `assets/diagrams/${projectId}.svg`;
  const target = path.join(DATA_DIR, relTarget);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(src, target);
  return relTarget;
}

function verifyEvidence(ev: EvidenceRef): string | undefined {
  if (ev.kind === "commit") {
    if (!fs.existsSync(repoDir)) return undefined; // manual projects: skip
    try {
      execFileSync("git", ["cat-file", "-e", `${ev.ref}^{commit}`], {
        cwd: repoDir,
        stdio: "ignore",
        windowsHide: true,
      });
      return undefined;
    } catch {
      return `evidence commit ${ev.ref} does not exist in the repo`;
    }
  }
  if (ev.kind === "file") {
    if (!fs.existsSync(repoDir)) return undefined;
    return evidenceFileProblem(repoDir, ev.ref);
  }
  if (ev.kind === "pr") {
    if (!stats) return undefined; // manual projects: skip
    const num = Number(ev.ref.replace(/^#/, ""));
    const known = stats.github?.pullRequests?.map((p) => p.number);
    if (!known) {
      // fetch-github-meta fails soft, so a missing github block (or PR list)
      // means the metadata was never fetched — not that the PR is bogus.
      return (
        `evidence PR #${num} could not be verified because GitHub metadata ` +
        `is unavailable (offline or gh failure); re-run with network access ` +
        `or drop the PR evidence`
      );
    }
    // An empty list is ambiguous (no merged PRs vs. soft pulls-endpoint
    // failure), so keep skipping it rather than risk a misleading error.
    if (known.length === 0) return undefined;
    return known.includes(num)
      ? undefined
      : `evidence PR #${num} not found among merged PRs`;
  }
  if (ev.kind === "ownerInput") {
    return intake ? undefined : `ownerInput evidence "${ev.ref}" but no intake exists`;
  }
  return undefined; // release/url: not verifiable offline
}
