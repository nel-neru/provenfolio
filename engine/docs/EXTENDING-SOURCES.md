# Extending Sources — design notes

> 日本語版: [EXTENDING-SOURCES.ja.md](EXTENDING-SOURCES.ja.md)

Honest status: v1 ships **two** adapters — `github` (full: fetch/extract/enrich/emit) and `manual` (thin: intake → prose → `emit --manual`). The abstraction below is proven by exactly those two. Everything else here is design intent, written against the shipped schemas, not a promise.

## The adapter shape

```
engine/sources/<type>/
  fetch    — get raw material into workspace/<id>/   (scripts; network allowed)
  extract  — deterministic numbers → workspace/<id>/stats.json-like artifacts
  enrich   — agent judgment over the raw material    (writes workspace/ only)
  emit     — normalize into the contract             (extend emit.ts or a sibling)
```

What the contract already supports without schema changes:

- `sources[]` accepts new `type` values by extending one enum (`engine/schemas/source.ts`).
- `metrics` is optional — sources without git history simply omit it; the site's density gates handle absence.
- `data/activities/` (schema shipped, empty in v1): timestamped items (posts, articles) with `relatedProjectIds[]` — the landing zone for content-stream sources, linked to projects.

## Candidate adapters, roughly in order of value/effort

### zenn / qiita / blog RSS (best next adapter)
Free APIs / plain RSS. fetch = pull posts; extract = counts, dates, tags; enrich = per-post relevance + `relatedProjectIds` matching against your projects' tech stacks; emit → `data/activities/`. Site gets an "writing" section and per-project related-articles. No auth, no cost — and it exercises the activities schema end to end.

### x (twitter)
**Archive-import first**: X lets you download your full archive (Settings → Your account → Download an archive); the adapter parses `tweets.js` locally — zero API cost, zero auth, full history. Extract = posting cadence, topics, engagement counts (all numbers from the archive = provenance-safe); enrich = thread/topic clustering, project linkage. Continuous refresh via the paid API is deliberately out of scope (recurring per-buyer cost; the basic tier's read limits make it poor value — re-import the archive when you care).

### local (fuller version of the shipped stub)
Analyze a directory with a `.git` but no hosted remote: place/junction it at `workspace/<id>/repo`, run the github extract (works on any git repo), skip `fetch-github-meta`. Client work you can't link becomes a full case study with honest metrics and `visibility: "private"`.

### monorepo subtree
`sources[].path` is reserved in the schema. Extraction would filter `git log -- <path>` and file listing to the subtree. The clone/detect plumbing exists; the filtering does not.

## Checklist for a new adapter

1. Extend the `sourceType` enum (one line) + bump nothing else in the contract if you emit standard blocks.
2. Numbers only from your extract step; agents get findings files, not APIs.
3. Every claim your enrich stage produces needs an evidence kind that emit can verify (add a verifier to emit if you add a kind).
4. Respect the cost guardrails: budget what agents read; pre-flight big inputs.
5. Wire `/analyze` mode dispatch + a Studio intake variant if the source needs owner facts.
