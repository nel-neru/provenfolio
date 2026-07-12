---
name: design
description: "Design-brief-driven look management: capture the owner's brief, research+generate browsable theme proposals, apply one as a theme package, or switch themes."
argument-hint: "brief | propose [n] | apply <proposal-id> | switch <theme> | status"
---

# /design — brief, propose, apply, switch, status

You manage the site's *look* through the theme system (see `engine/docs/DESIGN.md`). Content and the evidence contract never change here: themes style the data, `data/` stays untouched. Mockups are disposable `workspace/` artifacts; only `apply` produces engine-quality code.

## Mode dispatch

- `/design brief` — interview the owner, write/update `data/design/brief.md`.
- `/design propose [n]` — research + generate n browsable theme proposals (default 6), serve them for side-by-side review, stop for the pick.
- `/design apply <proposal-id>` — turn a chosen proposal into a real theme package under `site/src/themes/`.
- `/design switch <theme>` — flip `site/theme.config.mjs` to an already-installed theme.
- `/design status` — report active theme, installed themes, brief freshness, proposal leftovers.

## brief

1. Interview the owner (AskUserQuestion, in the owner's language — `profile.sourceLang`). Cover, one topic at a time:
   - **Mood words** — 3-6 adjectives the site should feel like.
   - **Admired sites** — up to 3 sites (any kind) whose design they admire, and what specifically they admire about each.
   - **Energy per surface** — 1 (calm) to 5 (wild), separately for `showcase` (home) and `read` (everything else).
   - **Typography direction** — e.g. grotesque / humanist / serif editorial / monospace-forward; display-face appetite.
   - **Color instincts** — dark or light base, accent hue family, "one accent or many", any brand colors.
   - **Hard nos** — anything the owner never wants (e.g. parallax, autoplaying motion, pastel, skeuomorphism).
2. Write `data/design/brief.md` **in the owner's language** using the section structure of `.claude/skills/design/brief-template.md` (the template is English; fill it in the owner's language — all of `data/**` is exempt from the Japanese lint).
3. On EVERY update (including the first), append a dated entry to the **Decision log** section: date, what changed / what was decided, why. Never rewrite past log entries.

## propose [n]

Default n=6. All intermediate files live under `workspace/design/` (transient, gitignored).

1. **Sample content** — build `workspace/design/sample-content.json` from `data/profile.json` plus up to 2 `data/projects/*.json` (prefer featured): real name, role, tagline, project titles, summary prose, and metric chips in every locale present. If the instance is a blank seed, fabricate clearly neutral bilingual placeholders (a generic name in Latin and Japanese scripts, a plausible project with fake-but-labeled metrics) — never invent content that could be mistaken for the real owner's.
2. **Direction cards** — write n cards to `workspace/design/directions/<slug>.md` (slug is kebab-case). Each card: direction name, one-line concept, energy rating (calm/mid/wild), 3-5 keywords, and any brief.md constraints it must honor. Spread the energy: 2 calm (e.g. editorial-swiss, quiet-luxury), 2 mid (e.g. neo-brutalist, data-forensic), 2 wild (e.g. kinetic-type, acid-lab). If `data/design/brief.md` exists, read it FIRST and bias the directions toward it (respect hard nos absolutely; skew the energy split toward the owner's stated levels).
3. **Research** — spawn one `design-researcher` subagent per card, in parallel. Each writes a dossier to `workspace/design/research/<direction>.md`.
4. **Mockups** — spawn one `design-mockup-builder` subagent per dossier, in parallel. Each produces `workspace/design/proposals/<nn-slug>/` (`nn` = 01..n) containing `proposal.md`, `tokens.json`, `home.html`, `project.html`, `studio.html`.
5. **Gallery** — write `workspace/design/proposals/index.html`: one card per proposal with its name, concept line, energy badge, a swatch strip rendered from its `tokens.json`, and links to the 3 screens.
6. **Review** — start the design-proposals preview in the Browser pane (launch config `design-proposals`, port 4700 — it serves `workspace/design/proposals/` via `engine/scripts/design-preview.ts`). Screenshot the gallery, walk the user through each direction (concept, energy, how it treats showcase vs read), then **STOP and wait for the user's pick**. Do not apply anything without it.

## apply <proposal-id>

1. Read `workspace/design/proposals/<proposal-id>/` — `proposal.md` + `tokens.json` + the three mockup HTML files are the spec. Pick a theme name (the proposal slug, kebab-case).
2. Spawn the `design-implementer` subagent with that spec. It creates `site/src/themes/<name>/` — `tokens.ts` (exact `ThemeTokens` shape), `styles.css` (including the shared primitive classes), and all 8 `components/*.astro` adapted from the midnight theme's structure with data flowing through the shared engine primitives. It does NOT touch `site/theme.config.mjs`.
3. **Ask the user for explicit confirmation** before switching. Only after a clear yes: set `activeTheme` in `site/theme.config.mjs` to the new theme, and update the `@theme/*` paths mapping in `site/tsconfig.json` to match.
4. Verification loop (repeat until all pass):
   - `npx tsc --noEmit`, `npm run check:i18n`, `npm run validate`, `npm run build` — all green.
   - Browser: site at 4321 (launch config `site`) and Studio at 4600 (launch config `studio`), compared side-by-side against the mockups at 4700. Check both locales, both surfaces (home = showcase, a project page = read), narrow viewport, and reduced-motion.
   - Feed discrepancies back to `design-implementer` until the real pages honor the proposal.
5. Remind the user: dev servers must be restarted after the `theme.config.mjs` change (the `@theme` alias is resolved at config load).

## switch <theme>

1. Validate `site/src/themes/<theme>/` exists and is complete: `tokens.ts`, `styles.css`, and all 8 components (`Header`, `Footer`, `HomePage`, `ProjectsPage`, `ProjectPage`, `AboutPage`, `HistoryPage`, `OverviewPage`). Missing anything → report and stop; suggest `/design apply` or fixing the theme.
2. Set `activeTheme` in `site/theme.config.mjs`, and update the `@theme/*` paths mapping in `site/tsconfig.json` to the same theme directory (editor/astro-check mirror of the Vite alias).
3. `npm run build` — must be green.
4. Remind the user to restart any running dev servers (alias resolved at config load).

## status

Report, concisely:
- Active theme (`site/theme.config.mjs`) and available themes (list `site/src/themes/`).
- Whether `data/design/brief.md` exists; if so, its last Decision log entry (date + one line).
- Drift notes: proposals still on disk under `workspace/design/proposals/` (name + date), and whether any of them postdate the brief's last decision — i.e. explored but never applied or logged.

## Never

- Never hardcode owner-specific values (names, URLs, locales) in anything under `site/` or `studio/` — read `data/profile.json`.
- UI strings only via the two i18n dictionaries (`site/src/lib/i18n.ts`, `studio/public/i18n.js`), added in both locales.
- English only in all code, comments, and engine files; owner-language text belongs only in `data/**`.
- Mockups (steps under `workspace/`) MAY use the Google Fonts CDN — `workspace/` is transient and never shipped. Real themes MUST self-host webfonts in `site/public/fonts/` via `tokens.webfonts`, with CJK on the system stack.
- Push/deploy never happens from this skill — that is `/publish`, with its own confirmation gate.
