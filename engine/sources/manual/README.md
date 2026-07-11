# manual / local source adapter

The thin second adapter — proof that the pipeline abstraction holds without a
GitHub repo. For client work, non-git projects, or anything the owner can
describe but not link.

## Flow

1. Owner fills `data/intake/<id>.json` (Studio form or `/analyze --manual`
   interview). `sourceType: "manual"` (or `"local"` when a local directory
   exists to analyze).
2. No fetch/extract stage — there are no scripts here on purpose. No repo →
   no metrics block → the site's density gates hide all volume visualizations
   automatically.
3. `case-study-writer` + `translator` produce `workspace/<id>/prose.json`
   from intake alone (evidence kind `ownerInput` replaces commits/files).
4. `tsx engine/scripts/emit.ts <id> --manual` composes the contract file with
   `sources: [{ type: "manual" }]`.

For `"local"`: clone-less analysis of a local directory is a future extension —
point `extract-git-stats.ts` at any directory that contains a `.git` by
placing/junctioning it at `workspace/<id>/repo`, then proceed as github flow
minus `fetch-github-meta`.
