import path from "node:path";
import { fileURLToPath } from "node:url";

/** Repo root, resolved from this file's location (works from any cwd). */
export const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  ".."
);

export const DATA_DIR = path.join(ROOT, "data");
export const PROJECTS_DIR = path.join(DATA_DIR, "projects");
export const INTAKE_DIR = path.join(DATA_DIR, "intake");
export const ACTIVITIES_DIR = path.join(DATA_DIR, "activities");
export const DERIVED_DIR = path.join(DATA_DIR, "derived");
export const ASSETS_DIR = path.join(DATA_DIR, "assets");
export const WORKSPACE_DIR = path.join(ROOT, "workspace");

export const PROFILE_FILE = path.join(DATA_DIR, "profile.json");
export const MANIFEST_FILE = path.join(DATA_DIR, "manifest.json");
export const AGGREGATES_FILE = path.join(DERIVED_DIR, "aggregates.json");

/** workspace/<projectId>/ — clone, stats.json, findings/, prose.json */
export function projectWorkspace(projectId: string): string {
  return path.join(WORKSPACE_DIR, projectId);
}

export function projectFile(projectId: string): string {
  return path.join(PROJECTS_DIR, `${projectId}.json`);
}

export function intakeFile(projectId: string): string {
  return path.join(INTAKE_DIR, `${projectId}.json`);
}
