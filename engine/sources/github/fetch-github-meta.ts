/**
 * Enrich workspace/<id>/stats.json with GitHub API metadata via the user's
 * authenticated `gh` CLI: languages, stars, PR titles/bodies (the narrative
 * source for squash-merge cultures), release/contributor counts.
 *
 * Fails SOFT: offline / unauthenticated / API errors leave the github block
 * absent and the pipeline continues on clone-derived fallbacks.
 *
 * Usage: tsx engine/sources/github/fetch-github-meta.ts <projectId> <owner/name>
 */
import fs from "node:fs";
import { rawStatsSchema, type RawStats } from "../../schemas/index.js";
import { readJson, writeJson, parseWith } from "../../scripts/lib/io.js";
import { statsFile, run, parseRepoUrl } from "./lib.js";

const projectId = process.argv[2];
const repoInput = process.argv[3];
if (!projectId || !repoInput) {
  console.error("usage: fetch-github-meta.ts <projectId> <owner/name|url>");
  process.exit(2);
}
const { owner, name } = parseRepoUrl(repoInput);
const repoPath = `repos/${owner}/${name}`;

const out = statsFile(projectId);
if (!fs.existsSync(out)) {
  console.error(`No stats at ${out} — run extract-git-stats.ts first`);
  process.exit(1);
}

function ghJson<T>(endpoint: string): T | undefined {
  const raw = run("gh", ["api", endpoint], { allowFail: true });
  if (!raw.trim()) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

interface RepoMeta {
  description: string | null;
  created_at: string;
  pushed_at: string;
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  private: boolean;
  homepage: string | null;
  topics?: string[];
}

const meta = ghJson<RepoMeta>(repoPath);
if (!meta) {
  console.warn(
    `⚠ GitHub API unavailable for ${owner}/${name} — continuing with git-only stats`
  );
  process.exit(0);
}

const langBytes = ghJson<Record<string, number>>(`${repoPath}/languages`) ?? {};
const totalBytes = Object.values(langBytes).reduce((a, b) => a + b, 0);
const languages = Object.entries(langBytes)
  .sort(([, a], [, b]) => b - a)
  .map(([lang, bytes]) => ({
    name: lang,
    bytes,
    pct: totalBytes === 0 ? 0 : Math.round((bytes / totalBytes) * 1000) / 10,
  }));

interface PR {
  number: number;
  title: string;
  body: string | null;
  merged_at: string | null;
}
const prs =
  ghJson<PR[]>(`${repoPath}/pulls?state=closed&per_page=100`)?.filter(
    (p) => p.merged_at
  ) ?? [];

const releases = ghJson<unknown[]>(`${repoPath}/releases?per_page=100`) ?? [];
const contributors =
  ghJson<unknown[]>(`${repoPath}/contributors?per_page=100`) ?? [];

const stats = readJson(out) as RawStats;
stats.github = {
  description: meta.description,
  createdAt: meta.created_at,
  pushedAt: meta.pushed_at,
  stars: meta.stargazers_count,
  forks: meta.forks_count,
  isFork: meta.fork,
  isPrivate: meta.private,
  languages,
  topics: meta.topics ?? [],
  homepage: meta.homepage,
  prCount: prs.length,
  releaseCount: releases.length,
  contributorCount: Math.max(contributors.length, 1),
  pullRequests: prs.map((p) => ({
    number: p.number,
    title: p.title,
    body: p.body ? p.body.slice(0, 2000) : null,
    mergedAt: p.merged_at,
  })),
};

const valid = parseWith(rawStatsSchema, stats, out);
writeJson(out, valid);
console.log(
  `✓ ${projectId}: github meta merged (${languages.length} languages, ` +
    `${prs.length} merged PRs, ★${meta.stargazers_count}${meta.private ? ", private" : ""})`
);
