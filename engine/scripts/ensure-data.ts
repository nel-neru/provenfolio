/**
 * Non-destructive bootstrap: the distribution repo ships no data/, so a fresh
 * clone has nothing to validate or build against. On a truly fresh clone
 * (none of the seed files exist) this creates the blank seed. If only SOME
 * files are missing, that is data loss on a live instance — masking it with
 * placeholders would let automation commit/deploy "Your Name" over a real
 * portfolio, so we fail loudly instead. Wired before validate/dev/build in
 * package.json scripts.
 *
 * Usage: tsx engine/scripts/ensure-data.ts
 */
import fs from "node:fs";
import path from "node:path";
import { PROFILE_FILE, MANIFEST_FILE, AGGREGATES_FILE, ROOT } from "./lib/paths.js";
import { ensureDataDirs, writeSeedFiles } from "./lib/seed.js";

const seedFiles = [PROFILE_FILE, MANIFEST_FILE, AGGREGATES_FILE];
const missing = seedFiles.filter((f) => !fs.existsSync(f));
const rel = (f: string) => path.relative(ROOT, f);

if (missing.length === seedFiles.length) {
  // fresh data-less clone — build the blank seed
  ensureDataDirs();
  const created = writeSeedFiles({ overwrite: false });
  console.log(
    `✓ bootstrapped blank data/ seed: ${created.join(", ")} — run /setup to make it yours`
  );
} else if (missing.length > 0) {
  // partial loss on a live instance — never paper over it with placeholders
  console.error(
    `✗ data/ is partially missing: ${missing.map(rel).join(", ")}\n` +
      "  This looks like accidental deletion on a live instance, so nothing was overwritten.\n" +
      `  - ${rel(AGGREGATES_FILE)} only: regenerate with \`npm run aggregate\`\n` +
      "  - profile/manifest: restore from your instance repo history (git checkout -- data/)\n" +
      "  - true fresh start: tsx engine/scripts/reset-data.ts --confirm (DELETES all instance data)"
  );
  process.exit(1);
} else {
  ensureDataDirs();
  console.log("✓ data/ present — nothing to bootstrap");
}
