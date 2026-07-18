import { test } from "node:test";
import assert from "node:assert/strict";
import { applyTechStackCorrections } from "./tech-stack.js";
import { buildAllowedNumbers } from "./lints.js";

const analyzerStack = [
  { name: "OldLib 7", category: "framework" as const },
  { name: "TypeScript", category: "language" as const },
];

test("owner corrections are applied case-insensitively without duplicates", () => {
  const corrected = applyTechStackCorrections(analyzerStack, {
    add: ["Vue 3", "typescript"],
    remove: ["oldlib 7"],
  });
  assert.deepEqual(
    corrected.map((t) => t.name),
    ["TypeScript", "Vue 3"]
  );
  assert.equal(corrected.find((t) => t.name === "Vue 3")!.category, "other");
});

test("no corrections returns a copy of the analyzer proposal", () => {
  const corrected = applyTechStackCorrections(analyzerStack, undefined);
  assert.deepEqual(corrected, analyzerStack);
  assert.notEqual(corrected, analyzerStack);
});

test("claim C: the numeric allow-list is built from the CORRECTED stack", () => {
  const corrected = applyTechStackCorrections(analyzerStack, {
    add: ["Vue 3"],
    remove: ["OldLib 7"],
  });
  // emit passes candidate.techStack (= corrected), never the raw proposal
  const allowed = buildAllowedNumbers({
    metrics: undefined,
    intake: undefined,
    prose: { verifiedNumbers: [], techStack: corrected, timeline: [] },
    projectName: "sample-project",
  });
  assert.ok(allowed.has(3)); // owner-added "Vue 3" permits 3
  assert.ok(!allowed.has(7)); // removed "OldLib 7" no longer permits 7
});
