/**
 * Deterministic git-history extraction — the sole origin of every number the
 * site will ever show. No LLM involvement. Output: workspace/<id>/stats.json.
 *
 * Robustness notes (each guards a real failure mode):
 *  - %x1f field / %x1e record separators: commit subjects may contain "|" or
 *    any other printable character.
 *  - explicit maxBuffer in run(): default 1 MiB dies on a few thousand commits.
 *  - --no-merges: merge commits would double-count squash-merge cultures.
 *  - byOwner filtering against profile.identities: team repos and forks must
 *    never produce inflated personal metrics.
 *  - degenerate repos (0 or 1 commits) produce valid zeroed metrics.
 *
 * Usage: tsx engine/sources/github/extract-git-stats.ts <projectId>
 */
import fs from "node:fs";
import {
  rawStatsSchema,
  type GitMetrics,
  type RawStats,
} from "../../schemas/index.js";
import { PROFILE_FILE } from "../../scripts/lib/paths.js";
import { readJson, writeJson, parseWith } from "../../scripts/lib/io.js";
import { repoDir, statsFile, run } from "./lib.js";

const FIELD = "\x1f";
const RECORD = "\x1e";

interface Commit {
  sha: string;
  authorDate: string; // ISO 8601 with offset
  authorName: string;
  authorEmail: string;
  subject: string;
}

const CONVENTIONAL =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?!?:/;

function parseLog(raw: string): Commit[] {
  if (!raw.trim()) return [];
  return raw
    .split(RECORD)
    .map((r) => r.replace(/^\n/, ""))
    .filter((r) => r.length > 0)
    .map((record) => {
      const [sha, authorDate, authorName, authorEmail, subject = ""] =
        record.split(FIELD);
      if (!sha || !authorDate) throw new Error(`Malformed log record: ${record}`);
      return { sha, authorDate, authorName: authorName ?? "", authorEmail: authorEmail ?? "", subject };
    });
}

/** Calendar day in the author's own timezone (the human story, not UTC's). */
function dayOf(isoDate: string): string {
  return isoDate.slice(0, 10);
}

function computeMetrics(commits: Commit[]): GitMetrics {
  if (commits.length === 0) {
    return {
      commits: 0,
      activeDays: 0,
      durationDays: 0,
      velocity: { commitsPerActiveDay: 0 },
      commitsByDay: [],
    };
  }
  // git log is newest-first; normalize to oldest-first
  const ordered = [...commits].reverse();
  const first = ordered[0]!;
  const last = ordered[ordered.length - 1]!;

  const byDay = new Map<string, number>();
  const types = new Map<string, number>();
  for (const c of ordered) {
    const day = dayOf(c.authorDate);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
    const m = c.subject.match(CONVENTIONAL);
    if (m?.[1]) types.set(m[1], (types.get(m[1]) ?? 0) + 1);
  }

  const commitsByDay = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
  const peak = commitsByDay.reduce((a, b) => (b.count > a.count ? b : a));

  const durationMs =
    new Date(last.authorDate).getTime() - new Date(first.authorDate).getTime();
  const durationDays = Math.max(
    0,
    Math.round((durationMs / 86_400_000) * 10) / 10
  );

  return {
    commits: ordered.length,
    activeDays: byDay.size,
    firstCommit: first.authorDate,
    lastCommit: last.authorDate,
    durationDays,
    velocity: {
      commitsPerActiveDay:
        Math.round((ordered.length / byDay.size) * 10) / 10,
      peakDay: peak,
    },
    commitsByDay,
    commitTypes: types.size > 0 ? Object.fromEntries(types) : undefined,
  };
}

// ---- main ----
const projectId = process.argv[2];
if (!projectId) {
  console.error("usage: extract-git-stats.ts <projectId>");
  process.exit(2);
}
const dir = repoDir(projectId);
if (!fs.existsSync(dir)) {
  console.error(`No clone at ${dir} — run clone-repo.ts first`);
  process.exit(1);
}

const identities = (() => {
  try {
    const profile = readJson(PROFILE_FILE) as { identities?: string[] };
    return (profile.identities ?? []).map((s) => s.toLowerCase());
  } catch {
    return [];
  }
})();

// allowFail: a freshly-initialized repo with zero commits exits 128 on
// `git log`; that must yield zeroed metrics, not a crash.
const logRaw = run(
  "git",
  [
    "log",
    "--no-merges",
    `--pretty=format:%H${FIELD}%aI${FIELD}%aN${FIELD}%aE${FIELD}%s${RECORD}`,
  ],
  { cwd: dir, allowFail: true }
);
const commits = parseLog(logRaw);

const isOwner = (c: Commit) =>
  identities.length > 0 &&
  (identities.includes(c.authorEmail.toLowerCase()) ||
    identities.includes(c.authorName.toLowerCase()) ||
    // GitHub noreply convention: 12345+username@users.noreply.github.com
    identities.some((id) =>
      c.authorEmail.toLowerCase().endsWith(`+${id}@users.noreply.github.com`) ||
      c.authorEmail.toLowerCase() === `${id}@users.noreply.github.com`
    ));

const authors = new Map<string, { name: string; email: string; commits: number }>();
for (const c of commits) {
  const key = `${c.authorName}<${c.authorEmail}>`;
  const cur = authors.get(key) ?? { name: c.authorName, email: c.authorEmail, commits: 0 };
  cur.commits += 1;
  authors.set(key, cur);
}

// Attribution honesty: never guess ownership upward.
// - identities configured → exactly what they match (0 matches on someone
//   else's repo reports 0%, not 100%).
// - identities missing → only an unambiguous single-author repo counts as
//   fully owned; multi-author reports 0% until /setup configures identities.
let ownerCommits: Commit[];
if (identities.length > 0) {
  ownerCommits = commits.filter(isOwner);
  if (ownerCommits.length === 0 && commits.length > 0) {
    console.warn(
      `⚠ no commits match profile.identities — if this is your repo, add your git author email/name via /setup`
    );
  }
} else {
  ownerCommits = authors.size <= 1 ? commits : [];
}

const filesRaw = run("git", ["ls-files", "-z"], { cwd: dir });
const files = filesRaw.split("\0").filter(Boolean);
const filesByExtension: Record<string, number> = {};
for (const f of files) {
  const base = f.split("/").pop() ?? f;
  const dot = base.lastIndexOf(".");
  const ext = dot > 0 ? base.slice(dot + 1).toLowerCase() : "(none)";
  filesByExtension[ext] = (filesByExtension[ext] ?? 0) + 1;
}

const totalMetrics = computeMetrics(commits);

const stats: RawStats = {
  extractedAt: new Date().toISOString(),
  repo: {
    url: run("git", ["remote", "get-url", "origin"], { cwd: dir, allowFail: true }).trim(),
    directory: dir,
    headCommit: run("git", ["rev-parse", "HEAD"], { cwd: dir, allowFail: true }).trim(),
    defaultBranch: run("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: dir, allowFail: true }).trim(),
  },
  git: {
    total: totalMetrics,
    byOwner: computeMetrics(ownerCommits),
    ownerCommitPct:
      commits.length === 0
        ? 0
        : Math.round((ownerCommits.length / commits.length) * 1000) / 10,
    authors: [...authors.values()].sort((a, b) => b.commits - a.commits),
  },
  filesByExtension,
  fileCount: files.length,
};

// Preserve a previously fetched github block (fetch-github-meta merges into
// this file; re-extraction must not destroy it).
const out = statsFile(projectId);
if (fs.existsSync(out)) {
  const prev = readJson(out) as { github?: RawStats["github"] };
  if (prev.github) stats.github = prev.github;
}

const valid = parseWith(rawStatsSchema, stats, out);
writeJson(out, valid);

const t = valid.git.total;
console.log(
  `✓ ${projectId}: ${t.commits} commits, ${t.activeDays} active days, ` +
    `${t.durationDays}d span, owner ${valid.git.ownerCommitPct}% ` +
    `(${valid.fileCount} files) → ${out}`
);
