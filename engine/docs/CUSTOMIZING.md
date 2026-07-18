# Customizing Your Site

> 日本語版: [CUSTOMIZING.ja.md](CUSTOMIZING.ja.md)

## The customization contract

**Edit here = safe forever** (engine updates never touch these paths):

| Path | What you control |
|---|---|
| `site/theme.config.mjs` | Which theme is active, and which themes the visitor switcher exposes. |
| `site/src/themes/<your-own-theme>/` | Your theme package — tokens, stylesheet, page components. The whole look. The 3D hero and OG images read the same tokens, so one edit re-skins everything. |
| `data/**` | All content (including `data/design/brief.md`, your design brief). |

**Edit engine files = you own the merge.** Anything else under `site/src/`, `engine/`, `.claude/` is engine surface; you MAY edit it (it's your copy), but engine updates then require manual merging (see UPDATING.md). That includes engine-shipped themes: editing `site/src/themes/midnight/` in place works, but copy it into your own theme directory first if you want clean merges. (`site/src/theme.ts` is an engine shim over the active theme — don't edit it.)

Prefer a guided path? `/design` turns a natural-language brief into proposals and applies the one you pick. DESIGN.md is the deep reference for the theme contract.

## Recipes

### Change the accent / palette
Your theme's `tokens.ts` → `accent`, `viz` ramp (base colors too). Still on an engine theme? Copy it into a new directory first (below). Rebuild; OG images and hero pick it up automatically.

### Swap fonts
Your theme's `tokens.ts` → `fontSans`/`fontMono`, plus a `webfonts` entry per file; drop the `.woff2` files into `site/public/fonts/` (keep `display: "swap"`). For CJK, download subsets (e.g. via google-webfonts-helper) and add `unicodeRange` entries — don't ship multi-MB fonts.

### Create your own theme
Copy `site/src/themes/midnight` → `site/src/themes/<name>`, edit `tokens.ts` / `styles.css` / `manifest.ts` (set its `name`) / `components/`, set `activeTheme` in `site/theme.config.mjs`, restart the dev server. Every file in the package shape is required — a missing one is a loud build error, not a silent fallback.

### The visitor design switcher
`site/theme.config.mjs` → `visitorThemes`. `"all"` (default) exposes every installed theme: each is prerendered under `/t/<name>/` and a "Design" dock lets visitors flip the whole site live (`noindex`, canonical stays on your root URLs). List specific names to trim the menu, or `["<activeTheme>"]` to disable the switcher entirely.

### Add a page
`site/src/pages/<name>.astro` (+ a `[lang]/<name>.astro` wrapper with `getStaticPaths` over `targetLocales(profile)` for translated URLs) using the `Base` layout and `lib/data.ts` accessors. New pages are yours — engine updates won't collide.

### Optional flourishes (deliberately not shipped)
The stock motion language is intentionally restrained (reveal + hero). If you want more, add them inside your theme package:
- **Magnetic cursor**: a small `mousemove` lerp toward interactive elements — a script in your theme's `Header.astro` (it's on every page). Keep it under a `prefers-reduced-motion` guard.
- **Film grain**: an SVG `feTurbulence` fixed overlay div with low opacity (2–4%) and `pointer-events: none`.
- **Page-transition tuning**: Astro View Transitions accepts custom animations per element via `transition:animate`.

### Analytics
`data/profile.json` → `analytics.cloudflareToken` (Cloudflare Web Analytics, free) — the beacon injects automatically.

### Replace the render layer entirely
The site is a swappable consumer of `data/*.json`. Keep `engine/` and point any framework at the same contract (`engine/schemas` exports plain Zod + TS types). You lose the maintained themes but none of the pipeline.
