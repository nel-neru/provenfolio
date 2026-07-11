import { z } from "zod";
import { isoDateTime } from "./common.js";
import { gitMetrics, languageShare } from "./project.js";

/**
 * Raw extraction output — workspace/<id>/stats.json. Transient (gitignored),
 * regenerable, and the SOLE source the emit script draws metrics from.
 * Produced by engine/sources/github/extract-git-stats.ts (+ fetch-github-meta).
 */
export const rawStatsSchema = z.object({
  extractedAt: isoDateTime,
  repo: z.object({
    url: z.string(),
    directory: z.string(),
    headCommit: z.string(),
    defaultBranch: z.string().optional(),
  }),
  git: z.object({
    total: gitMetrics,
    /** Filtered to profile.identities; equals total on solo repos */
    byOwner: gitMetrics,
    ownerCommitPct: z.number().min(0).max(100),
    authors: z
      .array(
        z.object({
          name: z.string(),
          email: z.string(),
          commits: z.number().int().nonnegative(),
        })
      )
      .default([]),
  }),
  /** Extension-based fallback when the GitHub API is unavailable */
  filesByExtension: z.record(z.string(), z.number().int().nonnegative()),
  fileCount: z.number().int().nonnegative(),
  /** Present when `gh api` succeeded */
  github: z
    .object({
      description: z.string().nullable().optional(),
      createdAt: isoDateTime.optional(),
      pushedAt: isoDateTime.optional(),
      stars: z.number().int().nonnegative().optional(),
      forks: z.number().int().nonnegative().optional(),
      isFork: z.boolean().optional(),
      isPrivate: z.boolean().optional(),
      languages: z.array(languageShare).optional(),
      topics: z.array(z.string()).optional(),
      homepage: z.string().nullable().optional(),
      prCount: z.number().int().nonnegative().optional(),
      releaseCount: z.number().int().nonnegative().optional(),
      contributorCount: z.number().int().positive().optional(),
      /** Narrative input for squash-merge cultures */
      pullRequests: z
        .array(
          z.object({
            number: z.number().int(),
            title: z.string(),
            body: z.string().nullable().optional(),
            mergedAt: isoDateTime.nullable().optional(),
          })
        )
        .optional(),
    })
    .optional(),
});
export type RawStats = z.infer<typeof rawStatsSchema>;
