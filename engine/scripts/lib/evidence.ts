import fs from "node:fs";
import path from "node:path";

/**
 * Verify a `file`-kind evidence ref against the analyzed repo clone.
 * The ref must be a repo-relative path that stays INSIDE the repo directory:
 * absolute paths and `..` escapes are rejected so agents cannot point a
 * "receipt" at files outside the analyzed repository (e.g. their own
 * workspace findings).
 *
 * Returns a problem description, or undefined when the evidence is valid.
 */
export function evidenceFileProblem(
  repoDir: string,
  ref: string
): string | undefined {
  if (path.isAbsolute(ref)) {
    return `evidence file "${ref}" must be a repo-relative path`;
  }
  const root = path.resolve(repoDir);
  const resolved = path.resolve(root, ref);
  if (!resolved.startsWith(root + path.sep)) {
    return `evidence file "${ref}" resolves outside the repo directory`;
  }
  return fs.existsSync(resolved)
    ? undefined
    : `evidence file "${ref}" does not exist in the repo`;
}
