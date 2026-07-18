/**
 * Apply data-contract migrations to everything in data/. Safe to run
 * repeatedly. Buyers run this after pulling an engine update whose
 * SCHEMA_VERSION is newer than their data.
 */
import { SCHEMA_VERSION } from "../schemas/index.js";
import {
  PROFILE_FILE,
  MANIFEST_FILE,
  AGGREGATES_FILE,
  PROJECTS_DIR,
  INTAKE_DIR,
} from "./lib/paths.js";
import { readJson, writeJson, listJsonFiles } from "./lib/io.js";
import fs from "node:fs";

type DocKind = "profile" | "manifest" | "aggregates" | "project" | "intake";
type Migration = (doc: Record<string, unknown>, kind: DocKind) => Record<string, unknown>;

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

function migrateFile(file: string, kind: DocKind): boolean {
  const doc = readJson(file) as Record<string, unknown>;
  let version = typeof doc.schemaVersion === "number" ? doc.schemaVersion : 1;
  if (version >= SCHEMA_VERSION) return false;

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
  writeJson(file, current);
  return true;
}

let migrated = 0;
const targets: Array<[string, DocKind]> = [];
if (fs.existsSync(PROFILE_FILE)) targets.push([PROFILE_FILE, "profile"]);
if (fs.existsSync(MANIFEST_FILE)) targets.push([MANIFEST_FILE, "manifest"]);
if (fs.existsSync(AGGREGATES_FILE)) targets.push([AGGREGATES_FILE, "aggregates"]);
for (const f of listJsonFiles(PROJECTS_DIR)) targets.push([f, "project"]);
for (const f of listJsonFiles(INTAKE_DIR)) targets.push([f, "intake"]);

for (const [file, kind] of targets) {
  if (migrateFile(file, kind)) {
    migrated += 1;
    console.log(`↑ migrated ${file}`);
  }
}

console.log(
  migrated === 0
    ? `✓ all data already at schemaVersion ${SCHEMA_VERSION}`
    : `✓ migrated ${migrated} file(s) to schemaVersion ${SCHEMA_VERSION} — run \`npm run validate\``
);
