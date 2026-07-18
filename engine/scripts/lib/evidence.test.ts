import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { evidenceFileProblem } from "./evidence.js";

let tmp: string;
let repoDir: string;

before(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "provenfolio-evidence-"));
  repoDir = path.join(tmp, "repo");
  fs.mkdirSync(path.join(repoDir, "src"), { recursive: true });
  fs.writeFileSync(path.join(repoDir, "src", "app.ts"), "export {};\n");
  // a real file OUTSIDE the repo: existence must not make it valid evidence
  fs.writeFileSync(path.join(tmp, "outside.md"), "not a receipt\n");
});

after(() => {
  fs.rmSync(tmp, { recursive: true, force: true });
});

test("a repo-relative file that exists is valid", () => {
  assert.equal(evidenceFileProblem(repoDir, "src/app.ts"), undefined);
});

test("a repo-relative path with internal .. that stays inside is valid", () => {
  assert.equal(evidenceFileProblem(repoDir, "src/../src/app.ts"), undefined);
});

test("a missing file is reported as nonexistent", () => {
  assert.match(
    evidenceFileProblem(repoDir, "src/nope.ts")!,
    /does not exist in the repo/
  );
});

test("claim D: a ../ escape is rejected even when the target exists", () => {
  assert.match(
    evidenceFileProblem(repoDir, "../outside.md")!,
    /resolves outside the repo directory/
  );
});

test("claim D: an absolute path is rejected", () => {
  assert.match(
    evidenceFileProblem(repoDir, path.join(tmp, "outside.md"))!,
    /must be a repo-relative path/
  );
});

test('"." (the repo root itself) is not a valid file receipt', () => {
  assert.match(
    evidenceFileProblem(repoDir, ".")!,
    /resolves outside the repo directory/
  );
});
