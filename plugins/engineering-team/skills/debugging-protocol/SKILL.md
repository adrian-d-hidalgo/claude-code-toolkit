---
name: debugging-protocol
description: Use when the user is investigating a live problem — performance issue, intermittent failure, mystery bug, "works on my machine", a regression — and needs a structured hypothesis-driven approach. Trigger phrases include "debug this", "investigate the [perf | intermittent | mysterious] issue", "why is this slow", "git bisect this", "find the regression", "structured debugging", "depura esto", "investiga por qué falla".
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(git log *)
  - Bash(git bisect *)
  - Bash(git blame *)
  - Bash(git show *)
---

# debugging-protocol skill

Drives **in-the-moment investigation** when there is a live problem and the cause is not yet known. Output is a structured investigation: hypothesis → falsifiable test → evidence → conclusion → next hypothesis (or root cause confirmed). When the root cause is found, the output composes naturally with `bug-analysis` for the post-incident RCA.

This skill is **NOT** for post-incident analysis where the cause is already understood (use `bug-analysis`). It is for the moment when you have a problem and don't yet know why.

## Methodology anchor

- **Andreas Zeller — _Why Programs Fail: A Guide to Systematic Debugging_** (Morgan Kaufmann, 2nd ed., 2009). Hypothesis-driven debugging: formulate hypothesis → derive prediction → test prediction → refine. Reference: [`hypothesis-driven.md`](./references/hypothesis-driven.md).
- **Delta Debugging** — Zeller / Hildebrandt (1999). Systematic minimisation of failure-inducing input. Reference: [`delta-debugging.md`](./references/delta-debugging.md).
- **Git bisect** — binary search on commit history to locate the introducing commit. Reference: [`git-bisect.md`](./references/git-bisect.md).
- **Observability-first debugging** — Charity Majors et al., _Observability Engineering_ (O'Reilly, 2022). Use distributed tracing + structured logging + metrics before diving into code. Reference: [`observability-first.md`](./references/observability-first.md).

## Scope and boundaries

This skill handles:

- Hypothesis-driven investigation from symptom to root cause.
- Choosing among code-reading, observability, bisection, and minimisation techniques.
- Producing a structured investigation log the caller can paste anywhere (Slack thread, Jira comment, war-room doc).
- Stopping at the right moment — when root cause is found, pass to `bug-analysis` for RCA + prevention.

This skill does not handle:

- Post-incident root-cause analysis (use `bug-analysis`).
- Writing the fix (software-developer).
- Designing systemic prevention (security-engineer / software-architect / quality-engineer per category).
- Threat modelling (use `threat-model`).

## Output structure

```markdown
## Symptom

- Observed: <description>.
- Where: <surface — endpoint / page / job>.
- When: <timestamp / frequency>.
- Evidence: [Verified — source]

## Current state of investigation

- Hypotheses ruled out: H-NN (refuted by Evidence E-NN), H-NN, …
- Active hypothesis: H-NN — <statement>.

## Active hypothesis

### H-NN — <one-sentence hypothesis>

**Prediction**: if this hypothesis is true, <observable consequence> should hold.

**Falsifiable test**: <specific check — run X command, query Y dashboard, instrument Z, bisect commit range>.

**Status**: pending | confirmed | refuted.

### Evidence collected

- E-NN: <observation> [Verified — source]
- E-NN: <observation> [Inference — derived from E-NN]

## Conclusion (so far)

- Root cause: <confirmed | suspected | unknown>.
- Next step: <next hypothesis | pass to bug-analysis | escalate>.

## Open paths to investigate

- <branch 1>: …
- <branch 2>: …
```

## Workflow

1. **Capture symptom precisely** — what / where / when / frequency. No hand-waving.
2. **Check observability first** — traces, logs, metrics. Per Majors 2022: most production debugging is unknown-unknowns; observability surfaces them faster than code reading. If you have a trace, the cause may be visible in 30 seconds.
3. **Formulate ONE hypothesis at a time.** Hypothesis = specific, falsifiable statement of cause.
4. **Derive a prediction** — what observable consequence follows if the hypothesis is true?
5. **Design the falsifiable test** — fastest cheap test first (log inspection > bisect > code reading > local reproduction > full POC).
6. **Run the test, record the evidence.** Tag evidence levels per the engineering-team evidence-rule convention (at the plugin-root references directory).
7. **Confirm or refute the hypothesis.** Refuted → state why → next hypothesis. Confirmed → drill deeper or, if root, stop.
8. **Loop until root cause found.**
9. **Pass to `bug-analysis`** for post-incident RCA + prevention. The investigation log + the bug-analysis output together form the full record.

## Self-check (per hypothesis)

- [ ] Hypothesis is **specific** (not "something with the database").
- [ ] Hypothesis is **falsifiable** — there's an observation that would disprove it.
- [ ] Prediction follows from the hypothesis (not from general intuition).
- [ ] Test is the **cheapest available** that distinguishes the hypothesis from alternatives.
- [ ] Evidence is tagged with level per the engineering-team evidence-rule convention (at the plugin-root references directory).
- [ ] Only ONE hypothesis active at a time (per Zeller — multi-hypothesis is a classic anti-pattern).

## Anti-patterns

- **Change-and-pray**: modifying code and seeing if "it works now" without an explicit hypothesis. May produce coincidental fixes that mask the real cause.
- **Multi-hypothesis simultaneous**: trying three things at once; can't tell which one worked. Zeller's central injunction: one at a time.
- **No falsifiable test**: "let's just look at the code more carefully" — not a test, no commitment to a decision boundary.
- **Ignore the observability stack**: diving into code when the trace would have shown the cause in seconds.
- **Skipping git bisect for regressions**: if behaviour changed between commits, bisect locates the introducing commit in O(log n) — much faster than code-reading.
- **Confirmation bias** — only seeking evidence FOR your favoured hypothesis. Always state what evidence would REFUTE the hypothesis.
- **Stopping at the first plausible cause** — without confirming via a falsifiable test, you may be wrong.

## Communication

- **State each hypothesis explicitly** before testing it. Investigations that retroactively claim "I tested H-1, then H-2" are unverifiable.
- **Numbers over adjectives** — "p95 jumped from 80ms to 1200ms at 14:00:23 UTC" is a useful claim; "things got slower" is not.
- **Per-claim evidence levels** — readers must distinguish what you measured vs what you inferred vs what you assumed.
- When passing to `bug-analysis`, hand over the **confirmed root cause + the path of refuted hypotheses** — both are valuable inputs to prevention design.

## Reference index

- [`references/hypothesis-driven.md`](./references/hypothesis-driven.md) — Zeller's method, examples, when to abandon a hypothesis.
- [`references/git-bisect.md`](./references/git-bisect.md) — command syntax, automated bisection, edge cases (flaky tests, merge commits).
- [`references/observability-first.md`](./references/observability-first.md) — which signal to check first (trace → metric → log) and why.
- [`references/delta-debugging.md`](./references/delta-debugging.md) — minimise failure-inducing input automatically.
- [`references/anti-patterns.md`](./references/anti-patterns.md) — common bad debugging patterns and corrections.
