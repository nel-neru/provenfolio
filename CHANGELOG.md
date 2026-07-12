# Changelog

All notable changes to Provenfolio. Versioning follows the root `package.json` (engine version). Buyers: see `engine/docs/UPDATING.md` for how to pull engine updates without touching your `data/`.

## [0.1.0] — Unreleased

### Changed
- **BREAKING (buyer surface): theme system.** The look now lives in swappable theme packages under `site/src/themes/<name>/` (tokens + stylesheet + page/chrome components), selected by one line in `site/theme.config.mjs`. The old customization surface (`site/src/theme.ts` + `site/src/overrides/`) is replaced: `theme.ts` is now an engine shim over the active theme. Migration: copy your edited token values into `site/src/themes/<name>/tokens.ts` (start from `midnight`) and set `activeTheme` — see `engine/docs/UPDATING.md`. The shipped design carries over as the `midnight` theme with three deliberate rendering changes: Inter Variable + JetBrains Mono are now actually self-hosted and loaded (`site/public/fonts/`), `fontSans` lists explicit Japanese system-font fallbacks ('Hiragino Sans', 'Yu Gothic UI', 'Meiryo'), and the page declares `color-scheme: dark` (UA scrollbars/form controls render dark to match).
- Studio now derives its palette and fonts from the active site theme via a `GET /theme.css` route (tokens single-sourced from `tokens.ts`; the duplicate hand-copied token block is gone from `studio/public/style.css`).
- `Base.astro` stamps `<body data-surface="showcase">` on home and `"read"` elsewhere, giving themes a scoped license for expressive home treatments with calm inner pages.
- All user-facing docs now ship as EN+JA pairs (README + engine/docs), kept in sync by a hash-marker contract; Studio GUI strings moved to an en/ja dictionary keyed on `profile.sourceLang`; a new `check:i18n` CI guard fails on out-of-date translations or stray Japanese outside i18n files.
- The distribution repo no longer tracks `data/`: a blank seed is bootstrapped on demand by `engine/scripts/ensure-data.ts` (wired into `npm run validate`, site dev/build, and Studio). `reset-data.ts` shares the same seed code.
- `data-guard` CI is now a tracked-state check (zero `data/` paths allowed in the distribution repo); the `[seed]` escape hatch is gone.

### Security
- `refresh.yml` is skipped on the canonical distribution repo, so its auto-commit loop can only run in instance repos.
- `/setup` and `/publish` refuse to commit instance data when `origin` points at the distribution repo.
- Docs now require instance repos to be private and warn against public forks (`engine/docs/GETTING-STARTED.md`).

### Added
- **On-site visitor design switcher.** Every theme listed in `theme.config.mjs` `visitorThemes` ("all" by default) is prerendered under `/t/<name>/` and a fixed "Design" dock lets visitors flip the entire site design live — layout, fonts, colors, everything. `/t/` pages are `noindex` with canonical pointing at the root URLs; the dock hides itself when fewer than two themes are exposed. Theme packages gained a `manifest.ts` registry entry point (`site/src/lib/theme-registry.ts` discovers them lazily so each page ships only its own theme's CSS).
- Six new built-in themes implemented from researched design proposals: `editorial-swiss`, `quiet-luxury`, `neo-brutalist`, `data-forensic`, `kinetic-type`, `acid-lab` — spanning calm editorial to experimental showcase energy, each with a cohesive home/case-study pair, reduced-motion static states, and AA body contrast.
- `/design` skill (`brief | propose [n] | apply <id> | switch <theme> | status`) with three agents (design-researcher, design-mockup-builder, design-implementer): natural-language design brief in `data/design/brief.md`, researched browsable proposals under `workspace/design/` served by `engine/scripts/design-preview.ts` (port 4700, `npm run design:preview`), and confirmation-gated theme application.
- `engine/docs/DESIGN.md` (+ `.ja.md`): theme-package contract, token vocabulary and consumers, the two-surface model, and design-change guardrails.
- Theme token extensions (all optional, additive): `error`, `colorScheme`, `fontDisplay`, `space[]`, `fontSize{}`, `shadow{}`, `showcase{}`, and self-hosted `webfonts[]` rendered as `@font-face` (with preload support).
- Initial engine: data contract (Zod schemas with `schemaVersion`), github + manual source adapters, 4 analysis agents, `/analyze` `/refresh` `/edit` `/update-site` `/publish` `/setup` skills.
- Astro site (bilingual, evidence-linked case studies, density-gated visualizations, data-seeded 3D hero, OG images).
- Studio local GUI (intake forms, completeness meter, prose editor, media management).
- Self-refresh loop (`refresh.ts` + GitHub Actions template) and Cloudflare Pages deploy.
