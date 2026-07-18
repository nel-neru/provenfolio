/**
 * Apply data-contract migrations to everything in data/. Safe to run
 * repeatedly. Buyers run this after pulling an engine update whose
 * SCHEMA_VERSION is newer than their data.
 *
 * All-or-nothing: every document is migrated in memory and Zod-validated
 * against the current contract first; if any document fails, nothing is
 * written and the process exits non-zero.
 */
import { z } from "zod";
import {
  SCHEMA_VERSION,
  profileSchema,
  manifestSchema,
  aggregatesSchema,
  projectSchema,
  intakeSchema,
} from "../schemas/index.js";
import {
  PROFILE_FILE,
  MANIFEST_FILE,
  AGGREGATES_FILE,
  PROJECTS_DIR,
  INTAKE_DIR,
} from "./lib/paths.js";
import {
  readJson,
  writeJson,
  listJsonFiles,
  parseWith,
  ValidationFailure,
} from "./lib/io.js";
import fs from "node:fs";

type DocKind = "profile" | "manifest" | "aggregates" | "project" | "intake";
type Migration = (doc: Record<string, unknown>, kind: DocKind) => Record<string, unknown>;

/** Per-kind contract schemas — the same mapping `npm run validate` applies. */
const SCHEMAS: Record<DocKind, z.ZodType> = {
  profile: profileSchema,
  manifest: manifestSchema,
  aggregates: aggregatesSchema,
  project: projectSchema,
  intake: intakeSchema,
};

/**
 * Migration registry: key N upgrades a document FROM version N TO N+1.
 * Example (when SCHEMA_VERSION becomes 3):
 *   2: (doc, kind) => kind === "project" ? { ...doc, newField: [] } : doc
 */
const MIGRATIONS: Record<number, Migration> = {
  // v1 → v2: profile.seo.title becomes localizedText. The plain string is
  // moved under the profile's source language key.
  1: (doc, kind) => {
    if (kind !== "profile") return doc;
    const seo = doc.seo as { title?: unknown } | undefined;
    if (seo && typeof seo.title === "string") {
      const sourceLang = typeof doc.sourceLang === "string" ? doc.sourceLang : "en";
      seo.title = { [sourceLang]: seo.title };
    }
    return doc;
  },
};

/** Migrate one document in memory; undefined = already at the current version. */
function migrateDoc(file: string, kind: DocKind): Record<string, unknown> | undefined {
  const doc = readJson(file) as Record<string, unknown>;
  let version = typeof doc.schemaVersion === "number" ? doc.schemaVersion : 1;
  if (version >= SCHEMA_VERSION) return undefined;

  let current = doc;
  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) {
      console.error(
        `✗ ${file}: no migration registered for v${version} → v${version + 1}`
      );
      process.exit(1);
    }
    current = step(current, kind);
    version += 1;
    current.schemaVersion = version;
  }
  return current;
}

const targets: Array<[string, DocKind]> = [];
if (fs.existsSync(PROFILE_FILE)) targets.push([PROFILE_FILE, "profile"]);
if (fs.existsSync(MANIFEST_FILE)) targets.push([MANIFEST_FILE, "manifest"]);
if (fs.existsSync(AGGREGATES_FILE)) targets.push([AGGREGATES_FILE, "aggregates"]);
for (const f of listJsonFiles(PROJECTS_DIR)) targets.push([f, "project"]);
for (const f of listJsonFiles(INTAKE_DIR)) targets.push([f, "intake"]);

// Phase 1: migrate every document in memory (no writes yet).
const pending: Array<{ file: string; kind: DocKind; doc: Record<string, unknown> }> = [];
for (const [file, kind] of targets) {
  try {
    const doc = migrateDoc(file, kind);
    if (doc) pending.push({ file, kind, doc });
  } catch (e) {
    console.error(`✗ ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}

// Phase 2: Zod-check every migrated document against the current contract.
// Any failure aborts the whole run before a single byte is written.
const errors: string[] = [];
for (const { file, kind, doc } of pending) {
  try {
    parseWith(SCHEMAS[kind], doc, file);
  } catch (e) {
    errors.push(e instanceof ValidationFailure ? e.message : `${file}: ${e}`);
  }
}
if (errors.length > 0) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(
    `\nmigrate-data: ${errors.length} migrated document(s) failed validation — nothing was written`
  );
  process.exit(1);
}

// Phase 3: all documents passed — write them back.
for (const { file, doc } of pending) {
  writeJson(file, doc);
  console.log(`↑ migrated ${file}`);
}

console.log(
  pending.length === 0
    ? `✓ all data already at schemaVersion ${SCHEMA_VERSION}`
    : `✓ migrated ${pending.length} file(s) to schemaVersion ${SCHEMA_VERSION} — run \`npm run validate\``
);
