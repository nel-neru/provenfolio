import { z } from "zod";
import { schemaVersionField, slug, isoDateTime, link } from "./common.js";
import { sourceType } from "./source.js";
import { projectCategory, projectStatus } from "./project.js";

/**
 * Owner-supplied information that git history cannot provide. Written by BOTH
 * the Studio GUI form and the /analyze conversational interview — same file,
 * same schema: data/intake/<id>.json. Doubles as the pending-analysis queue.
 *
 * The `outcomes` array is the ONLY place quantitative results may come from:
 * case-study "results" prose may reference numbers found here or in metrics,
 * nothing else.
 */
export const intakeSchema = z.object({
  schemaVersion: schemaVersionField,
  /** Set when the project has been analyzed (matches data/projects/<id>.json) */
  projectId: slug.optional(),
  /** For github/local sources, registered before analysis */
  repoUrl: z.url().optional(),
  sourceType: sourceType.default("github"),
  state: z.enum(["pending", "analyzed"]).default("pending"),

  // ---- required before enrich (the /analyze skill enforces, not the schema,
  // so a bulk URL registration can exist in pending state) ----
  category: projectCategory.optional(),
  status: projectStatus.optional(),
  role: z
    .object({
      type: z.enum(["solo", "lead", "contributor"]),
      /** What you personally did, in the source language */
      scope: z.string().optional(),
    })
    .optional(),
  /** One-liner: what is this? (source language) */
  whatIsIt: z.string().optional(),

  // ---- recommended ----
  motivation: z.string().optional(),
  targetAudience: z.string().optional(),
  links: z.array(link).default([]),

  // ---- optional ----
  teamSize: z.number().int().positive().optional(),
  /**
   * Quantitative outcomes, each with its source. Example:
   * { label: "monthly users", value: "1200", source: "Cloudflare Analytics 2026-06" }
   */
  outcomes: z
    .array(
      z.object({
        label: z.string().min(1),
        value: z.string().min(1),
        source: z.string().optional(),
      })
    )
    .default([]),
  testimonials: z
    .array(z.object({ quote: z.string().min(1), author: z.string().min(1) }))
    .default([]),
  techStackCorrections: z
    .object({
      add: z.array(z.string()).default([]),
      remove: z.array(z.string()).default([]),
    })
    .optional(),
  /** Overrides auto-detected visibility (NDA constraints etc.) */
  visibilityOverride: z.enum(["public", "private"]).optional(),
  /** Free-form Q&A from the /analyze interview (grounded in findings) */
  interview: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .default([]),
  /** Owner-provided display name override */
  displayName: z.string().optional(),
  notes: z.string().optional(),

  updatedAt: isoDateTime,
});
export type Intake = z.infer<typeof intakeSchema>;

// Intake fields are intentionally plain strings, not localizedText: owners
// answer in their source language; the translator agent produces target
// locales downstream in the contract file.
