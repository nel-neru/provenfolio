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
import { hashProseFields, proseFieldPaths, sha256 } from "./lib/hash.js";
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
if (!projectId) {
  console.error("usage: emit.ts <projectId> [--metrics-only|--manual]");
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
let techStack = prose.techStack;
if (intake?.techStackCorrections) {
  const remove = new Set(
    intake.techStackCorrections.remove.map((s) => s.toLowerCase())
  );
  techStack = techStack.filter((t) => !remove.has(t.name.toLowerCase()));
  for (const add of intake.techStackCorrections.add) {
    if (!techStack.some((t) => t.name.toLowerCase() === add.toLowerCase())) {
      techStack.push({ name: add, category: "other" });
    }
  }
}

// links: owner intake first, analyzer-found second, dedupe by URL
const links = [...(intake?.links ?? [])];
for (const l of prose.links) {
  if (!links.some((x) => x.url === l.url)) links.push(l);
}
if (stats?.github?.homepage && !links.some((l) => l.url === stats.github!.homepage)) {
  const url = stats.github.homepage;
  if (/^https?:\/\//.test(url)) {
    links.push({ label: { [sl]: "Website" }, url, kind: "demo" });
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
// A prose field whose current value no longer matches its recorded hash was
// edited by the owner: keep the owner's text, discard the regenerated one.
let preserved = 0;
if (existing?.generated.contentHashes) {
  const oldFields = proseFieldPaths(existing);
  const hashes = existing.generated.contentHashes;
  const setByPath = (path: string, value: string) => {
    applyFieldPath(candidate, path, value);
  };
  for (const [fieldPath, oldValue] of Object.entries(oldFields)) {
    const recorded = hashes[fieldPath];
    if (recorded && sha256(oldValue) !== recorded) {
      setByPath(fieldPath, oldValue);
      preserved += 1;
    }
  }
}

// ---- lints ----
const fields = proseFieldPaths(candidate);
const allowed = buildAllowedNumbers({
  metrics: candidate.metrics,
  intake,
  prose,
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
    contentHashes: hashProseFields(candidate),
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
    (preserved > 0 ? `; ${preserved} human-edited field(s) preserved` : "") +
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
    const p = path.join(repoDir, ev.ref.replaceAll("/", path.sep));
    return fs.existsSync(p)
      ? undefined
      : `evidence file "${ev.ref}" does not exist in the repo`;
  }
  if (ev.kind === "pr") {
    const known = stats?.github?.pullRequests?.map((p) => p.number);
    if (!known || known.length === 0) return undefined;
    const num = Number(ev.ref.replace(/^#/, ""));
    return known.includes(num)
      ? undefined
      : `evidence PR #${num} not found among merged PRs`;
  }
  if (ev.kind === "ownerInput") {
    return intake ? undefined : `ownerInput evidence "${ev.ref}" but no intake exists`;
  }
  return undefined; // release/url: not verifiable offline
}

/** Set a localized field by flattened path like "highlights[2].text.ja". */
function applyFieldPath(
  doc: Omit<Project, "completeness" | "generated">,
  fieldPath: string,
  value: string
): void {
  const m = fieldPath.match(/^(.+)\.([a-z]{2}(?:-[A-Z]{2})?)$/);
  if (!m) return;
  const [, base, lang] = m;
  const target = resolveLocalized(doc, base!);
  if (target) target[lang!] = value;
}

function resolveLocalized(
  doc: Omit<Project, "completeness" | "generated">,
  base: string
): Record<string, string> | undefined {
  if (base === "summary") return doc.summary;
  if (base === "caseStudy.problem") return doc.caseStudy.problem;
  if (base === "caseStudy.solution") return doc.caseStudy.solution;
  if (base === "caseStudy.results") {
    if (!doc.caseStudy.results) doc.caseStudy.results = {};
    return doc.caseStudy.results;
  }
  const hl = base.match(/^highlights\[(\d+)\]\.text$/);
  if (hl) return doc.highlights[Number(hl[1])]?.text;
  const tlTitle = base.match(/^timeline\[(\d+)\]\.title$/);
  if (tlTitle) return doc.timeline[Number(tlTitle[1])]?.title;
  const tlDesc = base.match(/^timeline\[(\d+)\]\.description$/);
  if (tlDesc) return doc.timeline[Number(tlDesc[1])]?.description;
  return undefined;
}
