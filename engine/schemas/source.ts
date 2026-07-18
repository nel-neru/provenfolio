import { z } from "zod";

/**
 * Source adapter types. Adding a new adapter (x, blog, zenn, ...) means
 * extending this union — project/activities schemas already accept it.
 */
export const sourceType = z.enum(["github", "manual", "local"]);
export type SourceType = z.infer<typeof sourceType>;

/**
 * Hosts accepted for `type: "github"` repo URLs. The repoUrl comes straight
 * from the git remote and ends up as a public link on the site, so a typo'd
 * or hostile host must not pass validation. GitHub Enterprise / self-hosted
 * GitHub is intentionally out of scope for now — model those repos as a
 * "manual" source (which carries no host constraint) until an enterprise
 * host allowlist is added.
 */
const GITHUB_HOSTS = new Set(["github.com", "www.github.com"]);

/**
 * One source feeding a project. `sources` is an array on the project so a
 * single case study can bundle multiple repos (app + MCP server + docs).
 */
export const projectSource = z
  .object({
    type: sourceType,
    /** Required for github sources */
    repoUrl: z.url().optional(),
    /** Reserved: monorepo subtree ("packages/core") or local directory path */
    path: z.string().optional(),
    /** HEAD commit of the analyzed repo at analysis time */
    sourceCommit: z.string().optional(),
    defaultBranch: z.string().optional(),
    /**
     * "private" renders as "proprietary — architecture described, source not
     * linked" and suppresses repo links on the site.
     */
    visibility: z.enum(["public", "private"]).default("public"),
    /** True when the repo is a fork (metrics.byOwner becomes the honest headline) */
    isFork: z.boolean().default(false),
  })
  .check((ctx) => {
    if (ctx.value.type !== "github") return;
    if (!ctx.value.repoUrl) {
      ctx.issues.push({
        code: "custom",
        message: "github sources require repoUrl",
        input: ctx.value,
      });
      return;
    }
    let host: string;
    try {
      host = new URL(ctx.value.repoUrl).hostname.toLowerCase();
    } catch {
      // Malformed URL — z.url() on repoUrl already reported it.
      return;
    }
    if (!GITHUB_HOSTS.has(host)) {
      ctx.issues.push({
        code: "custom",
        message:
          `github sources require a github.com repoUrl, got host "${host}" — ` +
          'fix the URL, or use type "manual" for repos hosted elsewhere ' +
          "(GitHub Enterprise hosts are not supported yet)",
        input: ctx.value,
      });
    }
  });
export type ProjectSource = z.infer<typeof projectSource>;
