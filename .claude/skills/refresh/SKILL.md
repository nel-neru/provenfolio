---
name: refresh
description: Deterministically refresh all project metrics from their repos (zero AI cost) and report staleness. Use when the user wants metrics updated or asks what changed since analysis.
argument-hint: "[projectId]"
---

# /refresh — deterministic metrics refresh

- No argument: run `npm run refresh`. It re-clones/fetches every github-sourced project, re-extracts stats, re-emits metrics (`--metrics-only` — prose untouched), and flags projects whose source drifted past thresholds as stale.
- Report the script output to the user: what refreshed, what's flagged stale.
- For each STALE project, offer re-enrichment: on confirmation run `/analyze --refresh <id>` semantics — re-run the enrich agents (repo-analyzer → git-historian → case-study-writer → translator, see `.claude/skills/analyze/SKILL.md` step 3) against the updated clone, then `npx tsx engine/scripts/emit.ts <id>` (full emit clears the stale flag; human-edited prose survives via contentHashes — show the user any diffs emit reports as preserved).
- If that emit exits 1 reporting orphaned human edits (an edited entry no longer matches the regenerated draft), do not resolve it yourself — show the user the fields emit lists and let them choose a re-run flag: `--keep-orphaned-edits`, `--drop-orphaned-edits`, or `--accept-regenerated <fieldPath|all>`. Never default to `--drop-orphaned-edits`.
- With a projectId argument: same flow for just that project.
- After refreshing, remind the user that `/publish` deploys the update (or that the GitHub Actions refresh workflow does this automatically if enabled).
