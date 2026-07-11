/**
 * Provenfolio data contract — single source of truth.
 * Imported by: engine scripts (write-time validation), the Astro site
 * (read-time validation via content collections), Studio (form validation),
 * and exporters. One zod instance, pinned at the repo root.
 */
export * from "./common.js";
export * from "./source.js";
export * from "./project.js";
export * from "./intake.js";
export * from "./profile.js";
export * from "./manifest.js";
export * from "./aggregates.js";
export * from "./stats.js";
export * from "./prose.js";
