import { execFileSync } from "node:child_process";
import path from "node:path";
import { WORKSPACE_DIR } from "../../scripts/lib/paths.js";

/** Generous buffer: a 100k-commit log at ~200 bytes/line is ~20 MB. */
const MAX_BUFFER = 256 * 1024 * 1024;

/** Run a command with args array (never shell strings — Windows-safe). */
export function run(
  cmd: string,
  args: string[],
  opts: { cwd?: string; allowFail?: boolean } = {}
): string {
  try {
    return execFileSync(cmd, args, {
      cwd: opts.cwd,
      encoding: "utf8",
      maxBuffer: MAX_BUFFER,
      windowsHide: true,
    });
  } catch (e) {
    if (opts.allowFail) return "";
    throw e;
  }
}

export interface RepoRef {
  owner: string;
  name: string;
  /** Canonical https clone URL */
  url: string;
  /** Stable project id: slug of "owner--name" */
  projectId: string;
}

/**
 * Accepts: https://github.com/o/n(.git), git@github.com:o/n(.git), "o/n".
 * The id embeds the owner so two same-named repos never collide.
 */
export function parseRepoUrl(input: string): RepoRef {
  let owner: string | undefined;
  let name: string | undefined;

  const httpsMatch = input.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i
  );
  const sshMatch = input.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/i);
  const shortMatch = input.match(/^([\w.-]+)\/([\w.-]+)$/);

  if (httpsMatch) [, owner, name] = httpsMatch;
  else if (sshMatch) [, owner, name] = sshMatch;
  else if (shortMatch) [, owner, name] = shortMatch;

  if (!owner || !name) {
    throw new Error(
      `Unrecognized GitHub repo reference: "${input}" (expected URL or owner/name)`
    );
  }
  return {
    owner,
    name,
    url: `https://github.com/${owner}/${name}.git`,
    projectId: slugify(`${owner}--${name}`),
  };
}

export function slugify(raw: string): string {
  const s = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{3,}/g, "--")
    .replace(/^-+|-+$/g, "");
  if (!s) throw new Error(`Cannot derive a slug from "${raw}"`);
  return s;
}

/** Where the adapter keeps its working copy for a project. */
export function repoDir(projectId: string): string {
  return path.join(WORKSPACE_DIR, projectId, "repo");
}

export function statsFile(projectId: string): string {
  return path.join(WORKSPACE_DIR, projectId, "stats.json");
}
