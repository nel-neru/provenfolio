import { test } from "node:test";
import assert from "node:assert/strict";
import { projectSource } from "../../schemas/index.js";

/** Minimal valid source of the given type, host under test via repoUrl. */
function source(type: "github" | "manual" | "local", repoUrl?: string) {
  return repoUrl === undefined ? { type } : { type, repoUrl };
}

test("github source with a github.com repoUrl is valid", () => {
  const parsed = projectSource.safeParse(
    source("github", "https://github.com/nel-neru/provenfolio")
  );
  assert.equal(parsed.success, true);
});

test("github source with a www.github.com repoUrl is valid", () => {
  const parsed = projectSource.safeParse(
    source("github", "https://www.github.com/nel-neru/provenfolio")
  );
  assert.equal(parsed.success, true);
});

test("github source host check is case-insensitive", () => {
  const parsed = projectSource.safeParse(
    source("github", "https://GitHub.com/nel-neru/provenfolio")
  );
  assert.equal(parsed.success, true);
});

test("github source with a non-github host is rejected with an actionable message", () => {
  const parsed = projectSource.safeParse(
    source("github", "https://evil.tld/nel-neru/provenfolio")
  );
  assert.equal(parsed.success, false);
  const messages = parsed.error!.issues.map((issue) => issue.message).join("\n");
  assert.match(messages, /github\.com/);
  assert.match(messages, /"evil\.tld"/);
  assert.match(messages, /type "manual"/);
});

test("github source with a lookalike subdomain host is rejected", () => {
  const parsed = projectSource.safeParse(
    source("github", "https://github.com.evil.tld/nel-neru/provenfolio")
  );
  assert.equal(parsed.success, false);
});

test("github source still requires repoUrl", () => {
  const parsed = projectSource.safeParse(source("github"));
  assert.equal(parsed.success, false);
  assert.match(parsed.error!.issues[0]!.message, /require repoUrl/);
});

test("github source with a malformed repoUrl fails z.url(), not the host check", () => {
  const parsed = projectSource.safeParse(source("github", "not-a-url"));
  assert.equal(parsed.success, false);
  const messages = parsed.error!.issues.map((issue) => issue.message).join("\n");
  assert.doesNotMatch(messages, /github sources require a github\.com repoUrl/);
});

test("manual source with a non-github repoUrl passes (no host constraint)", () => {
  const parsed = projectSource.safeParse(
    source("manual", "https://gitlab.example.com/team/repo")
  );
  assert.equal(parsed.success, true);
});

test("local source without repoUrl passes", () => {
  const parsed = projectSource.safeParse(source("local"));
  assert.equal(parsed.success, true);
});
