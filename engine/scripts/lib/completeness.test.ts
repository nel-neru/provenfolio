import { test } from "node:test";
import assert from "node:assert/strict";
import { computeCompleteness, type CompletenessInput } from "./completeness.js";

/** Localized text filled for each given locale. */
function text(langs: string[], value: string): Record<string, string> {
  return Object.fromEntries(langs.map((lang) => [lang, value]));
}

/**
 * A project that is complete in every non-translation dimension, with prose
 * present in exactly `langs`. Category "oss" (results not expected) and a
 * manual source (timeline not expected) keep the fixture minimal.
 */
function makeProject(langs: string[]): CompletenessInput["project"] {
  return {
    schemaVersion: 2,
    id: "fixture-project",
    name: "Fixture Project",
    category: "oss",
    status: "active",
    featured: false,
    placement: "lab",
    order: 0,
    sources: [{ type: "manual", visibility: "public", isFork: false }],
    role: { type: "solo" },
    summary: text(langs, "A summary."),
    caseStudy: {
      problem: text(langs, "The problem."),
      solution: text(langs, "The solution."),
    },
    highlights: [
      {
        text: text(langs, "Highlight one."),
        evidence: [{ kind: "commit", ref: "abc1234" }],
      },
      {
        text: text(langs, "Highlight two."),
        evidence: [{ kind: "commit", ref: "def5678" }],
      },
    ],
    techStack: [],
    timeline: [],
    links: [
      { label: text(langs, "Demo"), url: "https://example.com/", kind: "demo" },
    ],
    screenshots: [
      { src: "assets/screenshots/fixture/home.png", alt: text(langs, "Home") },
    ],
  };
}

function score(langs: string[], targetLangs: string[]) {
  return computeCompleteness({
    project: makeProject(langs),
    profile: { sourceLang: "en", targetLangs },
  });
}

test("zero target languages: no translation penalty, full score", () => {
  const result = score(["en"], []);
  assert.deepEqual(result.missing, []);
  assert.equal(result.score, 100);
});

test("single target language missing costs the full translation weight", () => {
  const result = score(["en"], ["ja"]);
  assert.deepEqual(result.missing, ["translation:ja"]);
  assert.equal(result.score, 85);
});

test("one of two target languages missing is prorated and rounded (7.5 -> 8)", () => {
  const result = score(["en", "ja"], ["ja", "de"]);
  assert.deepEqual(result.missing, ["translation:de"]);
  assert.equal(result.score, 92);
});

test("three-language config: one missing language costs a third of the weight", () => {
  const result = score(["en", "ja", "de"], ["ja", "de", "fr"]);
  assert.deepEqual(result.missing, ["translation:fr"]);
  assert.equal(result.score, 95);
});

test("three-language config: two missing languages cost two thirds", () => {
  const result = score(["en", "ja"], ["ja", "de", "fr"]);
  assert.deepEqual(result.missing, ["translation:de", "translation:fr"]);
  assert.equal(result.score, 90);
});

test("all target languages missing never exceeds the translation budget", () => {
  const result = score(["en"], ["ja", "de", "fr"]);
  assert.deepEqual(result.missing, [
    "translation:ja",
    "translation:de",
    "translation:fr",
  ]);
  // Capped at the single 15-point translation weight, not 15 per language.
  assert.equal(result.score, 85);
});

test("per-language translation entries stay in missing for Studio display", () => {
  const result = score(["en"], ["ja", "de"]);
  assert.ok(result.missing.includes("translation:ja"));
  assert.ok(result.missing.includes("translation:de"));
});

test("non-translation weights are unchanged", () => {
  const project = { ...makeProject(["en"]), role: undefined };
  const result = computeCompleteness({
    project,
    profile: { sourceLang: "en", targetLangs: [] },
  });
  assert.deepEqual(result.missing, ["role"]);
  assert.equal(result.score, 90);
});
