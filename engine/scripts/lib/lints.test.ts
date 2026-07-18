import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildAllowedNumbers,
  lintNumbers,
  lintBannedPhrases,
} from "./lints.js";
import type { ProjectMetrics } from "../../schemas/index.js";

const emptyProse = {
  verifiedNumbers: [],
  techStack: [],
  timeline: [],
};

/** Realistic metrics block matching what emit re-injects from stats.json. */
const metrics: ProjectMetrics = {
  total: {
    commits: 12151,
    activeDays: 41,
    firstCommit: "2025-11-02T09:14:00Z",
    lastCommit: "2026-06-30T18:45:00Z",
    durationDays: 240.4,
    velocity: {
      commitsPerActiveDay: 3.5,
      peakDay: { date: "2026-03-15", count: 17 },
    },
    commitsByDay: [
      { date: "2026-03-15", count: 17 },
      { date: "2026-03-16", count: 9 },
    ],
    commitTypes: { feat: 80, fix: 41 },
  },
  ownerCommitPct: 100,
  languages: [{ name: "TypeScript", pct: 96.2 }],
  prCount: 8,
  stars: 132,
  conventionalCommitPct: 99.4,
};

function lint(text: string, allowed: Set<number>) {
  return lintNumbers({ field: text }, allowed);
}

// ---- tokenizer: thousands grouping ----

test("comma-grouped numbers are read as one integer, not a decimal", () => {
  const allowed = buildAllowedNumbers({
    metrics,
    intake: undefined,
    prose: emptyProse,
    projectName: "sample",
  });
  // metrics.total.commits = 12151; prose writes it grouped
  assert.deepEqual(lint("12,151 commits over eight months", allowed), []);
  // regression guard: the old tokenizer produced 12.151 here
  assert.ok(!allowed.has(12.151));
});

test("multi-group thousands separators collapse to a single number", () => {
  const allowed = new Set([1234567]);
  assert.deepEqual(lint("processed 1,234,567 rows", allowed), []);
});

test("grouped number with a decimal part keeps its fraction", () => {
  const allowed = new Set([1234.5]);
  assert.deepEqual(lint("about 1,234.5 requests", allowed), []);
});

test("a grouped number NOT in the allow-list is a single error token", () => {
  const errors = lint("12,151 commits", new Set([99]));
  assert.equal(errors.length, 1);
  assert.match(errors[0]!.message, /number 12151 /);
});

// ---- tokenizer: decimals, percent, versions ----

test("plain decimals are matched as-is", () => {
  const allowed = buildAllowedNumbers({
    metrics,
    intake: undefined,
    prose: emptyProse,
    projectName: "sample",
  });
  // velocity.commitsPerActiveDay = 3.5, durationDays = 240.4
  assert.deepEqual(lint("3.5 commits per active day, 240.4 days", allowed), []);
});

test("percentages are checked on their numeric part", () => {
  const allowed = buildAllowedNumbers({
    metrics,
    intake: undefined,
    prose: emptyProse,
    projectName: "sample",
  });
  // ownerCommitPct = 100, conventionalCommitPct = 99.4, languages[0].pct = 96.2
  assert.deepEqual(
    lint("100% solo, 99.4% conventional commits, 96.2% TypeScript", allowed),
    []
  );
  assert.equal(lint("claims 87% coverage", allowed).length, 1);
});

test("version fragments like v2.0 match a bare major version", () => {
  const allowed = buildAllowedNumbers({
    metrics: undefined,
    intake: undefined,
    prose: { ...emptyProse, techStack: [{ name: "Tauri v2", category: "framework" }] },
    projectName: "sample",
  });
  // "v2.0" tokenizes to 2.0 === 2, permitted by "Tauri v2"
  assert.deepEqual(lint("migrated to Tauri v2.0", allowed), []);
});

test("multi-dot versions stay symmetric between prose and allow-list", () => {
  const allowed = buildAllowedNumbers({
    metrics: undefined,
    intake: undefined,
    prose: {
      ...emptyProse,
      verifiedNumbers: [{ value: "v2.0.1", evidence: [{ kind: "release", ref: "v2.0.1" }] }],
    },
    projectName: "sample",
  });
  assert.deepEqual(lint("shipped in v2.0.1", allowed), []);
});

test("text without digits produces no errors", () => {
  assert.deepEqual(lint("no numbers here at all", new Set()), []);
});

// ---- allow-list sources (mirrors what emit passes) ----

test("intake outcome numbers pass regardless of grouping style", () => {
  const allowed = buildAllowedNumbers({
    metrics: undefined,
    intake: {
      outcomes: [
        { label: "monthly users", value: "1,200", source: "Cloudflare Analytics 2026-06" },
      ],
    },
    prose: emptyProse,
    projectName: "sample",
  });
  // grouped in intake, bare in prose — both tokenize to 1200
  assert.deepEqual(lint("serves 1200 monthly users", allowed), []);
  assert.deepEqual(lint("serves 1,200 monthly users", allowed), []);
});

test("verifiedNumbers values are permitted", () => {
  const allowed = buildAllowedNumbers({
    metrics: undefined,
    intake: undefined,
    prose: {
      ...emptyProse,
      verifiedNumbers: [
        { value: "7 MCP tools", evidence: [{ kind: "file", ref: "mcp-server/index.js" }] },
      ],
    },
    projectName: "sample",
  });
  assert.deepEqual(lint("exposes 7 MCP tools", allowed), []);
});

test("metric dates contribute their year/month/day components", () => {
  const allowed = buildAllowedNumbers({
    metrics,
    intake: undefined,
    prose: emptyProse,
    projectName: "sample",
  });
  // peakDay.date = 2026-03-15
  assert.deepEqual(lint("peaked on March 15, 2026", allowed), []);
});

test("timeline event dates and project-name digits are permitted", () => {
  const allowed = buildAllowedNumbers({
    metrics: undefined,
    intake: undefined,
    prose: {
      ...emptyProse,
      timeline: [
        { date: "2025-11-02", title: {}, evidence: [] },
      ],
    },
    projectName: "portfolio-2026",
  });
  assert.deepEqual(lint("started 2025-11-02, renamed for 2026", allowed), []);
});

test("unsourced numbers are reported per field with the parsed value", () => {
  const errors = lintNumbers(
    { "caseStudy.results.en": "grew 300% in 6 weeks" },
    new Set([6])
  );
  assert.equal(errors.length, 1);
  assert.equal(errors[0]!.field, "caseStudy.results.en");
  assert.match(errors[0]!.message, /number 300 /);
});

// ---- banned phrases (unchanged behavior, kept under test) ----

test("banned puffery phrases are flagged case-insensitively", () => {
  const errors = lintBannedPhrases({
    "summary.en": "A Battle-Tested toolkit",
    "summary.ja": "OK text",
  });
  assert.equal(errors.length, 1);
  assert.equal(errors[0]!.field, "summary.en");
  assert.match(errors[0]!.message, /battle-tested/);
});
