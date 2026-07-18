/**
 * Zod-validate everything in data/ against the contract, plus cross-file
 * consistency checks. Exit 1 on any error. Run via `npm run validate`
 * (also the first step of `npm run build`, so the site can never ship
 * contract-violating data).
 */
import fs from "node:fs";
import path from "node:path";
import {
  SCHEMA_VERSION,
  profileSchema,
  manifestSchema,
  aggregatesSchema,
  projectSchema,
  intakeSchema,
  type Profile,
  type Project,
  type LocalizedText,
} from "../schemas/index.js";
import {
  DATA_DIR,
  PROJECTS_DIR,
  INTAKE_DIR,
  PROFILE_FILE,
  MANIFEST_FILE,
  AGGREGATES_FILE,
} from "./lib/paths.js";
import { readJson, listJsonFiles, parseWith, ValidationFailure } from "./lib/io.js";

const errors: string[] = [];
const warnings: string[] = [];

function rel(file: string): string {
  return path.relative(DATA_DIR, file).replaceAll("\\", "/");
}

function checkSchemaVersion(doc: unknown, file: string): void {
  const v = (doc as { schemaVersion?: number }).schemaVersion;
  if (v !== SCHEMA_VERSION) {
    errors.push(
      `${rel(file)}: schemaVersion ${v} != current ${SCHEMA_VERSION} — run \`npm run migrate\``
    );
  }
}

function requireSourceLang(
  text: LocalizedText | undefined,
  sourceLang: string,
  where: string,
  file: string
): void {
  if (text === undefined) return;
  if (!text[sourceLang]?.trim()) {
    errors.push(`${rel(file)}: ${where} has no ${sourceLang} (source language) text`);
  }
}

// ---- profile ----
let profile: Profile | undefined;
try {
  const raw = readJson(PROFILE_FILE);
  checkSchemaVersion(raw, PROFILE_FILE);
  profile = parseWith(profileSchema, raw, PROFILE_FILE);
  for (const [where, text] of Object.entries({
    role: profile.role,
    tagline: profile.tagline,
    bio: profile.bio,
    "seo.description": profile.seo.description,
  })) {
    requireSourceLang(text, profile.sourceLang, where, PROFILE_FILE);
  }
  if (profile.targetLangs.includes(profile.sourceLang)) {
    warnings.push(
      `${rel(PROFILE_FILE)}: targetLangs contains the source language '${profile.sourceLang}'; it is ignored — remove it from targetLangs`
    );
  }
} catch (e) {
  errors.push(e instanceof ValidationFailure ? e.message : `profile.json: ${e}`);
}

// ---- manifest ----
let manifestIds = new Set<string>();
try {
  const raw = readJson(MANIFEST_FILE);
  checkSchemaVersion(raw, MANIFEST_FILE);
  const manifest = parseWith(manifestSchema, raw, MANIFEST_FILE);
  manifestIds = new Set(manifest.projects.map((p) => p.id));
  const dupes = manifest.projects.length - manifestIds.size;
  if (dupes > 0) errors.push(`manifest.json: ${dupes} duplicate project id(s)`);
} catch (e) {
  errors.push(e instanceof ValidationFailure ? e.message : `manifest.json: ${e}`);
}

// ---- projects ----
const projectIds = new Set<string>();
for (const file of listJsonFiles(PROJECTS_DIR)) {
  try {
    const raw = readJson(file);
    checkSchemaVersion(raw, file);
    const project: Project = parseWith(projectSchema, raw, file);
    projectIds.add(project.id);

    const expected = `${project.id}.json`;
    if (path.basename(file) !== expected) {
      errors.push(`${rel(file)}: filename does not match id "${project.id}"`);
    }
    if (profile) {
      const sl = profile.sourceLang;
      requireSourceLang(project.summary, sl, "summary", file);
      requireSourceLang(project.caseStudy.problem, sl, "caseStudy.problem", file);
      requireSourceLang(project.caseStudy.solution, sl, "caseStudy.solution", file);
      project.highlights.forEach((h, i) =>
        requireSourceLang(h.text, sl, `highlights[${i}]`, file)
      );
    }
    for (const shot of project.screenshots) {
      const abs = path.join(DATA_DIR, shot.src);
      if (!fs.existsSync(abs)) {
        errors.push(`${rel(file)}: screenshot missing on disk: ${shot.src}`);
      }
    }
    if (project.architectureDiagram) {
      const abs = path.join(DATA_DIR, project.architectureDiagram);
      if (!fs.existsSync(abs)) {
        errors.push(
          `${rel(file)}: architectureDiagram missing on disk: ${project.architectureDiagram}`
        );
      }
    }
    if (!manifestIds.has(project.id)) {
      errors.push(`${rel(file)}: id "${project.id}" not registered in manifest.json`);
    }
    const githubSources = project.sources.filter((s) => s.type === "github");
    if (githubSources.length > 0 && !project.metrics) {
      warnings.push(`${rel(file)}: github-sourced project has no metrics block`);
    }
  } catch (e) {
    errors.push(e instanceof ValidationFailure ? e.message : `${rel(file)}: ${e}`);
  }
}
for (const id of manifestIds) {
  if (!projectIds.has(id)) {
    errors.push(`manifest.json: id "${id}" has no data/projects/${id}.json`);
  }
}

// ---- intake ----
for (const file of listJsonFiles(INTAKE_DIR)) {
  try {
    const raw = readJson(file);
    checkSchemaVersion(raw, file);
    const intake = parseWith(intakeSchema, raw, file);
    if (intake.state === "analyzed" && intake.projectId && !projectIds.has(intake.projectId)) {
      errors.push(
        `${rel(file)}: analyzed intake points to missing project "${intake.projectId}"`
      );
    }
  } catch (e) {
    errors.push(e instanceof ValidationFailure ? e.message : `${rel(file)}: ${e}`);
  }
}

// ---- aggregates (optional until first analysis) ----
if (fs.existsSync(AGGREGATES_FILE)) {
  try {
    const raw = readJson(AGGREGATES_FILE);
    checkSchemaVersion(raw, AGGREGATES_FILE);
    parseWith(aggregatesSchema, raw, AGGREGATES_FILE);
  } catch (e) {
    errors.push(e instanceof ValidationFailure ? e.message : `aggregates.json: ${e}`);
  }
}

// ---- report ----
for (const w of warnings) console.warn(`⚠ ${w}`);
if (errors.length > 0) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(`\nvalidate-data: ${errors.length} error(s)`);
  process.exit(1);
}
console.log(
  `✓ data contract valid (${projectIds.size} project(s), schemaVersion ${SCHEMA_VERSION})`
);
