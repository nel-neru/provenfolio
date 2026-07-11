# Provenfolio

> 日本語版: [README.ja.md](README.ja.md)

**You commit. Your portfolio commits too.**
*The portfolio that stays true without you touching it.*

Provenfolio is an engine that puts AI agents (Claude Code) to work analyzing your repositories in depth, then automatically generates — and automatically updates — a bilingual Japanese-English portfolio site featuring **evidence-linked case studies** and a **visualized development history**.

## Why use this instead of building your own

| | DIY portfolio | Provenfolio |
|---|---|---|
| Freshness | Stale within two months | **Auto-updates on every push** (zero-AI-cost refresh) |
| Private repositories | Hard to showcase | **Local analysis** — your source stays on your machine, so client work can be featured too |
| Case studies | You write them yourself (you never do) | Written by AI from git history + interviews, with **commit-level evidence for every claim** |
| Trustworthy numbers | Self-reported | **Script-measured only** (a design in which AI cannot invent numbers) |
| Gathering inputs | — | **Studio** (a local GUI) shows you exactly what is missing |

## Quick start

```bash
npm install
# open Claude Code, then:
/setup        # onboarding (~15 min)
/analyze <your-repo-url>
/publish      # deploy to Cloudflare Pages
```

> ⚠️ Always run your instance in a **private** repository (a fork of this repository cannot be made private). See "Your instance repo must be PRIVATE" in `engine/docs/GETTING-STARTED.md` for the steps.

See `engine/docs/GETTING-STARTED.md` for details.

## Prerequisites

- [Claude Code](https://claude.com/claude-code) (the runtime for the analysis agents)
- Node.js 22+ / git / [gh CLI](https://cli.github.com/) (authenticated)
- A Cloudflare account (free; only needed for publishing)

> ⚠️ Analysis runs on your own machine. Portions of the target repository's code are sent to the Anthropic API for analysis. See the data-handling notes in `engine/docs/GETTING-STARTED.md` for details.

## Architecture

```
[Engine: source adapters + agents + Studio] → [Data contract: data/*.json (Zod)] → [Consumers: site / exporters]
```

- `engine/` — the analysis pipeline, schemas, and exporters (= the product itself)
- `data/` — your instance data (not included in the distributed repository — auto-generated on the first validate/build/`/setup`)
- `site/` — the Astro + Three.js render layer
- `studio/` — the local admin GUI (never deployed)

## License

Proprietary — see [LICENSE.md](LICENSE.md). Not open source.

<!-- i18n:source=README.ja.md sha256=f87d2c52eb657aafff033ebec5496d7c549f5597a02f5ce0ee4e77a11feca42b -->
