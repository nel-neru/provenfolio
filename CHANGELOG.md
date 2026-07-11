# Changelog

All notable changes to Provenfolio. Versioning follows the root `package.json` (engine version). Buyers: see `engine/docs/UPDATING.md` for how to pull engine updates without touching your `data/`.

## [0.1.0] — Unreleased

### Changed
- The distribution repo no longer tracks `data/`: a blank seed is bootstrapped on demand by `engine/scripts/ensure-data.ts` (wired into `npm run validate`, site dev/build, and Studio). `reset-data.ts` shares the same seed code.
- `data-guard` CI is now a tracked-state check (zero `data/` paths allowed in the distribution repo); the `[seed]` escape hatch is gone.

### Security
- `refresh.yml` is skipped on the canonical distribution repo, so its auto-commit loop can only run in instance repos.
- `/setup` and `/publish` refuse to commit instance data when `origin` points at the distribution repo.
- Docs now require instance repos to be private and warn against public forks (`engine/docs/GETTING-STARTED.md`).

### Added
- Initial engine: data contract (Zod schemas with `schemaVersion`), github + manual source adapters, 4 analysis agents, `/analyze` `/refresh` `/edit` `/update-site` `/publish` `/setup` skills.
- Astro site (bilingual, evidence-linked case studies, density-gated visualizations, data-seeded 3D hero, OG images).
- Studio local GUI (intake forms, completeness meter, prose editor, media management).
- Self-refresh loop (`refresh.ts` + GitHub Actions template) and Cloudflare Pages deploy.
