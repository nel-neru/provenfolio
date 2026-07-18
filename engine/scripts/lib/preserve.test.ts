import { test } from "node:test";
import assert from "node:assert/strict";
import { sha256, hashProseFields } from "./hash.js";
import {
  preserveHumanEdits,
  keepOrphanedEntries,
  buildContentHashes,
  hashStableProseFields,
  highlightKeys,
  type ProseDoc,
} from "./preserve.js";

const SL = "en";

function agentDoc(): ProseDoc {
  return structuredClone({
    summary: { en: "agent summary", ja: "agent summary (ja)" },
    caseStudy: {
      problem: { en: "agent problem" },
      solution: { en: "agent solution" },
    },
    highlights: [
      { text: { en: "H0 agent" }, evidence: [{ kind: "commit", ref: "aaa" }] },
      { text: { en: "H1 agent" }, evidence: [{ kind: "commit", ref: "bbb" }] },
      { text: { en: "H2 agent" }, evidence: [{ kind: "commit", ref: "ccc" }] },
    ],
    timeline: [
      {
        date: "2026-01-01",
        title: { en: "T0 agent" },
        description: { en: "D0 agent" },
        evidence: [{ kind: "pr", ref: "#1" }],
      },
    ],
  });
}

/** Mirror of emit.ts: protect, then compute the file's contentHashes. */
function emitPass(
  existing: ProseDoc & { contentHashes: Record<string, string> },
  fresh: ProseDoc,
  opts: {
    acceptRegenerated?: ReadonlySet<string>;
    acceptAllRegenerated?: boolean;
    keepOrphans?: boolean;
  } = {}
) {
  const candidate = structuredClone(fresh);
  const res = preserveHumanEdits({
    existing,
    candidate,
    contentHashes: existing.contentHashes,
    sourceLang: SL,
    acceptRegenerated: opts.acceptRegenerated,
    acceptAllRegenerated: opts.acceptAllRegenerated,
  });
  const baselines = { ...res.baselineHashes };
  if (opts.keepOrphans && res.orphanedEdits.length > 0) {
    Object.assign(
      baselines,
      keepOrphanedEntries({
        existing,
        candidate,
        orphanedEdits: res.orphanedEdits,
      })
    );
  }
  return {
    res,
    candidate,
    contentHashes: buildContentHashes(candidate, SL, baselines),
  };
}

test("claim A: same-length reorder keeps owner text paired with its evidence", () => {
  const base = agentDoc();
  const existing = {
    ...structuredClone(base),
    contentHashes: hashStableProseFields(base, SL),
  };
  existing.highlights[2]!.text[SL] = "OWNER EDIT on H2 (evidence ccc)";

  const fresh = agentDoc();
  fresh.highlights = [
    fresh.highlights[2]!,
    fresh.highlights[1]!,
    fresh.highlights[0]!,
  ];

  const { res, candidate } = emitPass(existing, fresh);
  assert.equal(res.orphanedEdits.length, 0);
  assert.equal(res.preservedPaths.length, 1);
  // owner text lands on the entry that still carries evidence "ccc" (index 0
  // after the reorder), never on whatever now sits at the old index
  assert.equal(candidate.highlights[0]!.text[SL], "OWNER EDIT on H2 (evidence ccc)");
  assert.equal(candidate.highlights[0]!.evidence[0]!.ref, "ccc");
  assert.equal(candidate.highlights[2]!.text[SL], "H0 agent");
});

test("claim A: human-edited entry missing from the draft is orphaned, not silently dropped or counted as preserved", () => {
  const base = agentDoc();
  const existing = {
    ...structuredClone(base),
    contentHashes: hashStableProseFields(base, SL),
  };
  existing.highlights[2]!.text[SL] = "OWNER EDIT on H2";

  const fresh = agentDoc();
  fresh.highlights = [fresh.highlights[0]!, fresh.highlights[1]!]; // H2 gone

  const { res, candidate } = emitPass(existing, fresh);
  assert.equal(res.preservedPaths.length, 0); // no false "preserved" report
  assert.equal(res.orphanedEdits.length, 1);
  assert.match(res.orphanedEdits[0]!.path, /^highlights\{[0-9a-f]{12}\}\.text\.en$/);
  assert.equal(res.orphanedEdits[0]!.value, "OWNER EDIT on H2");
  // the caller (emit) must decide; nothing was merged into the wrong entry
  assert.ok(!JSON.stringify(candidate).includes("OWNER EDIT"));
});

test("claim B: protection persists across repeated re-analyses (baseline carry-over)", () => {
  const base = agentDoc();
  const existing1 = {
    ...structuredClone(base),
    contentHashes: hashStableProseFields(base, SL),
  };
  existing1.summary[SL] = "OWNER SUMMARY";

  // 1st re-analysis: agent regenerates identical prose
  const pass1 = emitPass(existing1, agentDoc());
  assert.equal(pass1.candidate.summary[SL], "OWNER SUMMARY");
  // the baseline stays the AGENT hash — NOT rebaselined to the owner's text
  assert.equal(pass1.contentHashes["summary.en"], sha256("agent summary"));

  // 2nd re-analysis: agent produces brand-new text
  const fresh2 = agentDoc();
  fresh2.summary[SL] = "agent summary v2";
  const pass2 = emitPass(
    { ...pass1.candidate, contentHashes: pass1.contentHashes },
    fresh2
  );
  assert.equal(pass2.candidate.summary[SL], "OWNER SUMMARY"); // still protected
  assert.equal(pass2.contentHashes["summary.en"], sha256("agent summary"));

  // untouched fields follow the agent normally
  assert.equal(pass2.candidate.caseStudy.problem[SL], "agent problem");
});

test("legacy index-based contentHashes are honored and rewritten as stable keys", () => {
  const base = agentDoc();
  const existing = {
    ...structuredClone(base),
    contentHashes: hashProseFields(base), // old format: highlights[i].text.en
  };
  existing.highlights[1]!.text[SL] = "OWNER EDIT on H1";

  const fresh = agentDoc();
  fresh.highlights = [fresh.highlights[1]!, fresh.highlights[0]!]; // reorder

  const { res, candidate, contentHashes } = emitPass(existing, fresh);
  assert.equal(res.usedLegacyKeys, true);
  assert.equal(res.preservedPaths.length, 1);
  assert.equal(candidate.highlights[0]!.text[SL], "OWNER EDIT on H1");
  assert.equal(candidate.highlights[0]!.evidence[0]!.ref, "bbb");
  // rewritten format: no index keys remain, baseline carried under stable key
  assert.ok(Object.keys(contentHashes).every((k) => !k.includes("[")));
  assert.equal(contentHashes[res.preservedPaths[0]!], sha256("H1 agent"));
});

test("keepOrphanedEntries re-appends the edited entry (text + evidence) and keeps it protected", () => {
  const base = agentDoc();
  const existing = {
    ...structuredClone(base),
    contentHashes: hashStableProseFields(base, SL),
  };
  existing.highlights[2]!.text[SL] = "OWNER EDIT on H2";

  const fresh = agentDoc();
  fresh.highlights = [fresh.highlights[0]!, fresh.highlights[1]!];

  const pass1 = emitPass(existing, fresh, { keepOrphans: true });
  const appended = pass1.candidate.highlights[2]!;
  assert.equal(appended.text[SL], "OWNER EDIT on H2");
  assert.equal(appended.evidence[0]!.ref, "ccc");
  // baseline is still the agent hash, so a later pass protects it again
  const fresh2 = agentDoc(); // H2 is back, regenerated
  const pass2 = emitPass(
    { ...pass1.candidate, contentHashes: pass1.contentHashes },
    fresh2
  );
  const h2 = pass2.candidate.highlights.find(
    (h) => h.evidence[0]!.ref === "ccc"
  );
  assert.equal(h2!.text[SL], "OWNER EDIT on H2");
});

test("--accept-regenerated releases only the named field and rebaselines it", () => {
  const base = agentDoc();
  const existing = {
    ...structuredClone(base),
    contentHashes: hashStableProseFields(base, SL),
  };
  existing.summary[SL] = "OWNER SUMMARY";
  existing.highlights[0]!.text[SL] = "OWNER H0";

  const fresh = agentDoc();
  fresh.summary[SL] = "agent summary v2";
  const { candidate, contentHashes } = emitPass(existing, fresh, {
    acceptRegenerated: new Set(["summary"]), // base path, lang-agnostic
  });
  assert.equal(candidate.summary[SL], "agent summary v2"); // accepted
  assert.equal(contentHashes["summary.en"], sha256("agent summary v2")); // rebaselined
  assert.equal(candidate.highlights[0]!.text[SL], "OWNER H0"); // still protected
});

test("--accept-regenerated all disables preservation entirely", () => {
  const base = agentDoc();
  const existing = {
    ...structuredClone(base),
    contentHashes: hashStableProseFields(base, SL),
  };
  existing.summary[SL] = "OWNER SUMMARY";
  const { res, candidate } = emitPass(existing, agentDoc(), {
    acceptAllRegenerated: true,
  });
  assert.equal(res.preservedPaths.length, 0);
  assert.equal(candidate.summary[SL], "agent summary");
});

test("timeline events match on date + evidence; a changed event is orphaned, not transplanted", () => {
  const base = agentDoc();
  const existing = {
    ...structuredClone(base),
    contentHashes: hashStableProseFields(base, SL),
  };
  existing.timeline[0]!.description![SL] = "OWNER D0";

  // draft inserts a new event before the edited one
  const freshKeep = agentDoc();
  freshKeep.timeline.unshift({
    date: "2025-12-01",
    title: { en: "new event" },
    evidence: [{ kind: "commit", ref: "ddd" }],
  });
  const kept = emitPass(existing, freshKeep);
  assert.equal(kept.candidate.timeline[1]!.description![SL], "OWNER D0");
  assert.equal(kept.candidate.timeline[0]!.title[SL], "new event");

  // draft moves the event to a different date -> identity lost -> orphan
  const freshMoved = agentDoc();
  freshMoved.timeline[0]!.date = "2026-02-02";
  const moved = emitPass(existing, freshMoved);
  assert.equal(moved.res.orphanedEdits.length, 1);
  assert.equal(moved.res.orphanedEdits[0]!.entryKind, "timeline");
  assert.equal(moved.candidate.timeline[0]!.description![SL], "D0 agent");
});

test("duplicate evidence signatures get distinct deterministic keys", () => {
  const doc = agentDoc();
  doc.highlights.push(structuredClone(doc.highlights[0]!)); // same evidence as H0
  const keys = highlightKeys(doc, SL);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(keys[3], `${keys[0]}~2`);
});
