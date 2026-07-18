# Pulling Engine Updates

> 日本語版: [UPDATING.ja.md](UPDATING.ja.md)

Engine updates are free — pull them any time. Your `data/` never conflicts with them **by structure**: the distribution repo tracks no `data/` paths at all, so an engine merge cannot touch your data.

## One-time setup

Skip this if you followed GETTING-STARTED's recommended flow — it already renamed your clone's origin to `engine`.

```bash
git remote get-url engine || git remote add engine <the-distribution-repo-url-you-were-given>
```

## From Studio (no terminal needed)

`npm run studio` → the **Engine update** button runs the exact procedure below from the GUI: "Check for updates" fetches and lists what's new; "Update now" merges and rebuilds, streaming the log live. A merge that cannot apply cleanly is aborted automatically — nothing is ever left half-merged; resolve those cases from Claude Code instead. Restart Studio afterwards so it runs the updated engine.

## Update procedure

```bash
git fetch engine
git log --oneline HEAD..engine/main        # see what's new (CHANGELOG.md too)
git merge engine/main
npm install                                 # deps may have moved
npm run migrate                             # applies schema migrations to your data/ (no-op when none or when files are missing)
npm run validate && npm run build           # green = done
```

## Conflict expectations

| You edited | Merge result |
|---|---|
| only `data/`, `site/theme.config.mjs`, `site/src/themes/<yours>/` | clean merge, always — structurally guaranteed for `data/` and your own theme directory (upstream contains neither) |
| engine files (`site/src/**` beyond the contract, engine-shipped themes like `site/src/themes/midnight/`, `engine/**`, `.claude/**`) | possible conflicts — you own them; resolve normally |

### If you customized before the theme system (0.x `site/src/theme.ts`)

Owners who edited the old `site/src/theme.ts` directly: copy your token values into `site/src/themes/<name>/tokens.ts` (start by copying the `midnight` theme directory), set `activeTheme` in `site/theme.config.mjs`, done. The old `theme.ts` is now an engine shim over the active theme and will conflict on future merges if you keep edits in it.

### If you cloned before data/ was removed from the distribution repo (2026-07)

Clones made before the distribution repo untracked `data/` will hit one-time modify/delete conflicts on `data/profile.json`, `data/manifest.json`, and `data/derived/aggregates.json` at their next `git merge engine/main` (and the `.gitkeep` placeholders delete silently). Your versions are already in your working tree — keep them: `git add data/ && git commit`. Engine scripts recreate any empty directories automatically. After this one merge, `data/` never conflicts again.

## Version discipline

- Engine version = root `package.json` + `CHANGELOG.md`.
- Schema changes bump `SCHEMA_VERSION` and always ship a migration — your data is never stranded.
- The zod major is pinned to what Astro vendors; don't add another zod to any workspace (CI guards this).
