# Pulling Engine Updates

Your purchase includes engine updates. Your `data/` never conflicts with them by design — the engine writes owner content nowhere else.

## One-time setup

```bash
git remote add engine <the-distribution-repo-url-you-were-given>
```

## Update procedure

```bash
git fetch engine
git log --oneline HEAD..engine/main        # see what's new (CHANGELOG.md too)
git merge engine/main
npm install                                 # deps may have moved
npm run migrate                             # applies schema migrations to your data/ (no-op when none)
npm run validate && npm run build           # green = done
```

## Conflict expectations

| You edited | Merge result |
|---|---|
| only `data/`, `site/src/theme.ts`, `site/src/overrides/` | clean merge, always (the customization contract) |
| engine files (`site/src/**` beyond the contract, `engine/**`, `.claude/**`) | possible conflicts — you own them; resolve normally |

## Version discipline

- Engine version = root `package.json` + `CHANGELOG.md`.
- Schema changes bump `SCHEMA_VERSION` and always ship a migration — your data is never stranded.
- The zod major is pinned to what Astro vendors; don't add another zod to any workspace (CI guards this).
