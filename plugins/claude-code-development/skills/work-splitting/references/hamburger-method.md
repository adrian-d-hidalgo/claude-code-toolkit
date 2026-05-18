# Hamburger Method — layer-stacking for vertical slices

Source: Gojko Adzic, ~2013. Named because the splitting visual looks like the layers of a hamburger seen from the side.

## The idea

A user-facing item touches multiple architectural layers (UI, API, service, DB, observability, security). Most items can't be split usefully **by layer** (that gives horizontal slices that ship nothing). Instead:

1. **List the layers** the item crosses (5–10 typical).
2. **For each layer, list 3–5 implementation choices** — from "thinnest possible" to "richest".
3. **Combine the thinnest choice from each layer** → that's your **first slice** (the bottom bun + 1 thin patty + 1 thin slice of cheese — minimum complete burger).
4. **Subsequent slices add thickness** to one or more layers — fancier patty, fancier sauce, extra cheese.

The first slice ships end-to-end through every layer (it's a working burger, not a pile of ingredients). Each subsequent slice is itself a complete, shippable hamburger — just richer.

## When to use

- The work item naturally crosses many layers and you're tempted to split by layer (don't).
- You need to demonstrate end-to-end value early, even if every layer is minimal.
- You want to validate the full stack works together before investing in any one layer.

## Worked example — "Users can search products"

### Step 1 — list the layers

| Layer         | Choices (thinnest → richest)                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------ |
| UI search bar | Plain `<input>` · Autocomplete · Faceted search with filters · Visual recognition                |
| Query parsing | Exact match · Tokenized · Stemming · Synonym expansion · Semantic / vector                       |
| Index         | LIKE on Postgres · Postgres FTS · Elasticsearch · Vector search (pgvector) · Hybrid              |
| Ranking       | Alphabetical · Created-at desc · Popularity · ML-ranked · Personalised                           |
| Result page   | Plain list · Cards · Cards + images · Cards + image + price + ratings                            |
| Pagination    | None (top 10) · Page numbers · Infinite scroll · Cursor-based                                    |
| Observability | No telemetry · Hit count metric · Per-query latency histogram · Full search-experience dashboard |

### Step 2 — first slice = thinnest of each

- Plain `<input>` + submit button.
- Exact-match query.
- LIKE on Postgres.
- Created-at desc.
- Plain list (max 10 results, no pagination).
- Hit count metric only.

This first slice is a **complete, shippable burger**. Users can search. It's ugly and slow, but it works end-to-end and produces telemetry. Estimate: S.

### Step 3 — subsequent slices

- Slice 2: Add tokenization + Postgres FTS index. (Same UI, same pagination — just richer query + index layer.)
- Slice 3: Add cards + images result rendering. (Richer UI layer.)
- Slice 4: Add page numbers + per-query latency histogram. (Richer pagination + observability.)
- Slice 5: Move index to Elasticsearch for scale.
- Slice 6: Add ML-based ranking.

Each slice is a complete burger — never "just the bun" or "just the meat".

## How to use the technique with this skill

1. Identify the layers the work item crosses (5–10).
2. For each layer, list 3–5 implementation choices ordered thinnest → richest.
3. Compose the **thinnest cross-section** as S-01. Verify it's a complete, shippable burger (passes INVEST individually).
4. Compose **one or two thicker slices** as S-02, S-03 — each adding richness to one or more layers without touching the others. Each must still pass INVEST.
5. Stop when slices are S-sized. Larger items recurse.

## When NOT to use

- The work item touches only 1–2 layers — Hamburger is overkill; use Lawrence patterns instead.
- The "thinnest of each layer" composition would NOT deliver any value (e.g. the UI has no thinnest because there must be a real UI). Use SPIDR-Path or Lawrence-workflow.
- The layers are not independent enough (the API layer is so tightly coupled to the DB schema that you can't add richness to one without rewriting the other). Refactor first; then split.

## Anti-patterns

- **Layer-only split**: stopping at "build the DB layer, build the API layer, build the UI layer" — that's just horizontal slicing with extra steps.
- **Skipping observability in the first slice**: even the thinnest burger has at least a hit counter. Telemetry is part of "shippable end-to-end".
- **First slice that doesn't deliver value**: if no user benefits from the thinnest cross-section, you've sliced wrong.
- **All slices the same shape, just different layer-counts**: the technique is to add **richness** to specific layers per slice, not to add more layers.

## Compatibility

Combines naturally with:

- Lawrence §6 (defer performance) — performance hardening is a thick layer added in a late slice.
- SPIDR — Interface — first slice = thinnest UI; subsequent slices add the API, CLI, mobile.
- Elephant Carpaccio — Carpaccio is essentially Hamburger taken to the extreme (each slice is ~30 min).
