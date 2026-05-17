# pie

**Notation anchor**: Pie chart (William Playfair, 1801). Single-axis proportional representation.
**Best for**: showing how parts contribute to a whole, when there are ≤7 segments and proportions matter visually.
**Mermaid version**: stable since v1.x.

## Syntax skeleton

```mermaid
pie title Browser market share Q1 2026
    "Chrome" : 64
    "Safari" : 19
    "Edge" : 8
    "Firefox" : 4
    "Other" : 5
```

## Structure

| Element           | Syntax                                            |
| ----------------- | ------------------------------------------------- |
| Title             | `pie title <text>` or `pie showData title <text>` |
| Slice             | `"<label>" : <number>`                            |
| Show numeric data | Add `showData` after `pie`                        |

Numbers do not need to sum to 100 — Mermaid normalizes automatically. Use raw counts when those are meaningful, or percentages when the audience expects them.

## When to use a pie chart — and when not

Use pie when:

- 2–7 segments.
- Audience needs a quick visual proportion read.
- Comparing parts to the whole, not parts to each other.

Do **not** use pie when:

- More than 7 segments — segments below ~5% are visually indistinguishable. Use a bar chart instead.
- Comparing segments to each other across categories — bars are better.
- Tracking change over time — use a line or stacked bar.
- The data has zero segments or one segment — defeats the purpose.

For comparison-heavy cases, use `xychart-beta` (bar/line) or move to a real chart library.

## Gotchas

- Slice order in the diagram source dictates rendering order. Place largest slices first for legibility.
- Mermaid auto-colors slices — do not expect brand colors. For brand alignment, use a real chart library.
- Numeric labels appear inside slices only if `showData` is set.
- Long slice labels overflow the legend box; abbreviate if possible.

## Worked example — error budget breakdown

```mermaid
pie showData title Error budget consumption — Q2 2026
    "P0 incidents" : 42
    "P1 incidents" : 18
    "Planned maintenance" : 12
    "Latency budget violations" : 28
```

## Worked example — release-day deploy time breakdown

```mermaid
pie title Where the deploy time goes (45 min total)
    "CI build" : 12
    "Tests" : 18
    "Image bake" : 7
    "Canary wait" : 5
    "Rollout to prod" : 3
```

## Anti-example — too many segments

```mermaid
pie title 23-feature usage breakdown (do NOT do this)
    "Feature A" : 12
    "Feature B" : 9
    "Feature C" : 7
    "Feature D" : 7
    "Feature E" : 6
    "Feature F" : 5
```

With 23 segments below 5% each become invisible. Switch to a bar chart sorted by usage, with a "Long tail (X% of total)" bucket.
