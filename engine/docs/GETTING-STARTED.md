# Getting Started

> 日本語版: [GETTING-STARTED.ja.md](GETTING-STARTED.ja.md)

From clone to a live portfolio in under 45 minutes.

> 📘 Not an engineer? Start with the visual owner's manual instead: `GUIDE.html` (Japanese: `GUIDE.ja.html`) at the repo root, also served by Studio's "Guide" button.

## Prerequisites (honest list)

| Requirement | Why | Cost |
|---|---|---|
| [Claude Code](https://claude.com/claude-code) | Runs the analysis agents. This product is **built for developers who already use Claude Code** — that's you, or this isn't your tool. | Your existing subscription/API spend |
| Node.js 22+ | Engine scripts + site build | Free |
| git + [gh CLI](https://cli.github.com/) (authenticated: `gh auth login`) | Cloning, GitHub metadata, private-repo access | Free |
| Cloudflare account | Hosting (free tier is plenty; `*.pages.dev` URL, custom domain optional) | Free |

**Token cost per analysis** (rough, at typical API pricing): small repo (<300 commits, <500 files) ≈ $0.5–2; medium (<3k commits) ≈ $2–6; large repos get a pre-flight size warning and a file-sampling budget. Re-analysis is cheaper (unchanged stages are skipped); `npm run refresh` metric updates cost **zero** AI tokens.

## Your instance repo must be PRIVATE

Your clone becomes your **instance**: `data/` will hold your real name, contact links, project history, and screenshots, and you will commit all of it. So:

- **Never fork the distribution repo on GitHub.** A public repo's fork cannot be made private — your instance data would be published.
- The distribution repo ships **no `data/` at all**; a blank seed is generated on first `npm run validate`/`build` (or by `/setup`). Commit `data/` freely in YOUR private repo — that's the design.
- Recommended flow:

```bash
gh repo create <you>/<your-portfolio-repo> --private
git clone https://github.com/nel-neru/provenfolio.git <dir> && cd <dir>
git remote rename origin engine        # engine updates arrive from here (see UPDATING.md)
git remote add origin https://github.com/<you>/<your-portfolio-repo>.git
git push -u origin main
```

`/setup` and `/publish` refuse to commit instance data while `origin` still points at the distribution repo.

## Data handling (read this if you have NDA constraints)

Analysis runs **on your machine**. Cloned repos never leave it, except: selected file contents, commit messages, and PR titles are sent to the Anthropic API as agent context during enrichment. Metrics extraction (`refresh`) is fully local + GitHub API. Private repos work through your own `gh` auth. Set `visibilityOverride: "private"` in a project's intake to keep source links off the site.

## Setup

```bash
npm install
claude        # open Claude Code in the repo
> /setup      # interview → writes YOUR profile
```

A fresh clone has no `data/` — `/setup` (and any `npm run validate`/`build`) creates the blank seed automatically.

## First project

```bash
> /analyze https://github.com/you/your-best-repo
```

The pipeline clones, extracts deterministic git metrics, asks you 3–8 grounded questions (your answers are the only permitted source of outcome claims), runs the analysis agents, and emits an evidence-linked case study. Then:

1. **Review prose**: `npm run studio` → http://localhost:4600 (or `/edit <id>` conversationally).
2. **Add screenshots**: drag & drop in Studio (or drop files into `data/assets/screenshots/<id>/`).
3. **Feature it**: toggle ★ in Studio.
4. **Preview**: `/update-site` (or `npm run dev`).

## Go live

```bash
npx wrangler login      # once, browser OAuth
> /publish              # gates → build → confirm → deploy to *.pages.dev
```

### Custom domain (later, optional)

Cloudflare dashboard → Workers & Pages → your project → Custom domains → add your domain. Nothing in the repo needs to change (`profile.siteUrl` is informational — update it for correct canonical/OG URLs).

### Automatic freshness (recommended)

Enable `.github/workflows/refresh.yml` (see file header): weekly, it re-extracts metrics from your repos, rebuilds, and redeploys. Your heatmaps and language mixes stay current with **zero AI cost and zero effort** — the portfolio that commits when you do. Set repo secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and variable `CF_PAGES_PROJECT`.

## Daily driver commands

| Command | What |
|---|---|
| `/analyze <url>` | Add/re-analyze a repository |
| `npm run studio` | Local GUI: intake forms, completeness meters, prose editor, media |
| `/refresh` | Update all metrics now + staleness report |
| `/edit <id>` | Fix prose conversationally (translations stay in sync) |
| `/update-site` | Validate + build + visual check |
| `/publish` | Deploy (with gates + confirmation) |
