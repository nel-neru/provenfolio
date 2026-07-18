# The Data Contract

> 日本語版: [DATA-CONTRACT.ja.md](DATA-CONTRACT.ja.md)

Everything flows through validated JSON in `data/` — the single source of truth. Schemas live in `engine/schemas/` (Zod), imported by pipeline scripts (write-time), the Astro site (build-time, via content collections), Studio (form validation), and exporters. **One zod instance, pinned at the repo root to the major Astro vendors** — CI asserts the match.

## Files

| File | Schema | Written by |
|---|---|---|
| `data/profile.json` | `profile.ts` | /setup, Studio |
| `data/manifest.json` | `manifest.ts` | emit (upsert), Studio (featured/placement/order) |
| `data/projects/<id>.json` | `project.ts` | **emit only** (+ sanctioned human edits via /edit and Studio prose editor) |
| `data/intake/<id>.json` | `intake.ts` | Studio forms, /analyze interview |
| `data/activities/*.json` | `activities` (shipped, unused in v1) | future adapters (x, blog) |
| `data/derived/aggregates.json` | `aggregates.ts` | aggregate script (never hand-edit) |

## Key invariants

- **`schemaVersion`** on every document. Engine updates that bump `SCHEMA_VERSION` ship migrations — run `npm run migrate`.
- **`localizedText`** = `{ "<lang>": "text" }` records. `profile.sourceLang` is the source of truth; empty string = untranslated (blocked for featured projects at publish).
- **`metrics` is script territory.** Produced solely by extraction → `toProjectMetrics`. `total` vs `byOwner` split keeps team-repo numbers honest.
- **`highlights[].evidence` is mandatory** (commit/file/pr/release/ownerInput/url) and mechanically verified at emit.
- **`caseStudy.results` is optional by design.** No owner-provided outcomes → no results section (the site renders an engineering-outcomes strip instead). This is the no-fabrication guarantee.
- **`generated.contentHashes`**: per-field SHA-256 of the agent-written baseline, keyed by stable evidence-derived ids. Hash mismatch = you edited it = the pipeline never overwrites it silently — the baseline hash is carried forward across re-analyses, so protection is permanent until you release it (`--accept-regenerated`). If a regenerated draft no longer contains a human-edited entry, emit aborts and asks instead of guessing. Editing prose in Studio// /edit intentionally leaves hashes stale — that's the protection mechanism, not a bug.
- **`sources[]` is an array**: one project can bundle several repos (`/analyze --attach`). Source `type` union (`github | manual | local`) is where future adapters plug in without schema changes.

## Editing rules (what you may touch by hand)

Safe to edit directly (validated on next build):
- `profile.json` — anything.
- `manifest.json` — `featured`, `order` (Studio is easier).
- Project prose fields — better via `/edit` or Studio (they keep translations in sync and respect the constraints below).

Constraints that still apply to human edits:
- New numbers must have a source: add them to intake `outcomes` first.
- Don't touch `metrics`, `generated`, `completeness` — script territory, overwritten on refresh.
- Don't remove `evidence` from a highlight you keep.

`npm run validate` after manual edits; the build refuses contract-violating data either way.
