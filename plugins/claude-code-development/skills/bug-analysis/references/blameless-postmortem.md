# Blameless postmortem — culture + structure

Sources:

- John Allspaw, "Blameless PostMortems and a Just Culture" (Etsy, 2012).
- Google SRE Book (2016), Chapter 15 "Postmortem Culture".
- Sidney Dekker, _The Field Guide to Understanding 'Human Error'_ (3rd ed., 2014).

## The cultural premise

People in complex systems do not cause failures by being careless or incompetent. Failures emerge from the **interactions of system components, processes, tools, and the humans operating within them**. The same person on a different day, with different context, would make a different decision.

Therefore: the postmortem focuses on **what about the system allowed the failure** — not **who pulled the lever**.

## Why blameless ≠ accountability-less

The common pushback: "if no one is blamed, no one is held accountable."

The answer: blameless postmortems hold the **system** accountable. The output is a list of systemic changes (process, tooling, automation, training, architecture) that prevent recurrence. Individuals are accountable for **executing the prevention plan**, not for being the proximate cause of the incident.

When blame culture takes hold, three pathologies emerge (Allspaw 2012):

1. **People hide near-misses** to avoid being named — the org loses its early-warning signal.
2. **People stop volunteering for high-risk work** — system reliability concentrates on fewer hands.
3. **Postmortems become political theatre** — the report says what protects the named person, not what improves the system.

Blameless culture inverts all three: surface near-misses, share high-risk work, report what actually happened.

## Structure (Google SRE template, adapted)

A full postmortem typically has these sections — the `bug-analysis` skill produces the technical-core; the org wraps it with the rest:

1. **Title** — short, descriptive, no blame ("Checkout double-charge incident, 2026-05-12").
2. **Authors** — who participated in the analysis.
3. **Status** — Draft / Final / Approved (this is org-level lifecycle, NOT the artifact's internal Status field).
4. **Summary** — TL;DR: what happened, severity, key fix.
5. **Impact** — users affected, duration, financial / SLA / data integrity impact.
6. **Root cause** — from 5-Whys descent. Systemic.
7. **Trigger** — what specifically tipped the system into the failure mode (often a deploy, a config change, a traffic spike, a vendor event).
8. **Resolution** — what was done to recover, in chronological order.
9. **Detection** — how was it detected, by whom, after how long. Was it user-reported or alert-driven? Why didn't earlier alerts fire?
10. **Contributing factors** — Ishikawa categories.
11. **What went well** — explicit positives. Reinforces good behaviour.
12. **What went poorly** — gaps in detection / response / communication.
13. **Where we got lucky** — close calls and what they imply.
14. **Action items** — specific, owned, dated. Tracked outside the postmortem.
15. **Timeline** — chronology with timestamps (alert fired, on-call paged, etc.).
16. **Supporting information** — graphs, logs, links to dashboards.

The `bug-analysis` skill outputs §6 (Root cause) + §7 (Trigger) + §10 (Contributing factors) + the proposed action items for §14. The org wraps the rest.

## Tone guidance

- **Never write a person's name as the cause.** "Engineer X merged the bad PR" → "The merged PR contained X; the code review process didn't surface Y because of Z."
- **Counterfactuals are warnings, not blame.** "If Engineer X had noticed Y" — drop. Replace with "The system relies on humans noticing Y, which is not reliable enough at our scale; we'll add an automated check for Y."
- **Stay close to the evidence.** Speculation is OK if tagged `[Inference]` or `[Unverified]`; don't present speculation as fact.
- **Avoid hedging that hides accountability.** "Mistakes were made" — say what actually happened. Blameless ≠ vague.

## Action items (the heart of prevention)

Every action item must be:

- **Concrete**: "Add connection-pool-leak detection to integration tests" — not "improve testing".
- **Owned**: a specific team or individual (the latter only for individual tasks — most are team responsibilities).
- **Dated**: with a target completion date.
- **Tracked**: in the org's tracker (Jira / Linear / etc.), not in the postmortem doc.

Categories of prevention (per `bug-analysis` SKILL.md):

- **Technical**: test, lint, runtime guard, architecture change.
- **Process**: review checklist, deploy gate, runbook update.
- **Observability**: new alert, new dashboard, new metric, new log field.
- **Training**: a one-time learning session OR a long-term skill gap.

## Anti-patterns

- **Postmortem that lists "more training" as the only action**: rarely durable.
- **Action items not tracked**: produced once, never executed. Tie them to the project tracker.
- **Names in the timeline as causal actors**: timeline is "alert fired" / "page received" / "rollback initiated" — people are roles (on-call, deployer), not blameworthy individuals.
- **The "engineer should have known" framing**: that's hindsight bias. Ask why the system relied on a human catching it.
- **No "What went well" section**: positives reinforce reliability behaviours. Skipping them makes the postmortem read as punishment.

## How `bug-analysis` integrates

The skill outputs the technical analysis (Symptom / Severity / Reproduction / Root cause / Contributing factors / Containment / Fix / Prevention / Regression test / Traceability) — that's the bulk of §5–§14 in the SRE template. The org wraps it with §1–§4 and §15–§16. The output is content the caller persists wherever its postmortem template lives.

## Cross-reference

- Depth: [`5-whys.md`](./5-whys.md).
- Breadth: [`ishikawa.md`](./ishikawa.md).
- Multi-converging causes: [`fta.md`](./fta.md).
