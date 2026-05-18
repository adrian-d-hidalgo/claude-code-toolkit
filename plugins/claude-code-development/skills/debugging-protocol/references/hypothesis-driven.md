# Hypothesis-driven debugging (Zeller)

Source: Andreas Zeller, _Why Programs Fail_ (2nd ed., 2009). The dominant academic framework for systematic debugging.

## The core loop

1. **Observe** the symptom — what's wrong, where, when.
2. **Hypothesise** a specific cause — one at a time. The hypothesis is a falsifiable statement.
3. **Predict** an observable consequence of the hypothesis.
4. **Test** the prediction — run an experiment that distinguishes the hypothesis from alternatives.
5. **Confirm** or **refute**. If refuted, state why and pick a new hypothesis. If confirmed, drill into the next layer (or stop if root).

## Why one hypothesis at a time

The instinct under pressure is to try multiple things simultaneously ("change X, restart Y, redeploy Z, and see if the symptom goes away"). Zeller's empirical finding: this is the dominant cause of debugging mistakes. When multiple changes happen together:

- You can't tell which one fixed it.
- You can't tell which one introduced a new bug.
- Coincidental fixes (intermittent symptom that happened to not recur) get mistaken for real fixes.
- The next time the symptom shows up, your "fix" is unreproducible.

**Rule**: one hypothesis, one test, one outcome, then iterate. The cost of patience is much lower than the cost of false fixes.

## What makes a good hypothesis

A hypothesis must be:

- **Specific** — names the suspected cause, not a vague area. Good: "Connection pool exhausts because cleanup-job leaks connections opened after the v1.42 deploy." Bad: "Something with the database."
- **Falsifiable** — there's an observation that, if true, would prove the hypothesis WRONG. Good: "If the leak hypothesis is correct, pool-utilisation increases monotonically over the job's runtime; if utilisation is flat, hypothesis is refuted." Bad: "Database stuff is wrong somehow."
- **Consistent with current evidence** — the hypothesis shouldn't contradict what you've already verified.
- **Distinguishable from alternatives** — if both hypothesis A and hypothesis B predict the same observation, the test doesn't help you. Find a test that produces different predictions.

## Worked example — intermittent 504 timeouts on /checkout

### H-1 — Database is the bottleneck

Hypothesis: "Database connection pool is exhausted at peak."

Prediction: "If true, `pg_stat_activity` shows ≥ pool_size connections at the times of the 504s; queries are waiting in `LWLock`."

Test: Query `pg_stat_activity` at the next 504 incident; check connection-pool metric in Grafana.

Result: Pool utilisation was 30% during the 504s. **Refuted.**

### H-2 — External API is slow

Hypothesis: "Payment gateway latency spikes cause our /checkout to time out at our 30s budget."

Prediction: "If true, p95 latency of `payment-gateway.charge` calls correlates with our 504 timing; trace spans show > 30s in the gateway call."

Test: Open distributed trace for a 504-marked request; check `payment-gateway.charge` span duration.

Result: Span duration is 1.2s. **Refuted.**

### H-3 — Local CPU saturation

Hypothesis: "Container CPU saturates on serialisation of large discount-codes table during checkout."

Prediction: "If true, container CPU metric > 90% during 504s; flame graph shows time in JSON serialisation."

Test: Check container CPU at the time of a 504; capture flame graph next occurrence.

Result: CPU spikes to 100% on each 504; flame graph shows 28s in `JSON.stringify` over a 4-row object that should be tiny. **Confirmed-suspicious.**

### Drill in (still H-3)

Sub-hypothesis: "The discount-codes object has a circular reference that creates exponential blow-up."

Test: Print sample object structure; check for back-references.

Result: Confirmed. After commit `a3f9c1` the discount-code structure has `parent_discount` referencing the parent which references children which… **Confirmed.**

Hand over to `bug-analysis` for systemic RCA + prevention.

## When to abandon a hypothesis

- Two consecutive falsifiable tests refute it (you got the antecedents wrong).
- The hypothesis is unfalsifiable (you can't think of a test). Reframe.
- The hypothesis is consistent with all observations including the absence of the symptom — too unconstrained. Reframe.

## Anti-patterns

- **Multi-hypothesis simultaneous testing**: see top of this doc.
- **Confirmation bias**: only running tests that would confirm your favoured hypothesis. Always design tests that would refute it.
- **Hypothesis = "the most recent change"** without evidence: recent commits aren't automatically suspect. Hold the bisection step until other hypotheses are dead.
- **Failing to record refuted hypotheses**: the negative evidence is valuable for the next investigation; record what you ruled out.
- **Stopping at the first plausible cause**: a hypothesis is only confirmed when a falsifiable test passes.

## Cross-reference

- For regressions: combine with [`git-bisect.md`](./git-bisect.md).
- For input-driven bugs: combine with [`delta-debugging.md`](./delta-debugging.md).
- For production debugging: lead with [`observability-first.md`](./observability-first.md).
- For tracking-and-prevention after root cause is found: hand to `../../bug-analysis/SKILL.md`.
