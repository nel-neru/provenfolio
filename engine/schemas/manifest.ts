import { z } from "zod";
import { schemaVersionField, slug, isoDateTime } from "./common.js";
import { projectPlacement } from "./project.js";

/**
 * Project registry: ordering, featuring, placement. Upserted by the emit
 * script (never rewritten wholesale — owner edits like `featured` survive).
 */
export const manifestSchema = z.object({
  schemaVersion: schemaVersionField,
  engineVersion: z.string(),
  lastUpdated: isoDateTime,
  projects: z
    .array(
      z.object({
        id: slug,
        featured: z.boolean().default(false),
        placement: projectPlacement,
        order: z.number().int().default(0),
      })
    )
    .default([]),
});
export type Manifest = z.infer<typeof manifestSchema>;
