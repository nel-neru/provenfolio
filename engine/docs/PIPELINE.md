# The Analysis Pipeline

```
[fetch/extract: scripts] → [intake: owner] → [enrich: agents] → [emit: script] → data/*.json → [site/exporters]
```

The division of labor is the product's trust model:

| Deterministic → scripts | Judgment → agents | Facts → owner (intake) |
|---|---|---|
| commit counts, active days, spans | architecture readthrough | category, role, team size |
| per-day activity (heatmap source) | "why this stack" narrative | motivation, target audience |
| velocity, peak day | highlight selection | demo/store links |
| language bytes (GitHub API) | development phases & turning points | **quantitative outcomes** |
| PR/release/contributor counts | case-study prose | screenshots |
| owner-vs-total attribution | translation | corrections |

## Steps (what `/analyze <url>` actually runs)

1. `engine/sources/github/clone-repo.ts <url>` — idempotent clone/fetch into `workspace/<id>/repo` (`--filter=blob:none`: full history metadata, blobs on demand; Windows-safe config).
2. `extract-git-stats.ts <id>` — git log → `workspace/<id>/stats.json`. Pipe-safe `%x1f` delimiters, explicit maxBuffer, merge commits excluded, degenerate-repo guards. **byOwner metrics** filter by `profile.identities` so team repos and forks never inflate your numbers.
3. `fetch-github-meta.ts <id> <owner/name>` — `gh api`: languages, stars, merged-PR titles/bodies (narrative source for squash-merge repos), release/contributor counts. Fails soft offline.
4. Intake check → interview if incomplete (`data/intake/<id>.json`).
5. `repo-analyzer` agent → `workspace/<id>/findings/architecture.md` + Mermaid diagram. Samples files (tree + manifests + top files); budgeted, not exhaustive.
6. `git-historian` agent → `findings/phases.md`: decision archaeology — phases, turning points, each with commit/PR receipts.
7. `case-study-writer` agent → `workspace/<id>/prose.json` (source language). Category selects the template: business (problem→solution→results) vs craft (motivation→approach→learnings).
8. `translator` agent → fills target locales in prose.json (register: concise, results-first; numbers copied exactly).
9. `emit.ts <id>` — the ONLY writer of `data/projects/`:
   - metrics re-injected **unconditionally** from stats.json (agents cannot alter numbers),
   - **numeric lint**: every number in prose must exist in metrics/intake-outcomes/verified-facts,
   - **banned-phrase lint**: unverifiable puffery rejected,
   - **evidence verification**: commit SHAs checked with `git cat-file`, file paths checked on disk, PR numbers checked against merged PRs — fabricated receipts fail the pipeline,
   - **human-edit protection**: SHA-256 contentHashes; a field you edited is never overwritten without a diff confirmation,
   - manifest upsert, aggregates recompute, completeness scoring.
10. `validate-data.ts` — the same Zod schemas gate again at site build time (dual enforcement).

## Failure & resume

Each enrich stage persists its output file; re-running `/analyze` skips stages whose outputs exist. A lint failure names the offending field — fix `workspace/<id>/prose.json`, re-run emit. Never bypass a lint by editing `data/` directly.

## Refresh loop

`npm run refresh` = steps 1–3 + `emit --metrics-only` for every project: numbers update, prose untouched, zero AI cost. Drift past thresholds (30 commits / 60 days) flags `generated.staleSince` → Studio shows it → `/refresh <id>` re-runs enrich with your edits preserved.
