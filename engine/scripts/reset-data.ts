/**
 * New-owner reset — used by /setup. Wipes the previous owner's instance data
 * and writes a blank-slate profile the interview then fills in.
 *
 * Usage: tsx engine/scripts/reset-data.ts --confirm
 * (The flag is mandatory: this deletes data/. /setup passes it after the
 * user explicitly agrees.)
 */
import fs from "node:fs";
import {
  PROJECTS_DIR,
  INTAKE_DIR,
  ACTIVITIES_DIR,
  DERIVED_DIR,
  ASSETS_DIR,
  WORKSPACE_DIR,
} from "./lib/paths.js";
import { ensureDataDirs, writeSeedFiles } from "./lib/seed.js";

if (!process.argv.includes("--confirm")) {
  console.error(
    "reset-data deletes everything in data/ (projects, intake, assets, profile).\n" +
      "Run with --confirm only after the owner explicitly agreed (normally via /setup)."
  );
  process.exit(2);
}

for (const dir of [PROJECTS_DIR, INTAKE_DIR, ACTIVITIES_DIR, DERIVED_DIR, ASSETS_DIR]) {
  fs.rmSync(dir, { recursive: true, force: true });
}
fs.rmSync(WORKSPACE_DIR, { recursive: true, force: true });
ensureDataDirs();
writeSeedFiles({ overwrite: true });

console.log(
  "✓ data/ reset for a new owner — run /setup to fill the profile, then /analyze your first repo"
);
