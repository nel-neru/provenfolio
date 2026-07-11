import { z } from "zod";
import { localizedText, evidenceRef, link, isoDate } from "./common.js";
import { techStackEntry } from "./project.js";

/**
 * Agent output contract — workspace/<id>/prose.json. This is the ONLY thing
 * analysis agents produce; they never touch data/. The emit script merges it
 * into the project file, re-injects metrics from stats.json, and lints it.
 */
export const proseSchema = z.object({
  summary: localizedText,
  caseStudy: z.object({
    problem: localizedText,
    solution: localizedText,
    /** Only from intake outcomes / verifiable facts — enforced by the lints */
    results: localizedText.optional(),
  }),
  highlights: z
    .array(z.object({ text: localizedText, evidence: z.array(evidenceRef).min(1) }))
    .min(1),
  techStack: z.array(techStackEntry).default([]),
  timeline: z
    .array(
      z.object({
        date: isoDate,
        title: localizedText,
        description: localizedText.optional(),
        evidence: z.array(evidenceRef).default([]),
      })
    )
    .default([]),
  links: z.array(link).default([]),
  /**
   * Repo facts the analyzer verified with receipts (e.g. "7 MCP tools",
   * evidence: file "mcp-server/index.js"). The numeric lint accepts these
   * numbers; anything else not present in metrics/intake is rejected.
   */
  verifiedNumbers: z
    .array(
      z.object({
        value: z.string().min(1),
        evidence: z.array(evidenceRef).min(1),
        note: z.string().optional(),
      })
    )
    .default([]),
});
export type Prose = z.infer<typeof proseSchema>;
