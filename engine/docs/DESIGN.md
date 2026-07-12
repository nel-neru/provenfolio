# Design System & Themes

> 日本語版: [DESIGN.ja.md](DESIGN.ja.md)

The site is assembled from two layers. Engine-owned **data-bound components** (`site/src/components/`) render the content contract — evidence links, metric chips, case studies — and never change per look. The **look** — colors, fonts, layout, page composition — lives in a swappable **theme package**. WordPress mental model: components are plugins, themes are themes. Switching themes changes every pixel of presentation without touching a byte of `data/` or a line of the evidence contract.

## The default theme: midnight

Dark, cinematic, quiet. A single periwinkle accent (`#7c9aff`) on near-black surfaces, flat 1px borders (no shadows), Inter Variable for text and JetBrains Mono for numbers/code — both self-hosted woff2. CJK renders on the system stack ('Noto Sans JP', 'Hiragino Sans', 'Yu Gothic UI', 'Meiryo') to avoid multi-MB font payloads. Motion is restrained: scroll reveals, one WebGL hero on the home surface, everything gated behind `prefers-reduced-motion`.

## Theme package anatomy

A theme is a directory under `site/src/themes/<name>/` with an exact required shape — a missing file is a loud build error, not a silent fallback:

| Path | Owns |
|---|---|
| `tokens.ts` | `export const theme: ThemeTokens` — every color, font, radius, spacing, webfont declaration. The single source the CSS vars, 3D hero, OG images, and Studio all derive from. |
| `styles.css` | The theme stylesheet, including the shared primitive classes the engine components expect: `.card`, `.chip`, `.section-title`, `.evidence-link`. |
| `manifest.ts` | The registry entry point: imports `./styles.css`, exports `{ name, tokens, components }`. Loading the manifest loads the whole theme. |
| `components/Header.astro`, `Footer.astro` | Site chrome, delegated to by the shared `Base.astro` layout. |
| `components/HomePage.astro`, `ProjectsPage.astro`, `ProjectPage.astro`, `AboutPage.astro`, `HistoryPage.astro`, `OverviewPage.astro` | Page composition. Each receives the loaded data and lays it out; data itself flows through the engine-owned primitives. |

Mechanism:

- **`site/theme.config.mjs`** is the buyer-facing switch: `activeTheme` (the design served at the root URLs) and `visitorThemes` (which installed themes the on-site switcher exposes — `"all"` or an explicit array).
- **The registry** (`site/src/lib/theme-registry.ts`) discovers every `src/themes/*/manifest.ts` lazily; `Base.astro` resolves the theme to render through it. Lazy loading keeps each built page's CSS scoped to its own theme.
- **The visitor switcher + `/t/<theme>/` trees** — every visitor-exposed theme is prerendered under `/t/<theme>/…` (same pages, that theme's chrome). `Base.astro` reads the `theme` route param, renders a fixed "Design" dock (hidden when fewer than two themes are exposed), stamps `noindex` on `/t/` pages while `rel=canonical` keeps pointing at the root URLs, and a tiny inline script keeps in-site links inside the current `/t/<theme>/` tree.
- **`@theme` Vite alias** — `astro.config.mjs` points `@theme` at `src/themes/<activeTheme>`; the root page wrappers import the active theme's page components through it. Astro/Vite code must never import `site/src/theme.ts`.
- **`site/src/theme.ts`** is the tsx-facing shim for non-Vite consumers (OG exporter, Studio); it resolves `activeTheme` itself and re-exports `theme`, `themeCssVars()`, `themeFontFaces()`. OG images, the hero palette, and Studio always follow the ACTIVE theme.
- **Restart after switching.** The alias is resolved at config load; changing `theme.config.mjs` requires restarting `npm run dev` (a plain `npm run build` always picks it up).

## Token vocabulary

`tokens.ts` exports a `ThemeTokens` object (`site/src/lib/theme-types.ts`); `cssVarsFor()` (`site/src/lib/theme-css.ts`) validates the required keys (loud build error when one is missing) and emits them as CSS custom properties. Consumers: **css** = global.css + theme styles.css, **hero** = the 3D hero (reads computed `--viz-1`/`--accent`), **og** = the OG-image exporter (imports token values directly). Studio consumes the entire emitted set through its `/theme.css` route.

Required keys (the stable contract):

| Token key | CSS var(s) | Consumers |
|---|---|---|
| `accent` | `--accent` | css, hero, og |
| `accentSoft` | `--accent-soft` | css |
| `bg` / `bgRaised` / `bgOverlay` | `--bg` / `--bg-raised` / `--bg-overlay` | css, og (`bg`, `bgRaised`) |
| `line` | `--line` | css, og |
| `text` / `textDim` / `textFaint` | `--text` / `--text-dim` / `--text-faint` | css, og |
| `ok` / `warn` | `--ok` / `--warn` | css |
| `viz` (5-tuple, low → high) | `--viz-0` … `--viz-4` | css, hero (`--viz-1`) |
| `fontSans` / `fontMono` | `--font-sans` / `--font-mono` | css |
| `radius` / `radiusSmall` | `--radius` / `--radius-sm` | css |
| `maxWidth` | `--max-w` | css |

Optional keys (additive extensions):

| Token key | CSS var(s) |
|---|---|
| `error` | `--error` |
| `fontDisplay` | `--font-display` |
| `colorScheme` | `--color-scheme` |
| `space[]` | `--space-1` … `--space-n` |
| `fontSize.{xs,sm,base,lg,xl,display}` | `--text-<key>` |
| `shadow.{sm,md,lg}` | `--shadow-<key>` |
| `showcase.accent2` / `showcase.heroScale` | `--show-accent2` / `--show-hero-scale` |
| `webfonts[]` | rendered as `@font-face` blocks by `fontFacesFor()` |

**Additive-only rule.** Never rename or remove a required key or its emitted var — the hero and OG exporter read them by name across every theme. New capabilities are new *optional* keys, and any CSS consuming an optional var must carry a `var(--x, fallback)` fallback so themes that omit it still build.

## The two surfaces

`Base.astro` renders its `surface` prop as `<body data-surface="...">`, defaulting to `"read"`; the theme's home page opts in by passing `surface="showcase"` to `Base`. Themes scope their wilder rules under `body[data-surface="showcase"]`.

| Surface | Pages | License |
|---|---|---|
| `showcase` | home | May go wild: WebGL, kinetic type, oversized display faces, secondary accent. |
| `read` | projects, project detail, about, history, overview | Calm editorial. Content-first, print-adjacent restraint. |

Hard degrade rules, regardless of surface:

- `prefers-reduced-motion: reduce` gets a static composition — not a slower animation, a designed still state.
- No JavaScript still shows name, navigation, and content. WebGL and kinetic effects are enhancements over server-rendered HTML.
- `/overview` stays print-safe (it is the "hand this PDF to a recruiter" page).

**Studio is not a design surface.** The cockpit inherits the active theme's palette and fonts through its `/theme.css` route, and stops there: its layout is fixed, utilitarian, and optimized for editing speed. `/design` proposals never mock it and `apply` never restyles `studio/public/**` — usability beats art direction in the owner's own tooling. Studio *does* let the owner **pick** the design, though: its "Site design" panel reads/writes `theme.config.mjs` (`GET`/`PUT /api/theme`) to set `activeTheme` and the `visitorThemes` set without hand-editing the config; changes take effect on the next build/publish.

## Design-change guardrails

The MUST-list for any agent or human renovating the design. Everything here is CI-enforced or contract-load-bearing:

- **Never touch** `data/`, `engine/schemas/`, `engine/sources/`, or exporter logic. Design work lives in `site/src/themes/` and `theme.config.mjs`; `site/src/theme.ts` is an engine shim, not a customization point.
- **Render data through the shared primitives** (`EvidenceLink`, `MetricChips`, `ProjectCard`, `CaseStudy`, `CategoryBadge`, `TechStackList`, `Screenshots`, `viz/*`). This is the evidence contract: every number on the site comes from script-produced `metrics`, every claim carries an `evidence` ref. Themes style these components; they do not re-implement them.
- **UI strings only via the i18n dictionaries** (`site/src/lib/i18n.ts`, `studio/public/i18n.js`), added in both `en` and `ja`. No literal UI copy in theme components.
- **English only** in code, comments, and docs (`npm run check:i18n` fails otherwise).
- **Owner-agnostic**: no names, URLs, or locales hardcoded — read `data/profile.json`.
- **Preserve a11y**: skip-link, `:focus-visible` styles, reduced-motion no-op paths, body text at >= 4.5:1 contrast against its surface.
- **Keep the token key names** consumed by the OG exporter and 3D hero (table above).
- **No new npm dependencies** anywhere; Studio stays zero-dependency vanilla JS.
- **Exit criteria** — all four green before a design change is done:

```bash
npx tsc --noEmit
npm run check:i18n
npm run validate
npm run build
```

## The owner design brief

`data/design/brief.md` is the owner's standing design direction: free-form, any language (all of `data/**` is exempt from the Japanese lint), owner-owned, committed in the instance repo, never created by the engine seed. When present, it takes **precedence over the default direction** — agents doing design work read it first. Created and updated via `/design brief`. Typical sections:

- mood words
- admired sites
- energy level (calm … wild) per surface
- typography direction
- color instincts
- hard nos
- decision log (what was tried, what was rejected, why)

## The /design workflow

`/design` has five modes: `brief` (interview the owner, write/update `data/design/brief.md`), `propose` (generate competing design directions as disposable static HTML mockups in `workspace/design/`, served on port 4700 for side-by-side review), `apply` (implement the chosen direction as a real theme package under `site/src/themes/`), `switch` (flip `theme.config.mjs` to an installed theme), and `status` (report active theme, brief freshness, mockup leftovers). Mockups are `workspace/` artifacts — transient, gitignored, safe to delete; only `apply` produces engine-quality code.

## Webfont policy

- Webfonts are **self-hosted** woff2 files in `site/public/fonts/`, declared per-theme in `tokens.webfonts` (family, file, weight, style, optional preload/unicodeRange). `fontFacesFor()` renders the `@font-face` blocks with `font-display: swap` by default.
- **Do not ship multi-MB CJK fonts.** CJK text stays on the system stack (`fontSans` lists the JP fallbacks). If a design genuinely needs a custom CJK face, subset it first — see the recipe pointer in [CUSTOMIZING.md](CUSTOMIZING.md).
