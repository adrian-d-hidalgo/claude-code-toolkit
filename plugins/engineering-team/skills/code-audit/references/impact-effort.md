# Impact × Effort 2×2 — prioritisation matrix

Source: classic 2×2 matrix (Bain & Co. and others, ~1970s); ubiquitous in Lean / Six Sigma / product strategy.

## The matrix

```
              Low Effort                      High Effort
High Impact  | QUICK WINS                   | MAJOR PROJECTS         |
             | Do these immediately;        | Plan, fund, schedule;  |
             | high ROI per unit time.      | high ROI but expensive.|
             |                              |                        |
Low Impact   | FILL-INS                     | THANKLESS TASKS        |
             | Do when bored or as warm-up; | Defer indefinitely or  |
             | low cost but low value too.  | reject. Bad ROI.       |
```

## Scoring conventions

**Impact**: how much value does fixing this deliver?

- **High**: prevents production incidents, unblocks a major feature, eliminates customer-facing pain, removes significant maintenance tax.
- **Medium**: meaningful but local quality / velocity improvement.
- **Low**: cosmetic, minor convenience, narrow-scope improvement.

**Effort**: how much engineering capacity to fix?

- **Low** (S): hours to a few days. One person.
- **Medium** (M): about a sprint. One person, focused.
- **High** (L+): weeks+, multi-person, may require coordination.

The labels are qualitative — they need not map to exact hours. Inter-rater calibration is what matters: agree on examples so "High Impact" means the same thing across the team.

## How `code-audit` uses the matrix

After enumerating findings:

1. Place each finding in one quadrant by L/M/H impact and L/M/H effort.
2. The plan sequences:
   - **Quick Wins** first — they pay back fastest.
   - **Major Projects** next — fund + schedule them deliberately.
   - **Fill-Ins** — backlog; useful for ramp-up or low-energy days.
   - **Thankless** — explicitly NOT recommended unless circumstances change.

## Worked example

After auditing the `orders/` module:

| ID   | Finding                                                       | Impact | Effort | Quadrant      |
| ---- | ------------------------------------------------------------- | ------ | ------ | ------------- |
| F-01 | Idempotency-key missing on `POST /orders` (duplicate charges) | H      | L      | Quick Win     |
| F-02 | Linter disabled in CI for `orders/`                           | M      | L      | Quick Win     |
| F-03 | `OrdersController` is 1200 lines (God Class)                  | M      | H      | Thankless     |
| F-04 | No pagination on `GET /orders` (250k records)                 | H      | L      | Quick Win     |
| F-05 | Move all orders persistence to event-sourced model            | H      | H      | Major Project |
| F-06 | Inconsistent error-response format across endpoints           | L      | M      | Thankless-ish |

Plan:

1. F-01 (Quick Win, blocking) — fix this week.
2. F-04 (Quick Win, required) — fix this week.
3. F-02 (Quick Win, required) — fix this sprint.
4. F-05 (Major Project, required) — propose ADR; schedule next quarter.
5. F-03 — deferred until separate "modularisation" initiative; revisit after F-05.
6. F-06 — deferred; not worth dedicated work.

## Anti-patterns

- **Inflating impact** to justify pet refactors. Cross-check with concrete user / business / metric impact.
- **Underestimating effort** to push work through review. Cross-check against historical similar work.
- **Plotting findings without an explicit quadrant call** — vague rankings don't drive decisions.
- **No "Thankless" quadrant findings**: nothing is being deferred — audit isn't ruthless enough. Real codebases have low-impact-high-effort cleanup work that should NOT be done.

## Cross-reference

- For tech-debt-specific scoring with hours: [`sqale-method.md`](./sqale-method.md).
- For severity labels (separate axis from impact): [`conventional-comments.md`](./conventional-comments.md).
