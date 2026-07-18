import { sha256 } from "./hash.js";

/**
 * Human-edit preservation for emit.ts, extracted as pure functions so the
 * behavior is unit-testable without running the full pipeline.
 *
 * Invariant (DATA-CONTRACT): `generated.contentHashes` maps a STABLE field
 * path to the SHA-256 of the last AGENT-generated text for that field — the
 * baseline. A field whose current value differs from its baseline was edited
 * by the owner ("human-owned") and the pipeline must never overwrite it
 * silently. On re-emit:
 *   - the owner's text is kept and the regenerated text discarded, and
 *   - the baseline hash is carried forward unchanged, so the mismatch (and
 *     therefore the protection) persists across ANY number of re-analyses.
 *
 * Array entries (highlights/timeline) are matched by a stable key derived
 * from their evidence refs (falling back to the source-lang text), never by
 * array index: reordering or trimming the regenerated draft cannot transplant
 * an owner's sentence onto an entry with different evidence. A human-edited
 * entry with no key match in the regenerated draft is reported as "orphaned";
 * the caller decides (emit aborts by default, or honors
 * --keep-orphaned-edits / --drop-orphaned-edits).
 *
 * Legacy index-based keys ("highlights[0].text.en") written by earlier engine
 * versions are read transparently and rewritten in the stable format on the
 * next emit — no data migration required.
 */

export type LocalizedRecord = Record<string, string>;

export interface EvidenceLike {
  kind: string;
  ref: string;
}

export interface HighlightLike {
  text: LocalizedRecord;
  evidence: EvidenceLike[];
}

export interface TimelineLike {
  date: string;
  title: LocalizedRecord;
  description?: LocalizedRecord;
  evidence?: EvidenceLike[];
}

/** The prose surface shared by Project (data/) and the emit candidate. */
export interface ProseDoc {
  summary: LocalizedRecord;
  caseStudy: {
    problem: LocalizedRecord;
    solution: LocalizedRecord;
    results?: LocalizedRecord;
  };
  highlights: HighlightLike[];
  timeline: TimelineLike[];
}

const KEY_LENGTH = 12;

function evidenceSignature(
  evidence: EvidenceLike[] | undefined
): string | undefined {
  if (!evidence || evidence.length === 0) return undefined;
  return evidence
    .map((e) => `${e.kind}:${e.ref}`)
    .sort()
    .join("\x1f");
}

function sourceText(
  localized: LocalizedRecord | undefined,
  sourceLang: string
): string {
  if (!localized) return "";
  return localized[sourceLang] ?? Object.values(localized)[0] ?? "";
}

/** Stable identity of a highlight: its evidence refs (text as fallback). */
export function highlightKey(h: HighlightLike, sourceLang: string): string {
  const seed =
    evidenceSignature(h.evidence) ?? `text\x1f${sourceText(h.text, sourceLang)}`;
  return sha256(seed).slice(0, KEY_LENGTH);
}

/** Stable identity of a timeline event: date + evidence refs (title fallback). */
export function timelineKey(t: TimelineLike, sourceLang: string): string {
  const seed = `${t.date}\x1f${
    evidenceSignature(t.evidence) ?? `text\x1f${sourceText(t.title, sourceLang)}`
  }`;
  return sha256(seed).slice(0, KEY_LENGTH);
}

/** Disambiguate duplicate keys deterministically: "k", "k~2", "k~3", ... */
function dedupe(keys: string[]): string[] {
  const seen = new Map<string, number>();
  return keys.map((k) => {
    const n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    return n === 1 ? k : `${k}~${n}`;
  });
}

export function highlightKeys(doc: ProseDoc, sourceLang: string): string[] {
  return dedupe(doc.highlights.map((h) => highlightKey(h, sourceLang)));
}

export function timelineKeys(doc: ProseDoc, sourceLang: string): string[] {
  return dedupe(doc.timeline.map((t) => timelineKey(t, sourceLang)));
}

/**
 * Flatten a doc's prose fields into { "<stablePath>": "<value>" } using
 * stable-key paths, e.g. "summary.en", "highlights{ab12cd34ef56}.text.en".
 */
export function stableProseFieldPaths(
  doc: ProseDoc,
  sourceLang: string
): Record<string, string> {
  const fields: Record<string, string> = {};
  const add = (base: string, localized: LocalizedRecord | undefined) => {
    if (!localized) return;
    for (const [lang, value] of Object.entries(localized)) {
      fields[`${base}.${lang}`] = value;
    }
  };
  add("summary", doc.summary);
  add("caseStudy.problem", doc.caseStudy.problem);
  add("caseStudy.solution", doc.caseStudy.solution);
  add("caseStudy.results", doc.caseStudy.results);
  const hk = highlightKeys(doc, sourceLang);
  doc.highlights.forEach((h, i) => add(`highlights{${hk[i]}}.text`, h.text));
  const tk = timelineKeys(doc, sourceLang);
  doc.timeline.forEach((t, i) => {
    add(`timeline{${tk[i]}}.title`, t.title);
    add(`timeline{${tk[i]}}.description`, t.description);
  });
  return fields;
}

/** Hash every prose field value under its stable path. */
export function hashStableProseFields(
  doc: ProseDoc,
  sourceLang: string
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(stableProseFieldPaths(doc, sourceLang)).map(
      ([fieldPath, value]) => [fieldPath, sha256(value)]
    )
  );
}

export interface OrphanedEdit {
  /** Stable field path, e.g. "highlights{ab12cd34ef56}.text.en" */
  path: string;
  /** The owner's text that has no matching entry in the regenerated draft */
  value: string;
  /** Agent-baseline hash recorded for this field */
  recordedHash: string;
  entryKind: "highlight" | "timeline";
  /** Index of the entry in the EXISTING doc's array */
  existingIndex: number;
}

export interface PreserveResult {
  /** Stable paths whose owner text was actually written into the candidate */
  preservedPaths: string[];
  /** Human-edited fields whose entry vanished from the regenerated draft */
  orphanedEdits: OrphanedEdit[];
  /** stablePath -> agent-baseline hash to carry into the new contentHashes */
  baselineHashes: Record<string, string>;
  /** True when any recorded hash was found under a legacy index-based key */
  usedLegacyKeys: boolean;
}

const LANG_SUFFIX = /\.[a-z]{2}(?:-[A-Z]{2})?$/;

/**
 * Apply human-edit protection: for every field of `existing` whose current
 * value differs from its recorded baseline hash, write the owner's text into
 * `candidate` (mutated in place) at the entry with the same stable key.
 * Never matches array entries by index.
 */
export function preserveHumanEdits(opts: {
  existing: ProseDoc;
  candidate: ProseDoc;
  contentHashes: Record<string, string>;
  sourceLang: string;
  /** Field paths (with or without lang suffix) to rebaseline instead of preserving */
  acceptRegenerated?: ReadonlySet<string>;
  /** Rebaseline everything: no preservation at all */
  acceptAllRegenerated?: boolean;
}): PreserveResult {
  const { existing, candidate, contentHashes, sourceLang } = opts;
  const result: PreserveResult = {
    preservedPaths: [],
    orphanedEdits: [],
    baselineHashes: {},
    usedLegacyKeys: false,
  };
  if (opts.acceptAllRegenerated) return result;

  const candidateHighlight = new Map<string, number>();
  highlightKeys(candidate, sourceLang).forEach((k, i) =>
    candidateHighlight.set(k, i)
  );
  const candidateTimeline = new Map<string, number>();
  timelineKeys(candidate, sourceLang).forEach((k, i) =>
    candidateTimeline.set(k, i)
  );

  interface FieldRef {
    stablePath: string;
    legacyPath: string;
    lang: string;
    value: string;
    /** Localized record in candidate to write into; undefined = entry vanished */
    target: () => LocalizedRecord | undefined;
    entry?: { kind: "highlight" | "timeline"; index: number };
  }
  const refs: FieldRef[] = [];
  const push = (
    stableBase: string,
    legacyBase: string,
    localized: LocalizedRecord | undefined,
    target: () => LocalizedRecord | undefined,
    entry?: { kind: "highlight" | "timeline"; index: number }
  ) => {
    if (!localized) return;
    for (const [lang, value] of Object.entries(localized)) {
      refs.push({
        stablePath: `${stableBase}.${lang}`,
        legacyPath: `${legacyBase}.${lang}`,
        lang,
        value,
        target,
        entry,
      });
    }
  };

  push("summary", "summary", existing.summary, () => candidate.summary);
  push(
    "caseStudy.problem",
    "caseStudy.problem",
    existing.caseStudy.problem,
    () => candidate.caseStudy.problem
  );
  push(
    "caseStudy.solution",
    "caseStudy.solution",
    existing.caseStudy.solution,
    () => candidate.caseStudy.solution
  );
  push(
    "caseStudy.results",
    "caseStudy.results",
    existing.caseStudy.results,
    () => (candidate.caseStudy.results ??= {})
  );
  const hk = highlightKeys(existing, sourceLang);
  existing.highlights.forEach((h, i) => {
    push(
      `highlights{${hk[i]}}.text`,
      `highlights[${i}].text`,
      h.text,
      () => {
        const ci = candidateHighlight.get(hk[i]!);
        return ci === undefined ? undefined : candidate.highlights[ci]!.text;
      },
      { kind: "highlight", index: i }
    );
  });
  const tk = timelineKeys(existing, sourceLang);
  existing.timeline.forEach((t, i) => {
    const candidateIndex = () => candidateTimeline.get(tk[i]!);
    push(
      `timeline{${tk[i]}}.title`,
      `timeline[${i}].title`,
      t.title,
      () => {
        const ci = candidateIndex();
        return ci === undefined ? undefined : candidate.timeline[ci]!.title;
      },
      { kind: "timeline", index: i }
    );
    push(
      `timeline{${tk[i]}}.description`,
      `timeline[${i}].description`,
      t.description,
      () => {
        const ci = candidateIndex();
        if (ci === undefined) return undefined;
        return (candidate.timeline[ci]!.description ??= {});
      },
      { kind: "timeline", index: i }
    );
  });

  for (const ref of refs) {
    let recorded = contentHashes[ref.stablePath];
    if (recorded === undefined && contentHashes[ref.legacyPath] !== undefined) {
      recorded = contentHashes[ref.legacyPath];
      result.usedLegacyKeys = true;
    }
    if (recorded === undefined) continue;
    if (sha256(ref.value) === recorded) continue; // still the agent's text
    if (
      opts.acceptRegenerated?.has(ref.stablePath) ||
      opts.acceptRegenerated?.has(ref.stablePath.replace(LANG_SUFFIX, ""))
    ) {
      continue; // owner explicitly accepts the regenerated text
    }
    const target = ref.target();
    if (target === undefined) {
      result.orphanedEdits.push({
        path: ref.stablePath,
        value: ref.value,
        recordedHash: recorded,
        entryKind: ref.entry!.kind,
        existingIndex: ref.entry!.index,
      });
      continue;
    }
    target[ref.lang] = ref.value;
    result.preservedPaths.push(ref.stablePath);
    result.baselineHashes[ref.stablePath] = recorded;
  }
  return result;
}

/**
 * --keep-orphaned-edits: append the owner's edited entries (text + evidence,
 * exactly as stored in the existing file) to the regenerated draft, keeping
 * their protection baselines. Mutates `candidate`; returns the extra baseline
 * hashes to merge into the new contentHashes.
 */
export function keepOrphanedEntries(opts: {
  existing: ProseDoc;
  candidate: ProseDoc;
  orphanedEdits: OrphanedEdit[];
}): Record<string, string> {
  const { existing, candidate } = opts;
  const baselines: Record<string, string> = {};
  const appended = new Set<string>();
  for (const o of opts.orphanedEdits) {
    const id = `${o.entryKind}:${o.existingIndex}`;
    if (!appended.has(id)) {
      appended.add(id);
      if (o.entryKind === "highlight") {
        candidate.highlights.push(
          structuredClone(existing.highlights[o.existingIndex]!)
        );
      } else {
        candidate.timeline.push(
          structuredClone(existing.timeline[o.existingIndex]!)
        );
      }
    }
    baselines[o.path] = o.recordedHash;
  }
  return baselines;
}

/**
 * Final contentHashes for the emitted file: fresh hashes for agent-generated
 * fields, carried-over baselines for human-owned ones.
 */
export function buildContentHashes(
  candidate: ProseDoc,
  sourceLang: string,
  baselineHashes: Record<string, string>
): Record<string, string> {
  return { ...hashStableProseFields(candidate, sourceLang), ...baselineHashes };
}
