import { z } from "zod";

/**
 * Current data-contract version. Bump when making a breaking schema change
 * and add a migration in engine/scripts/migrate-data.ts.
 */
export const SCHEMA_VERSION = 1;

export const schemaVersionField = z.number().int().positive();

/** BCP-47-ish locale code: "ja", "en", "pt-BR" */
export const localeCode = z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/);

/**
 * Localized text keyed by locale code. Which key is the source of truth is
 * defined by profile.sourceLang — engine code must never assume a locale.
 * An empty string means "not yet translated" (rejected for featured projects
 * at /publish time, tolerated elsewhere).
 */
export const localizedText = z.record(localeCode, z.string());
export type LocalizedText = z.infer<typeof localizedText>;

/** URL-safe identifier, e.g. "octocat--hello-world" */
export const slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);

/** ISO 8601 timestamp with offset (git author dates) or Z */
export const isoDateTime = z.iso.datetime({ offset: true });

/** Plain calendar date "2026-07-08" */
export const isoDate = z.iso.date();

/**
 * Evidence reference — the "receipt" behind a qualitative claim.
 * Every highlight and timeline event must carry at least one.
 * kinds:
 *  - commit: full or abbreviated SHA in the analyzed repo
 *  - file:   path within the analyzed repo
 *  - pr:     pull request number ("#12" or "12")
 *  - release: tag name
 *  - ownerInput: pointer into the intake record (e.g. "outcomes[0]")
 *  - url:    external verifiable source
 */
export const evidenceRef = z.object({
  kind: z.enum(["commit", "file", "pr", "release", "ownerInput", "url"]),
  ref: z.string().min(1),
  label: z.string().optional(),
});
export type EvidenceRef = z.infer<typeof evidenceRef>;

export const link = z.object({
  label: localizedText,
  url: z.url(),
  kind: z
    .enum(["demo", "store", "video", "docs", "repo", "article", "other"])
    .default("other"),
});
export type Link = z.infer<typeof link>;
