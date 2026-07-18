---
name: publish
description: Gate-check, build, and deploy the portfolio to Cloudflare Pages (with explicit user confirmation). Use when the user wants to go live or update the live site.
---

# /publish — completeness gate → build → confirm → deploy

## 1. Gates (fail closed, explain what's missing)

- `npm run validate` must pass.
- FEATURED-project gates (hard): every featured project must have
  - non-empty summary/problem/solution in the source language,
  - complete translations for every `profile.targetLangs` locale (no empty strings),
  - at least one visual (screenshot or architecture diagram),
  - completeness score ≥ 70.
  Read each featured `data/projects/*.json` and check; on failure, list exactly what's missing per project (Studio or `/edit` fixes it) and STOP.
- Non-featured projects: warn on completeness < 50 but don't block.

## 2. Build

- Delete `site/dist` first (`node -e "require('fs').rmSync('site/dist',{recursive:true,force:true})"` — cross-platform) — Astro does not remove stale output for pages that no longer exist, so a deleted project page would otherwise ship in the deploy.
- `npm run build` — green required.

## 3. Confirm

- Show the user: number of pages, projects going live, target (Cloudflare Pages project name if known from previous deploys, else "new"). Deploying publishes content publicly — get an explicit yes before proceeding. Never deploy without it.

## 4. Deploy

- First time: check `npx wrangler whoami` — if not logged in, the USER must run `npx wrangler login` themselves (browser OAuth; do not attempt it headless). Then:
  `npx wrangler pages deploy site/dist --project-name <name>` (suggest a name from profile.githubUser, e.g. "<user>-portfolio"; wrangler creates the project on first deploy).
- Subsequent deploys: same command, same project name.
- Report the deployment URL (`*.pages.dev`). If `profile.siteUrl` is empty or different, update `data/profile.json` siteUrl to the deployed URL (and note that a custom domain can be connected later in the Cloudflare dashboard → the docs cover it).

## 5. After

- Run `git remote get-url origin` and normalize it (strip protocol/host prefix, trailing `.git`, and trailing slash; then lowercase — GitHub paths are case-insensitive). If the normalized path is EXACTLY `nel-neru/provenfolio` (the public distribution repo; exact match only — substring matching would wrongly flag instance repos like `provenfolio-instance`), do NOT suggest or run any `data/` commit: explain that instance data must never enter the distribution repo, and point to engine/docs/GETTING-STARTED.md ("Your instance repo must be private") for re-pointing origin.
- Otherwise, suggest committing the data changes (`git add data/ && git commit`) so the deployed state is reproducible.
