---
name: edit
description: Conversationally edit a project's case-study prose (summary, problem/solution/results, highlights, timeline text) with the user, keeping translations in sync. Use when the user wants to fix or improve generated text.
argument-hint: "<projectId>"
---

# /edit — conversational prose editing

Editing bilingual JSON by hand is miserable; this skill is the humane path. You edit `data/projects/<id>.json` prose fields ON THE USER'S INSTRUCTIONS — this is the one sanctioned case of writing the contract file directly, because the change is human-authored (which is exactly what contentHashes protection exists to preserve).

## Flow

1. Read `data/projects/<id>.json` and `data/profile.json` (sourceLang, targetLangs).
2. Show the user the current prose compactly (source language): summary, problem, solution, results (if any), highlights, timeline titles. Number the pieces so they can say "fix #2".
3. Apply requested edits to the SOURCE language first. Constraints you must uphold:
   - Numbers: only values present in `metrics`, intake `outcomes`, or evidence-backed facts. If the user asks for a new number, add it to `data/intake/<id>.json` `outcomes` (with source) first, then use it.
   - Keep every highlight's `evidence` intact; if the user changes a claim so the evidence no longer matches, ask for/find the right receipt (or drop the claim).
   - No banned puffery (the phrases the emit lint rejects) — offer the checkable-fact phrasing instead.
4. Retranslate every edited field into each targetLang (register: concise, results-first, active voice, technical terms verbatim).
5. Run `npm run validate` — must pass.
6. Do NOT touch `generated.contentHashes` — the mismatch is the point: it marks these fields human-owned so re-analysis never overwrites them.
7. Summarize what changed and suggest `/update-site` to preview.
