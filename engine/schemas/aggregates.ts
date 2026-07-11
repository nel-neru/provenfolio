import { z } from "zod";
import { schemaVersionField, slug, isoDateTime, isoDate } from "./common.js";
import { projectCategory, projectPlacement } from "./project.js";

/**
 * Cross-project derived data — data/derived/aggregates.json.
 * Recomputed deterministically by engine/scripts/aggregate.ts after every
 * emit and refresh. Never hand-edited; site skills/history views read this.
 */
export const aggregatesSchema = z.object({
  schemaVersion: schemaVersionField,
  generatedAt: isoDateTime,
  totals: z.object({
    projects: z.number().int().nonnegative(),
    commits: z.number().int().nonnegative(),
    activeDays: z.number().int().nonnegative(),
    /** Days between the earliest firstCommit and the latest lastCommit */
    spanDays: z.number().int().nonnegative().optional(),
  }),
  /**
   * Evidence-linked tech usage across all projects — the source of the
   * "skills" display (replacing hand-typed skill lists).
   */
  techFrequency: z
    .array(
      z.object({
        name: z.string().min(1),
        category: z.string(),
        projectIds: z.array(slug).min(1),
        firstUsed: isoDate.optional(),
        lastUsed: isoDate.optional(),
      })
    )
    .default([]),
  /** Per-project spans for the /history timeline bars */
  projectSpans: z
    .array(
      z.object({
        id: slug,
        name: z.string(),
        category: projectCategory,
        placement: projectPlacement,
        firstCommit: isoDate.optional(),
        lastCommit: isoDate.optional(),
        commits: z.number().int().nonnegative().optional(),
      })
    )
    .default([]),
  /** Activity per calendar year, for density-gated history visualizations */
  yearlyActivity: z
    .array(
      z.object({
        year: z.number().int(),
        commits: z.number().int().nonnegative(),
        activeDays: z.number().int().nonnegative(),
        topLanguages: z.array(z.string()).default([]),
      })
    )
    .default([]),
});
export type Aggregates = z.infer<typeof aggregatesSchema>;
