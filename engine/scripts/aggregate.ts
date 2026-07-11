/**
 * Recompute data/derived/aggregates.json from all project files.
 * Usage: npm run aggregate
 */
import { projectSchema, aggregatesSchema, type Project } from "../schemas/index.js";
import { PROJECTS_DIR, AGGREGATES_FILE } from "./lib/paths.js";
import { readJson, writeJson, listJsonFiles, parseWith } from "./lib/io.js";
import { computeAggregates } from "./lib/aggregate-lib.js";

const projects: Project[] = listJsonFiles(PROJECTS_DIR).map((f) =>
  parseWith(projectSchema, readJson(f), f)
);

const aggregates = computeAggregates(projects, new Date().toISOString());
writeJson(AGGREGATES_FILE, parseWith(aggregatesSchema, aggregates, AGGREGATES_FILE));
console.log(
  `✓ aggregates: ${aggregates.totals.projects} projects, ` +
    `${aggregates.totals.commits} commits, ${aggregates.techFrequency.length} technologies`
);
