---
name: setup
description: New-owner onboarding - interview, reset instance data, write the profile. Use on first run after cloning/purchasing the engine, or to re-initialize for a different owner.
---

# /setup — make this engine yours (target: under 15 minutes)

## 0. Detect state

**Origin guard.** Run `git remote get-url origin`. Normalize the URL (strip the protocol/host prefix — `https://github.com/`, `git@github.com:`, `ssh://git@github.com/` — a trailing `.git`, and a trailing slash; then lowercase, since GitHub paths are case-insensitive); if the normalized path is EXACTLY `nel-neru/provenfolio` (the public distribution repo — product metadata, not owner data; do NOT use substring matching, it would wrongly flag e.g. `provenfolio-instance`), STOP before any commit step: committing a profile here would publish the owner's personal data. Instruct the owner to create a PRIVATE instance repo and re-point origin first (`gh repo create <user>/<repo> --private`, then `git remote rename origin engine && git remote add origin <private-url> && git push -u origin main` — see engine/docs/GETTING-STARTED.md, "Your instance repo must be private"), and re-run this check. If the owner insists on continuing anyway, proceed with the interview but SKIP every commit step and say why. If there is no origin remote at all, commits stay local — proceed.

Read `data/profile.json`. If it does not exist, this is a fresh data-less clone: there is nothing to reset — skip the reset warning/confirmation and proceed (step 1 creates the seed). If `name` is a real name (not the "Your Name" placeholder of a fresh instance — ask if unsure whose instance this is), warn that setup RESETS all instance data (projects, intake, assets, profile) and require explicit confirmation before proceeding. `npm install` must have been run (check `node_modules` exists; if not, run it).

## 1. Reset (only after explicit confirmation)

```
npx tsx engine/scripts/reset-data.ts --confirm
```

## 2. Interview (AskUserQuestion, keep it tight — every question costs onboarding time)

Interview in the user's language. Required:
1. Display name
2. GitHub username
3. Source language (the language you write in) and target languages (may be empty) — sourceLang / targetLangs
4. Role title and a 15-second tagline — in sourceLang
5. Short bio

Optional (offer defaults, don't block):
6. email / socials (X, LinkedIn, blog, etc.)
7. git author identities — IMPORTANT for honest team-repo metrics: run `git config user.email` and `git config user.name` for defaults, add the GitHub noreply convention automatically (`<user>@users.noreply.github.com`), confirm with the user.

## 3. Write

- `data/profile.json` per `engine/schemas/profile.ts` (role/tagline/bio/seo.title/seo.description as `{<sourceLang>: text}`; translator fills target locales during first /analyze — or translate now if trivial). `seo.title`: "<name> — Developer Portfolio" equivalent, keyed under sourceLang; pages whose locale has no entry synthesize a localized default.
- `npm run validate` must pass.
- Commit: `chore: initialize portfolio for <name>` — only if the step-0 origin guard passed.

## 4. Hand off

Tell the owner the golden path:
1. `/analyze <repo-url>` for your first repository (or `npm run studio` to register several + fill intake forms, then `/analyze --pending`)
2. Screenshots → `data/assets/screenshots/<projectId>/` (or via Studio)
3. `/update-site` to preview → `/publish` to go live (needs a free Cloudflare account)
