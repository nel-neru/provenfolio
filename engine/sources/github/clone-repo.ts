/**
 * Clone (or refresh) the target repo into workspace/<id>/repo — idempotent.
 * Full commit history via --filter=blob:none (metadata complete, old blobs
 * fetched on demand; the working tree is fully materialized for agents).
 * Private repos work through the user's normal git credentials / gh auth.
 *
 * Usage: tsx engine/sources/github/clone-repo.ts <repo-url|owner/name>
 * Prints a JSON result line for the calling skill.
 */
import fs from "node:fs";
import path from "node:path";
import { parseRepoUrl, repoDir, run } from "./lib.js";

const input = process.argv[2];
if (!input) {
  console.error("usage: clone-repo.ts <repo-url|owner/name>");
  process.exit(2);
}

const ref = parseRepoUrl(input);
const dir = repoDir(ref.projectId);

// Windows-safe git defaults for clones we manage.
const gitCfg = ["-c", "core.longpaths=true", "-c", "core.autocrlf=false"];

if (fs.existsSync(path.join(dir, ".git"))) {
  run("git", [...gitCfg, "fetch", "--prune", "origin"], { cwd: dir });
  const originHead = run(
    "git",
    ["symbolic-ref", "--short", "refs/remotes/origin/HEAD"],
    { cwd: dir, allowFail: true }
  ).trim();
  const target = originHead || "origin/HEAD";
  run("git", ["reset", "--hard", target], { cwd: dir });
} else {
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  run("git", [...gitCfg, "clone", "--filter=blob:none", ref.url, dir]);
}

const headCommit = run("git", ["rev-parse", "HEAD"], { cwd: dir }).trim();
const defaultBranch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
  cwd: dir,
}).trim();

console.log(
  JSON.stringify({
    projectId: ref.projectId,
    owner: ref.owner,
    name: ref.name,
    url: ref.url,
    dir,
    headCommit,
    defaultBranch,
  })
);
