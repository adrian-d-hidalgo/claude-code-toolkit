# xychart-beta

**Notation anchor**: Cartesian chart convention (William Playfair, 1786 — bar and line charts). Mermaid's `xychart-beta` is a lightweight inline bar / line chart.
**Best for**: small embedded charts inside markdown docs (release reports, metrics summaries) when a full chart library is overkill.
**Mermaid version**: `xychart-beta` since v10.1; still beta as of May 2026 (syntax may evolve).

## Syntax skeleton

```mermaid
xychart-beta
    title "Monthly active users"
    x-axis [Jan, Feb, Mar, Apr, May, Jun]
    y-axis "Users (thousands)" 0 --> 50
    bar [5, 10, 15, 20, 30, 45]
    line [5, 10, 15, 20, 30, 45]
```

## Structure

| Element              | Syntax                                         |
| -------------------- | ---------------------------------------------- |
| Title                | `title "<text>"` (quote when title has spaces) |
| X axis (categorical) | `x-axis [label1, label2, ...]`                 |
| X axis (continuous)  | `x-axis "label" <min> --> <max>`               |
| Y axis               | `y-axis "label" <min> --> <max>`               |
| Bar series           | `bar [v1, v2, v3, ...]`                        |
| Line series          | `line [v1, v2, v3, ...]`                       |

Multiple `bar` / `line` lines render multiple series. Values must match x-axis length.

## Orientation

```mermaid
xychart-beta horizontal
    title "Quarterly revenue"
    x-axis [Q1, Q2, Q3, Q4]
    y-axis "USD (millions)" 0 --> 10
    bar [3, 5, 7, 9]
```

Add `horizontal` after `xychart-beta` to rotate.

## Mixed bar + line

```mermaid
xychart-beta
    title "Sales vs target"
    x-axis [Jan, Feb, Mar, Apr]
    y-axis "Units" 0 --> 1000
    bar [400, 600, 750, 820]
    line [500, 500, 700, 700]
```

Bars = actual; line = target — common pattern.

## Gotchas

- **Beta**: syntax may change. Pin documentation to the Mermaid version you target.
- Values must be all numeric. Categorical y-axis is not supported.
- No legend by default — distinguish multiple series by ordering (bars first, line second) and by description in the title or surrounding prose.
- No tooltip / interactivity — static SVG only.
- For complex charts (stacked bars, multiple y-axes, log scale), use a real charting library (D3, Observable Plot, Recharts).

## Worked example — sprint velocity

```mermaid
xychart-beta
    title "Sprint velocity (story points completed)"
    x-axis [S1, S2, S3, S4, S5, S6, S7, S8]
    y-axis "Points" 0 --> 50
    bar [22, 28, 31, 35, 30, 38, 40, 42]
    line [30, 30, 30, 30, 35, 35, 40, 40]
```

Bar = actual completed; line = committed target. Story: team consistently under-delivering early, course-corrected by reducing scope.

## Worked example — error rate per release

```mermaid
xychart-beta
    title "Error rate per release (per 10k requests)"
    x-axis [v2.1, v2.2, v2.3, v2.4, v2.4.1, v2.5]
    y-axis "Errors" 0 --> 100
    bar [12, 18, 25, 80, 22, 14]
```

Spike at v2.4 → hotfix v2.4.1 → trend back down.

## When to use a different visualization

- For **proportions at a single point**, use `pie`.
- For **flow quantities** between buckets, use `sankey`.
- For **time-series with many data points** (>50), use a real chart library — `xychart-beta` is for ≤20 categorical buckets.
- For **distributions / histograms**, use a real chart library — Mermaid does not support binning.

`xychart-beta` is for quick inline visualization. When the chart is the focal point of the document, switch to a charting library and embed the rendered image.
