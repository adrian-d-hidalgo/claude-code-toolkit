# 5 Whys — chain causal questions to a systemic root

Source: Sakichi Toyoda, Toyota (~1930s; popularised within the Toyota Production System by Taiichi Ohno, _Toyota Production System: Beyond Large-Scale Production_, 1988).

## The method

Start with the symptom. Ask "why?". Take the answer. Ask "why?" again. Repeat 5 times (typical — sometimes 3, sometimes 7). The terminal answer is usually a **systemic cause** — a process, tool, training, or design gap — that you can act on to prevent recurrence.

## Worked example — production outage

**Symptom**: API returned 500 errors for 12 minutes.

- **Why 1**: Why did API return 500? → The auth service was unreachable.
- **Why 2**: Why was auth unreachable? → Its database connection pool was exhausted.
- **Why 3**: Why was the pool exhausted? → A background job opened connections without releasing them after a recent change.
- **Why 4**: Why did the change leak connections? → No connection-leak test exists in the test suite, and code review didn't catch it.
- **Why 5**: Why no test, no review catch? → The team lacks a checklist item for connection-handling, and our integration tests don't exercise the pool under load.

**Terminal cause**: systemic gap in the integration test suite + code-review checklist around resource lifecycle. Actionable: add the test, add the checklist item. Not "the developer was sloppy".

## When to stop

Stop when:

- You reach a **systemic factor** you can act on (test, lint, process, training, design).
- You reach an **external constraint** (vendor outage, regulatory, hardware) — note it; act on observability + fallbacks instead.
- The next "why" produces a tautology ("because it was wrong" — stop, go back one step).

**Don't stop at**:

- A person's name. "Why? Because Carlos forgot to release the connection." → keep going: "Why did the system allow Carlos to merge code that leaks connections?"
- A symptom restated. "Why? Because the pool was exhausted." (you just said that) → that wasn't a "why", that was the same thing.
- "Bad luck" or "edge case nobody could foresee" — always foreseeable in hindsight; ask what would have surfaced it.

## How many whys?

The "5" is a guideline, not a target. Some root causes surface at 3; some need 7. Stop when the answer is **systemic and actionable**, not when you hit a count.

## Anti-patterns

- **Stop at human error**: "the developer forgot" is never a root cause; it's a contributing factor. The root cause is whatever system allowed that forgetting to land in production.
- **Single-branch why chain**: most non-trivial bugs have multiple converging branches. The 5 Whys captures one chain; pair with Ishikawa (Fishbone) for the multi-branch view.
- **Why chain that loops** ("why X? because Y. why Y? because X.") — you've hit a process gap. Break out of the loop by re-framing the symptom.
- **Why chain authored by one person in isolation**: validate with another team member. Common cognitive biases (anchoring, confirmation) hide alternative branches.

## Use in `bug-analysis` output

Include the chain in the "Root cause" section of the analysis. Keep it brief — one line per Why is plenty. The terminal answer is the actionable cause.

## Cross-reference

- For multi-branch contributing causes: [`ishikawa.md`](./ishikawa.md).
- For multi-converging cause trees (with AND/OR logic): [`fta.md`](./fta.md).
- For the cultural / tone wrapping: [`blameless-postmortem.md`](./blameless-postmortem.md).
