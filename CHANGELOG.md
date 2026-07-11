# Changelog

All notable changes to Provenfolio. Versioning follows the root `package.json` (engine version). Buyers: see `engine/docs/UPDATING.md` for how to pull engine updates without touching your `data/`.

## [0.1.0] — Unreleased

### Added
- Initial engine: data contract (Zod schemas with `schemaVersion`), github + manual source adapters, 4 analysis agents, `/analyze` `/refresh` `/edit` `/update-site` `/publish` `/setup` skills.
- Astro site (bilingual, evidence-linked case studies, density-gated visualizations, data-seeded 3D hero, OG images).
- Studio local GUI (intake forms, completeness meter, prose editor, media management).
- Self-refresh loop (`refresh.ts` + GitHub Actions template) and Cloudflare Pages deploy.
