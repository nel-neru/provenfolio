import { z } from "zod";
import {
  schemaVersionField,
  localizedText,
  localeCode,
  isoDateTime,
} from "./common.js";

/**
 * The owner's identity and site configuration — the ONLY place owner-specific
 * values live. Engine code reads this; it never hardcodes any of it.
 * Written by /setup, editable in Studio. Reset for a new owner via reset-data.
 */
export const profileSchema = z.object({
  schemaVersion: schemaVersionField,
  name: z.string().min(1),
  githubUser: z.string().min(1),
  email: z.email().optional(),
  /** e.g. "Software Engineer" (in each of the owner's locales) */
  role: localizedText,
  /** Hero value proposition — the 15-second rule line */
  tagline: localizedText,
  bio: localizedText,
  /** Relative to data/, e.g. "assets/avatar.png" */
  avatar: z.string().optional(),
  /** Deployed site URL (https://xxx.pages.dev or custom domain) */
  siteUrl: z.url().optional(),
  /** Custom domain, connected later via Cloudflare dashboard */
  domain: z.string().optional(),
  socials: z
    .array(
      z.object({
        platform: z.string().min(1),
        url: z.url(),
        handle: z.string().optional(),
      })
    )
    .default([]),

  /** Source-of-truth locale for all localizedText (e.g. "ja") */
  sourceLang: localeCode,
  /** Locales the translator agent produces (e.g. ["en"]) */
  targetLangs: z.array(localeCode).default([]),

  /**
   * Git author identities (emails and author names) used to compute
   * metrics.byOwner on team repos and forks. /setup collects these from
   * `git config` + GitHub noreply conventions.
   */
  identities: z.array(z.string().min(1)).default([]),

  seo: z.object({
    title: z.string().min(1),
    description: localizedText,
  }),

  analytics: z
    .object({
      /** Cloudflare Web Analytics token — injected into the layout when set */
      cloudflareToken: z.string().optional(),
    })
    .optional(),

  /**
   * Skills shown on the site are COMPUTED from aggregates (evidence-linked).
   * These overrides only add what analysis can't see or hide noise.
   */
  skillOverrides: z
    .array(
      z.object({
        name: z.string().min(1),
        category: z.string().optional(),
        action: z.enum(["add", "hide"]),
      })
    )
    .default([]),

  updatedAt: isoDateTime,
});
export type Profile = z.infer<typeof profileSchema>;
