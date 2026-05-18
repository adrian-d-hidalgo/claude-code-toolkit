# SQALE method — quantitative tech-debt index

Source: Jean-Louis Letouzey, "The SQALE Method: Software Quality Assessment based on Lifecycle Expectations" (2010). Implemented by SonarQube, NDepend, others.

## When to use SQALE

Use SQALE when the org consumes a **quantitative debt index** — typically because:

- Engineering leadership reports tech debt in hours.
- A board / executive layer tracks "debt ratio" as a metric.
- The codebase already uses SonarQube / similar and the audit output should align.

For most audits in product engineering, qualitative Impact × Effort is sufficient. SQALE adds rigour at the cost of measurement work.

## The core concepts

### Technical debt (in hours)

For each finding (called a **remediation effort** in SQALE), estimate the engineering hours to fix. Sum across all findings = total technical debt.

### Development cost (in hours)

Total engineering hours invested in the codebase (proxy: lines of code × hours-per-line conversion factor; SonarQube uses ~30 minutes per line as default).

### Debt ratio

```
Debt ratio = Technical Debt / Development Cost
```

A 5% debt ratio means: "if we wanted to remediate all debt, it would cost 5% of what it cost to build the codebase".

### SQALE rating

Maps debt ratio to letter grades:

| Rating | Debt ratio |
| ------ | ---------- |
| **A**  | ≤ 5%       |
| **B**  | 6% – 10%   |
| **C**  | 11% – 20%  |
| **D**  | 21% – 50%  |
| **E**  | > 50%      |

Most healthy codebases sit in B or C. A is unrealistic for mature systems; E indicates rewrite consideration.

## SQALE characteristics

SQALE buckets findings into **non-functional characteristics**:

- **Reliability** — fault prevention.
- **Maintainability** — ease of change.
- **Testability** — ease of test creation.
- **Reusability** — likelihood of reuse.
- **Security** — vulnerability avoidance.
- **Portability** — cross-platform fit.
- **Changeability** — ease of small modifications.
- **Efficiency** — performance characteristics.

The audit can produce debt breakdown by characteristic, which helps target investment ("our maintainability debt is 60% of total; we should invest there before efficiency").

## How `code-audit` integrates SQALE

In audits where SQALE is requested:

```markdown
## SQALE assessment

- Total technical debt: 320 hours.
- Development cost (estimate): 4 800 hours (16 000 SLOC × 0.3 hr/SLOC).
- Debt ratio: 6.7%.
- SQALE rating: **B**.

### Debt by characteristic

| Characteristic  | Hours | %   |
| --------------- | ----- | --- |
| Maintainability | 180   | 56% |
| Testability     | 60    | 19% |
| Reliability     | 40    | 13% |
| Security        | 25    | 8%  |
| Other           | 15    | 4%  |
```

Findings in the main list also carry their SQALE remediation effort: `Effort: 4h (SQALE)`.

## When NOT to invoke SQALE

- Small codebases (< 5 k LOC). The math is mostly noise.
- Codebases where SonarQube isn't already part of the workflow. Bolting SQALE on for one audit creates an unmaintained number.
- Audits where the consumer wants qualitative prioritisation, not absolute numbers.

## Anti-patterns

- **SQALE numbers without calibration**: estimating "this fix takes 4 hours" by gut, then claiming SQALE rigour. Calibrate to actual past work.
- **Optimising the rating** rather than the codebase: "we need to get to A" — A is rarely worth the cost.
- **Quoting SQALE without explaining it** to stakeholders: leadership often hears "A grade!" and expects perfection. Pair the rating with what it actually means.
- **Using SQALE as the only prioritisation**: SQALE hours don't reflect impact. A 20-hour fix that prevents a $1M incident is higher priority than a 200-hour fix that improves a rarely-touched module. Pair SQALE with Impact × Effort.

## Cross-reference

- For severity labels: [`conventional-comments.md`](./conventional-comments.md).
- For qualitative prioritisation: [`impact-effort.md`](./impact-effort.md).
- Letouzey original paper: available via the SQALE method website (sqale.org).
