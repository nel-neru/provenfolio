/**
 * Prebuild: mirror data/assets → site/public/assets (screenshots, diagrams,
 * avatar). Plain recursive copy — no symlinks (Windows-safe, CI-safe).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.resolve(siteRoot, "..", "data", "assets");
const dest = path.resolve(siteRoot, "public", "assets");

fs.rmSync(dest, { recursive: true, force: true });
if (fs.existsSync(src)) {
  fs.cpSync(src, dest, { recursive: true });
  console.log(`✓ copied data/assets → site/public/assets`);
} else {
  console.log("· no data/assets to copy");
}
