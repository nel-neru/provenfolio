# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

**Provenfolio** — a distributable (sellable) product that analyzes a developer's repositories with AI agents and generates an evidence-linked, bilingual portfolio site that updates itself. It is NOT any one person's portfolio: the engine is owner-agnostic; `data/` holds the current owner's instance and can be reset for a new owner. The distribution repo tracks no `data/` paths — a blank seed is bootstrapped on demand by `engine/scripts/ensure-data.ts`; instances commit `data/` only in their own PRIVATE repos (CI `data-guard` enforces the zero-tracked-data state on the canonical repo).

```
[Engine: source adapters + agents + Studio] → [Data contract: data/*.json (Zod)] → [Consumers: site / exporters]
```

## Golden rules

1. **Engine/data separation** — everything outside `data/` and `workspace/` is engine (the product). Never hardcode owner-specific values (names, URLs, locales) in engine code; read `data/profile.json`.
2. **Contract-first** — all content changes go through `data/*.json`, validated by `engine/schemas/`. Never hand-edit or generate per-project site pages; the site renders from content collections.
3. **No unsupported claims** — every number shown on the site must come from script-produced `metrics`; every qualitative highlight/claim needs an `evidence` ref (commit SHA, file path, PR, or ownerInput). Agents write prose, scripts write numbers.
4. **Agents never write contract files** — analysis agents write findings/prose to `workspace/<id>/` only; the `emit` script merges prose, re-injects metrics unconditionally, and runs the numeric + banned-phrase lints.
5. **i18n** — `profile.sourceLang` is the source of truth; target locales are produced by the translator agent. Edit source-locale text, then re-translate. Never assume any particular locale in engine code.
6. **`workspace/` is transient** — gitignored, safe to delete, always regenerable.
7. **New sources are adapters** — `engine/sources/<type>/` implementing fetch → extract → enrich → emit. Schemas already support `sources[]` arrays and `data/activities/` so new adapters (x, blog) need no schema changes.
8. **Studio and skills share the same contract** — the Studio GUI and `/analyze` interview both write `data/intake/<id>.json`; neither bypasses Zod validation.

## Commands

- `npm run dev` / `npm run build` / `npm run preview` — site (build runs `validate` first)
- `npm run validate` — bootstrap a blank `data/` seed if missing (ensure-data), then Zod-check everything in `data/`
- `npm run aggregate` — recompute `data/derived/aggregates.json`
- `npm run refresh` — deterministic re-extract of all sources (no AI cost)
- `npm run studio` — local GUI at http://localhost:4600 (never deployed)
- `npm run design:preview` — design-proposal gallery at http://localhost:4700 (serves `workspace/design/proposals/`, never deployed)
- `npm run migrate` — apply schema migrations to `data/`
- `npm run check:i18n` — bilingual-docs guard + stray-Japanese lint (`-- --stamp` refreshes markers after translating)
- Engine scripts run via `tsx engine/scripts/<name>.ts` / `tsx engine/sources/github/<name>.ts`

## Skills

- `/analyze <repo-url> | --pending | --attach <id> <url> | --refresh <id> | --manual` — full analysis pipeline
- `/refresh` — deterministic metrics refresh + staleness report
- `/edit <id>` — conversational case-study prose editing
- `/design brief | propose [n] | apply <id> | switch <theme> | status` — design-brief-driven look management (themes)
- `/update-site` — validate + preview + visual check
- `/publish` — completeness gate → build → confirm → `wrangler pages deploy`
- `/setup` — new-owner onboarding (interview → reset `data/` → profile.json)

## Pipeline (who owns which step)

1–4 fetch/extract (**scripts**): clone (`--filter=blob:none`, Windows-safe) → git stats → `gh api` meta + PR titles/bodies → skeleton JSON. 5 intake (**Studio form or interview**): category, role, motivation, demo links, quantitative outcomes → `data/intake/<id>.json`. 6–8 enrich (**agents**): repo-analyzer → git-historian → case-study-writer → translator, all writing to `workspace/<id>/`. 9–10 emit/validate (**scripts**): merge + metric re-injection + lints → Zod → aggregate → completeness → manifest upsert.

Idempotency: `generated.contentHashes` detects human-edited prose (hash mismatch = never overwrite without diff confirmation). `sourceCommit == HEAD` + non-empty prose → skip enrich entirely.

## Conventions

- Engine scripts: TypeScript run with `tsx`; spawn processes with `execFileSync`/`spawn` + args array (never shell strings) and explicit `maxBuffer`; use `node:path` for all paths (Windows-safe). Git log parsing uses `%x1f` delimiters, never `|`.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, ...).
- Never push or deploy without explicit user confirmation (`/publish` handles this).
- Zod is pinned at the root to the major that Astro vendors — do not add another zod version to any workspace.
- Buyer-safe customization surface: `site/theme.config.mjs` + `site/src/themes/<your-theme>/` (+ `data/**`) — engine updates never touch these; `site/src/theme.ts` is now an engine shim over the active theme; edits to engine-shipped themes (e.g. `midnight`) are fork-owned merges.
- Screenshots live in `data/assets/screenshots/<projectId>/` and are referenced relatively from project JSON.
- Dev working copies of the distribution repo (origin = nel-neru/provenfolio): add `data/` to `.git/info/exclude` (machine-local) right after cloning, and never stage `data/` there — ensure-data creates an untracked `data/` tree in every working copy, and CI `data-guard` is a tripwire, not prevention.
- **Language policy (CI-enforced by `check:i18n`)**: every user-facing doc ships as an EN+JA pair — canonical side is `README.ja.md` (marketing, Japanese) and `engine/docs/*.md` (technical, English); the translation file carries an `<!-- i18n:source=... sha256=... -->` marker. Editing a canonical doc REQUIRES updating its pair in the same commit, then `npm run check:i18n -- --stamp`. Japanese text is allowed only in `*.ja.md` and the i18n dictionaries (`site/src/lib/i18n.ts`, `studio/public/i18n.js`, `engine/scripts/lib/lints.ts`, translator agent example); everything else — code, comments, CLI output, CHANGELOG, commit messages — is English-only. Studio UI strings go through `studio/public/i18n.js` keyed on `profile.sourceLang`.
