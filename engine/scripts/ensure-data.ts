/**
 * Non-destructive bootstrap: the distribution repo ships no data/, so a fresh
 * clone has nothing to validate or build against. This creates the blank seed
 * wherever files are missing — it never deletes and never overwrites, hence
 * no --confirm. Wired before validate/dev/build in package.json scripts.
 *
 * Usage: tsx engine/scripts/ensure-data.ts
 */
import { ensureDataDirs, writeSeedFiles } from "./lib/seed.js";

ensureDataDirs();
const created = writeSeedFiles({ overwrite: false });

if (created.length > 0) {
  console.log(
    `✓ bootstrapped blank data/ seed: ${created.join(", ")} — run /setup to make it yours`
  );
} else {
  console.log("✓ data/ present — nothing to bootstrap");
}
