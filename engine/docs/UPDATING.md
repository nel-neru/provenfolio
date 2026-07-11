# Pulling Engine Updates

> 日本語版: [UPDATING.ja.md](UPDATING.ja.md)

Your purchase includes engine updates. Your `data/` never conflicts with them **by structure**: the distribution repo tracks no `data/` paths at all, so an engine merge cannot touch your data.

## One-time setup

Skip this if you followed GETTING-STARTED's recommended flow — it already renamed your clone's origin to `engine`.

```bash
git remote get-url engine || git remote add engine <the-distribution-repo-url-you-were-given>
```

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
| only `data/`, `site/src/theme.ts`, `site/src/overrides/` | clean merge, always — structurally guaranteed for `data/` (upstream contains zero `data/` paths) |
| engine files (`site/src/**` beyond the contract, `engine/**`, `.claude/**`) | possible conflicts — you own them; resolve normally |

### If you cloned before data/ was removed from the distribution repo (2026-07)

Clones made before the distribution repo untracked `data/` will hit one-time modify/delete conflicts on `data/profile.json`, `data/manifest.json`, and `data/derived/aggregates.json` at their next `git merge engine/main` (and the `.gitkeep` placeholders delete silently). Your versions are already in your working tree — keep them: `git add data/ && git commit`. Engine scripts recreate any empty directories automatically. After this one merge, `data/` never conflicts again.

## Version discipline

- Engine version = root `package.json` + `CHANGELOG.md`.
- Schema changes bump `SCHEMA_VERSION` and always ship a migration — your data is never stranded.
- The zod major is pinned to what Astro vendors; don't add another zod to any workspace (CI guards this).
