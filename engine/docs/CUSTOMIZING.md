# Customizing Your Site

> 日本語版: [CUSTOMIZING.ja.md](CUSTOMIZING.ja.md)

## The customization contract

**Edit here = safe forever** (engine updates never touch these paths):

| Path | What you control |
|---|---|
| `site/src/theme.ts` | Every color, font, radius — the whole look. The 3D hero and OG images read the same tokens, so one edit re-skins everything. |
| `site/src/overrides/` | Your own components/styles. Import them from pages you shadow (below). |
| `data/**` | All content. |

**Edit engine files = you own the merge.** Anything else under `site/src/`, `engine/`, `.claude/` is engine surface; you MAY edit it (it's your copy), but engine updates then require manual merging (see UPDATING.md).

## Recipes

### Change the accent / palette
`site/src/theme.ts` → `accent`, `viz` ramp. Dark base too. Rebuild; OG images and hero pick it up automatically.

### Swap fonts
`theme.ts` `fontSans`/`fontMono`. For self-hosted webfonts add `@font-face` in `site/src/styles/global.css` (keep `font-display: swap`; subset CJK fonts or pay seconds of load).

### Add a page
`site/src/pages/<name>.astro` (+ `en/<name>.astro` wrapper) using the `Base` layout and `lib/data.ts` accessors. New pages are yours — engine updates won't collide.

### Optional flourishes (deliberately not shipped)
The v1 motion language is intentionally restrained (reveal + hero). If you want more:
- **Magnetic cursor**: a small `mousemove` lerp toward interactive elements — add in a `site/src/overrides/cursor.ts`, load from Base. Keep it under `prefers-reduced-motion` guard.
- **Film grain**: an SVG `feTurbulence` fixed overlay div with low opacity (2–4%) and `pointer-events: none`.
- **Page-transition tuning**: Astro View Transitions accepts custom animations per element via `transition:animate`.

### Analytics
`data/profile.json` → `analytics.cloudflareToken` (Cloudflare Web Analytics, free) — the beacon injects automatically.

### Replace the render layer entirely
The site is a swappable consumer of `data/*.json`. Keep `engine/` and point any framework at the same contract (`engine/schemas` exports plain Zod + TS types). You lose the maintained theme but none of the pipeline.
