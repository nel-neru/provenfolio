import { z } from "zod";
import {
  schemaVersionField,
  localizedText,
  slug,
  isoDateTime,
  isoDate,
  evidenceRef,
  link,
} from "./common.js";
import { projectSource } from "./source.js";

/** Commits on one calendar day (heatmap / sparkline source) */
export const dayCount = z.object({
  date: isoDate,
  count: z.number().int().nonnegative(),
});
export type DayCount = z.infer<typeof dayCount>;

/**
 * Deterministic git-derived metrics. ONLY extraction scripts write this —
 * agents may reference these numbers but can never invent or edit them
 * (the emit script re-injects this block unconditionally from stats.json).
 */
export const gitMetrics = z.object({
  commits: z.number().int().nonnegative(),
  activeDays: z.number().int().nonnegative(),
  firstCommit: isoDateTime.optional(),
  lastCommit: isoDateTime.optional(),
  durationDays: z.number().nonnegative(),
  velocity: z.object({
    commitsPerActiveDay: z.number().nonnegative(),
    peakDay: dayCount.optional(),
  }),
  commitsByDay: z.array(dayCount),
  /** Conventional-commit type histogram, e.g. { feat: 80, fix: 41 } */
  commitTypes: z.record(z.string(), z.number().int().nonnegative()).optional(),
});
export type GitMetrics = z.infer<typeof gitMetrics>;

export const languageShare = z.object({
  name: z.string().min(1),
  bytes: z.number().int().nonnegative().optional(),
  pct: z.number().min(0).max(100),
});

/**
 * Full metrics block. `total` covers the whole repo; `byOwner` filters to the
 * owner's identities (profile.identities) — present whenever the repo has
 * other contributors, so team repos and forks never produce inflated numbers.
 */
export const projectMetrics = z.object({
  total: gitMetrics,
  byOwner: gitMetrics.optional(),
  /** Share of commits authored by the owner (0-100) */
  ownerCommitPct: z.number().min(0).max(100).optional(),
  languages: z.array(languageShare).default([]),
  prCount: z.number().int().nonnegative().optional(),
  releaseCount: z.number().int().nonnegative().optional(),
  stars: z.number().int().nonnegative().optional(),
  forks: z.number().int().nonnegative().optional(),
  contributorCount: z.number().int().positive().optional(),
  conventionalCommitPct: z.number().min(0).max(100).optional(),
});
export type ProjectMetrics = z.infer<typeof projectMetrics>;

export const projectCategory = z.enum([
  "product",
  "service",
  "client",
  "oss",
  "hobby",
  "learning",
]);
export type ProjectCategory = z.infer<typeof projectCategory>;

/** Where the project appears on the site. Owner-controlled; engine only suggests. */
export const projectPlacement = z.enum(["products", "lab", "archive"]);
export type ProjectPlacement = z.infer<typeof projectPlacement>;

export const projectStatus = z.enum(["active", "maintained", "archived"]);

export const timelineEvent = z.object({
  date: isoDate,
  title: localizedText,
  description: localizedText.optional(),
  /** Receipts: commits/PRs/releases backing this turning point */
  evidence: z.array(evidenceRef).default([]),
});
export type TimelineEvent = z.infer<typeof timelineEvent>;

export const highlight = z.object({
  text: localizedText,
  /** Every qualitative claim needs at least one receipt */
  evidence: z.array(evidenceRef).min(1),
});
export type Highlight = z.infer<typeof highlight>;

export const techStackEntry = z.object({
  name: z.string().min(1),
  category: z.enum(["language", "framework", "runtime", "infra", "tool", "other"]),
});

export const screenshot = z.object({
  /** Relative to data/, e.g. "assets/screenshots/my-project/home.png" */
  src: z.string().min(1),
  alt: localizedText,
});

export const completeness = z.object({
  /** 0-100, computed by engine/scripts/lib/completeness.ts — never hand-edited */
  score: z.number().int().min(0).max(100),
  /** Machine-readable gaps, e.g. "demo-link", "screenshots", "translation:en" */
  missing: z.array(z.string()),
});

export const projectGenerated = z.object({
  engineVersion: z.string(),
  analyzedAt: isoDateTime,
  /**
   * SHA-256 per prose field path (e.g. "caseStudy.problem.ja") captured at
   * emit time. Hash mismatch on re-analysis = human-edited = never overwrite
   * without diff confirmation.
   */
  contentHashes: z.record(z.string(), z.string()).default({}),
  lastRefreshedAt: isoDateTime.optional(),
  /** Set when source drift exceeds threshold and prose likely stale */
  staleSince: isoDateTime.optional(),
  /** Optional metric snapshots for future growth charts */
  metricsSnapshots: z
    .array(z.object({ at: isoDateTime, commits: z.number().int().nonnegative() }))
    .optional(),
});

/**
 * The core contract artifact: one analyzed project = one file in
 * data/projects/<id>.json. Consumed by the site (content collections),
 * exporters, and Studio — all through this schema.
 */
export const projectSchema = z.object({
  schemaVersion: schemaVersionField,
  id: slug,
  name: z.string().min(1),
  category: projectCategory,
  status: projectStatus.default("active"),
  featured: z.boolean().default(false),
  placement: projectPlacement,
  order: z.number().int().default(0),
  sources: z.array(projectSource).min(1),
  role: z
    .object({
      type: z.enum(["solo", "lead", "contributor"]),
      scope: localizedText.optional(),
    })
    .optional(),
  /** 1-2 sentence card/hero copy (the tl;dr line) */
  summary: localizedText,
  caseStudy: z.object({
    /** Business template: problem. Craft template (oss/hobby): motivation. */
    problem: localizedText,
    /** Includes the "why this stack" narrative */
    solution: localizedText,
    /**
     * ONLY from intake outcomes or verifiable repo facts. Absent → the site
     * renders the craft/engineering-outcomes variant instead. Never invented.
     */
    results: localizedText.optional(),
  }),
  highlights: z.array(highlight).min(1),
  techStack: z.array(techStackEntry).default([]),
  /** Absent for manual-source projects (no repo to measure) */
  metrics: projectMetrics.optional(),
  timeline: z.array(timelineEvent).default([]),
  links: z.array(link).default([]),
  screenshots: z.array(screenshot).default([]),
  /** Path (relative to data/) of the generated architecture diagram SVG */
  architectureDiagram: z.string().optional(),
  completeness: completeness.optional(),
  generated: projectGenerated,
});
export type Project = z.infer<typeof projectSchema>;
