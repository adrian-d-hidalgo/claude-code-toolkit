# Ishikawa / Fishbone diagram — 6M contributing-cause categorisation

Source: Kaoru Ishikawa, _Guide to Quality Control_ (1968; English ed. 1976). Originally developed at Kawasaki Heavy Industries for manufacturing quality analysis; widely adopted across industries.

## The idea

Most non-trivial bugs have **multiple contributing factors** — not a single cause. Ishikawa categorises factors using the **6M framework**:

| Category        | Software-bug interpretation                                                           |
| --------------- | ------------------------------------------------------------------------------------- |
| **People**      | Skills, training, communication, on-call coverage, team alignment                     |
| **Process**     | Code review, deployment cadence, change-management, runbook quality, on-call rotation |
| **Technology**  | Tools, frameworks, languages, libraries, infrastructure, dependencies                 |
| **Data**        | Data quality, schema design, migration state, edge-case values, missing data          |
| **Environment** | Production vs staging parity, region-specific config, time-of-day effects, load       |
| **Measurement** | Observability gaps, missing metrics / logs / traces, alert thresholds, dashboards     |

(Original manufacturing categories were Man / Method / Machine / Material / Mother Nature / Measurement — software adapts to People / Process / Technology / Data / Environment / Measurement.)

## Worked example — same auth-pool exhaustion from `5-whys.md`

| Category    | Contributing factor                                                                    | Evidence level                          |
| ----------- | -------------------------------------------------------------------------------------- | --------------------------------------- |
| People      | Reviewer was new and didn't know about the pool-lifecycle convention                   | [Inference]                             |
| Process     | Code review checklist lacks an item for resource-lifecycle (connections, file handles) | [Verified — `docs/review-checklist.md`] |
| Technology  | ORM doesn't enforce connection scope automatically                                     | [Verified — Sequelize docs §pool]       |
| Data        | N/A                                                                                    |                                         |
| Environment | Staging has fewer concurrent jobs; the leak wouldn't surface there                     | [Verified — `staging.config.yml`]       |
| Measurement | No alert on connection-pool utilization > 80%                                          | [Verified — `dashboards/auth.json`]     |

The bug had FIVE contributing factors across categories. Fixing only the code (Technology) leaves four factors in place — recurrence is likely. A proper prevention plan touches Process (checklist), Technology (linter / runtime guard), Environment (parity test), Measurement (alert).

## When to use vs 5 Whys

- **5 Whys** — depth-first: one chain to one terminal root.
- **Ishikawa** — breadth-first: multiple contributing factors across categories.

In practice, run **both**:

1. 5 Whys to find the primary chain.
2. Ishikawa to enumerate the contributing factors that made the primary chain possible.

Most rich bug analyses include both.

## When not to use

- Trivial bugs (typo in a string, off-by-one in test code) — overkill. Just fix it and add a test.
- Pure environmental issues (external vendor outage) — the 6M frame doesn't help; focus on observability + fallback design.

## Anti-patterns

- **All factors in one category**: if every contributing factor is "Process", you didn't look hard. Check Technology, Data, Environment, Measurement.
- **Vague factors**: "communication issue" without specifying what wasn't communicated. Be concrete or omit.
- **N/A rows without rationale**: leave the row out entirely, or state explicitly why it doesn't apply.
- **Categories used as labels for blame**: People is not "who screwed up". People is "what skill / training / communication gap enabled the issue".
- **Treating the diagram as the deliverable**: the categorisation is a thinking tool; the deliverable is the prevention plan that addresses the most-impactful contributing factors.

## Output in `bug-analysis`

Render as a structured list (one row per applicable category) inside the "Contributing factors" section. Drop categories that don't apply (don't pad with N/A).

## Cross-reference

- Pairs with [`5-whys.md`](./5-whys.md) — depth (Whys) + breadth (Ishikawa).
- For tree of converging causes with AND/OR logic: [`fta.md`](./fta.md).
