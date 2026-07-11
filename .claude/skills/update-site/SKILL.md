---
name: update-site
description: Validate data, build the site, and visually verify it in the browser. Use after editing data/prose/screenshots, or when the user wants to preview the portfolio.
---

# /update-site — validate, build, look at it

1. `npm run validate` — fix contract errors before anything visual.
2. `npm run build` — must be green (build re-validates through content collections).
3. Start the dev server via the Browser pane (launch config "site", port 4321) and ACTUALLY LOOK at:
   - Home (both locales — default at `/`, targets at `/<lang>/`): hero text, featured cards render, skills populated.
   - Each project page: tl;dr block, case study sections, highlight receipts (evidence links point at real commits/files), timeline, density-gated visualizations (no empty sections where gates hide charts), screenshots.
   - `/overview`: compact, readable, printable.
4. Check the browser console for errors, and verify a narrow viewport (~375px) doesn't overflow horizontally.
5. Report what you saw with any issues found; fix data-layer issues via `/edit` or intake+re-emit — NEVER by hand-editing generated site pages (contract-first rule).
