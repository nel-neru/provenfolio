---
name: analyze
description: Analyze a repository (or all pending intakes) into an evidence-linked portfolio project. Full pipeline - clone, extract, intake, enrich agents, emit. Use when the user wants to add or re-analyze a project.
argument-hint: "<repo-url> | --pending | --attach <id> <url> | --refresh <id> | --manual"
---

# /analyze — the Provenfolio analysis pipeline

You orchestrate the full pipeline for one project (or several with `--pending`). Scripts produce every number; agents produce only prose; `emit` is the only writer of `data/projects/`.

## Mode dispatch

- `/analyze <repo-url>` — analyze one GitHub repo (URL or owner/name).
- `/analyze --pending` — process every `data/intake/*.json` with `state: "pending"`, sequentially, each via the standard flow below.
- `/analyze --refresh <id>` — skip to step 6 with existing intake; re-run enrich only if prose is stale or the user confirms; finish with emit.
- `/analyze --attach <id> <url>` — clone+extract the extra repo into the EXISTING project's workspace as an additional source; note in the enrich prompts that multiple repos form one project. (Additional sources append to `sources[]` at emit.)
- `/analyze --manual` — no repo: ensure intake exists (interview), then case-study-writer + translator + `emit --manual`.

## Standard flow (github source)

1. **Fetch/extract (scripts, deterministic)**
   ```
   npx tsx engine/sources/github/clone-repo.ts <url>        # prints {projectId, ...}
   npx tsx engine/sources/github/extract-git-stats.ts <projectId>
   npx tsx engine/sources/github/fetch-github-meta.ts <projectId> <owner/name>
   ```
   Before proceeding, report scale to the user: commits, active days, file count (from the extract output). For repos over ~2000 commits or ~5000 files, warn that enrichment reads more context and confirm continuation.

2. **Intake** — read `data/intake/<projectId>.json` if present. Required before enrich: `category`, `role`, `whatIsIt`. If missing/incomplete, interview the user with AskUserQuestion: 3-8 SPECIFIC questions grounded in what extraction found (e.g. "What problem does this repository solve?", "What was your role? (solo / lead / contributor)", "Any quantitative outcomes? (users, downloads, etc., with a source — 'none' is fine; numbers not given here never appear on the site)"). Write answers to `data/intake/<projectId>.json` (schema: `engine/schemas/intake.ts`, `state: "pending"`, `updatedAt` now). Ask in the owner's language (profile.sourceLang).

3. **Enrich (agents — they write ONLY to workspace/)**
   Launch in this order (analyzer and historian may run in parallel; writer needs both):
   - `repo-analyzer` subagent → `workspace/<id>/findings/architecture.md` + `architecture.mmd`
   - `git-historian` subagent → `workspace/<id>/findings/phases.md`
   - `case-study-writer` subagent → `workspace/<id>/prose.json` (source language only)
   - `translator` subagent → fills target locales in `prose.json`
   Pass each agent the projectId and remind it of its input files. If a stage's output file already exists (resume after failure), skip that stage unless the user asks to redo it.

4. **Emit + validate (scripts)**
   ```
   npx tsx engine/scripts/emit.ts <projectId>
   npm run validate
   ```
   Lint errors name the offending field — fix `workspace/<id>/prose.json` (usually by removing an unsourced number or rewording a banned phrase, or re-running the writer with the error list) and re-run emit. Never bypass a lint by editing `data/` directly.

5. **Report** — completeness score + missing items (from emit output), then the review checklist (in the owner's language):
   - Review/adjust the prose in Studio or via `/edit <id>`
   - Add screenshots to `data/assets/screenshots/<id>/`
   - To feature the project, set `featured` via Studio or the manifest
   - Publish with `/publish`

## Re-analysis (same id exists)

Safe by design: emit preserves human-edited prose via contentHashes and preserves featured/placement/order. If `sourceCommit` equals current HEAD and prose exists, skip enrich entirely (nothing changed) — just report.

If emit exits 1 because a human-edited entry no longer matches anything in the regenerated draft (orphaned edit), do NOT pick a resolution yourself: show the user the fields emit lists and let them choose — re-run emit with `--keep-orphaned-edits` (append the edits unchanged), `--drop-orphaned-edits` (discard them), or `--accept-regenerated <fieldPath|all>` (release protection and take the regenerated text). Never default to `--drop-orphaned-edits`.

## Never

- Never write `data/projects/*.json` by hand — always through emit.
- Never invent intake answers on the owner's behalf; ask or leave absent.
- Never proceed past a failing lint by weakening the claim's evidence.
