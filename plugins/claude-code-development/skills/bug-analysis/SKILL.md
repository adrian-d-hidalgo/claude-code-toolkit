---
name: bug-analysis
description: Use when the user asks to analyse a bug, find its root cause, write a post-mortem, or run an RCA. Trigger phrases include "analyse this bug", "root cause of", "why is X failing", "post-mortem", "postmortem", "RCA", "5 whys", "fishbone", "ishikawa", "analiza este bug", "por qué está fallando", "causa raíz", "find the introducing commit", "blameless postmortem".
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash(git log *)
  - Bash(git blame *)
  - Bash(git show *)
---

# bug-analysis skill

Produces a structured analysis of a bug: symptom → blast radius → reproduction → root cause → contributing factors → containment / fix / prevention → regression test recommendation → traceability to the introducing commit. The output is content the caller persists wherever (bug tracker, postmortem doc, Slack triage thread, wiki page). No files imposed.

## Methodology anchor

- **5 Whys** — Sakichi Toyoda / Taiichi Ohno (Toyota Production System, ~1950s). Chain causal questions until you reach a systemic cause. Reference: [`5-whys.md`](./references/5-whys.md).
- **Ishikawa / Fishbone (1968)** — Kaoru Ishikawa. Categorise contributing causes using 6M: People · Process · Technology · Data · Environment · Measurement. Reference: [`ishikawa.md`](./references/ishikawa.md).
- **Fault Tree Analysis (FTA)** — Bell Labs (1962). For bugs with multiple converging contributing causes (AND/OR tree). Reference: [`fta.md`](./references/fta.md).
- **Blameless Postmortem** — John Allspaw (Etsy, 2012) + Google SRE Book (2016). Structure + tone: focus on systemic factors, not individuals. Reference: [`blameless-postmortem.md`](./references/blameless-postmortem.md).
- **Pareto 80/20** — Vilfredo Pareto. Prioritisation across multiple related bugs (which 20% of root causes drive 80% of incidents).

## What a bug analysis is — and is not

A bug analysis **is**:

- Anchored to a specific symptom observed at a specific time on a specific surface.
- Distinguished by **evidence levels** (`[Verified]` / `[Inference]` / `[Unverified]`) per claim.
- Producing three distinct response paths: **containment** (immediate), **fix** (proper resolution), **prevention** (systemic change).
- Blameless — describing systemic factors, not individual fault.

A bug analysis **is not**:

- The fix itself (that's developer execution, downstream).
- A full post-incident postmortem doc (this skill produces the analysis content; org-specific postmortem templates wrap it).
- In-the-moment debugging while you're still finding the cause (use `debugging-protocol` for that — bug-analysis comes after the cause is found).
- A blame document — never name individuals as causes.

## Scope and boundaries

This skill handles:

- Bug RCA after the cause is at least partially understood.
- Structured output with 5 Whys descent + Ishikawa categories.
- Traceability to introducing commit / PR via git introspection (`git log`, `git blame`, `git show`).
- Recommendations across containment / fix / prevention.

This skill does not handle:

- Implementing the fix (software-developer).
- Designing architectural changes for prevention (software-architect).
- Authoring the regression test (quality-engineer for the strategy; software-developer for the implementation).
- Live debugging when the cause is not yet found (debugging-protocol).
- Security-incident response (security-engineer leads; this skill produces the technical RCA portion).

## Output structure

Caller adapts to its destination (Jira bug, postmortem doc, Slack post, wiki). Suggested structure:

```markdown
## Symptom

- What was observed: <description>.
- Who observed it: <user / system / alert>.
- When: <timestamp / range>.
- Where: <surface — endpoint / page / job / region>.
- Evidence level: [Verified — <source>]

## Blast radius / severity

- Affected users: <count / segment>.
- Affected data: <records / consistency state>.
- Business impact: <revenue / SLA / reputational>.
- Severity: P0 | P1 | P2 | P3.
- Evidence level: [Verified | Inference | Unverified — <verification path>]

## Reproduction

- Steps: 1. … 2. … 3. … OR Non-reproducible at present — explain why.
- Frequency: always | intermittent (state %) | one-time.
- Evidence level: [Verified | Inference | Unverified]

## Root cause

- Single statement after 5-Whys descent.
- 5 Whys chain (briefly).
- Evidence level: [Verified | Inference | Unverified]

## Contributing factors (Ishikawa 6M)

- People: …
- Process: …
- Technology: …
- Data: …
- Environment: …
- Measurement: …
- Evidence level per row.

## Containment (immediate)

- What to do RIGHT NOW to stop the bleed: <flag flip / rollback / traffic rerouting>.
- Owner suggestion (not invocation).

## Fix (proper resolution)

- What the code change is: <description>.
- Estimated scope: <files / modules>.
- Owner suggestion.

## Prevention (systemic)

- What systemic change stops this class of bug: <test added / lint rule / alert / runbook / training / architecture change>.
- Owner suggestion.

## Regression test recommendation

- Test layer: <unit / integration / E2E / contract>.
- Test description: <Given/When/Then>.

## Traceability

- Introducing commit: <hash> (via `git blame` / `git log -S`).
- Introducing PR: <link if found>.
- Similar past incidents: <links if known>.
- Evidence level: [Verified | Unverified]
```

## Workflow

1. **Capture symptom precisely** — what / who / when / where. No hand-waving.
2. **Determine severity** — what's the blast radius? P0–P3 from severity matrix (project-specific; cite the matrix if available).
3. **Confirm reproduction** — can you make it happen on demand? If not, say so and state why.
4. **Run 5 Whys** — chain causal questions. Stop when you reach a _systemic_ answer, not a person.
5. **Map contributing factors to Ishikawa 6M** — most bugs have multiple contributing factors across categories.
6. **Propose three response paths** — containment (now), fix (next), prevention (long term). Each is distinct work; don't conflate.
7. **Hunt the introducing commit** via `git log -S "<pattern>"` and `git blame <file>` — only if a code regression is suspected.
8. **Recommend a regression test** — by layer (unit / integration / E2E / contract) with a Given/When/Then.
9. **Tag every claim** with `[Verified]` / `[Inference]` / `[Unverified]` per the engineering-team evidence-rule convention (at the plugin-root references directory).
10. **Self-check** before emission.

## Self-check (mandatory)

- [ ] Symptom is concrete (no "system is slow" without numbers).
- [ ] Severity assigned with rationale.
- [ ] Reproduction status clear (steps OR "non-reproducible at present — explain why").
- [ ] 5 Whys terminates at a systemic root cause, NOT a person.
- [ ] Ishikawa categories filled where applicable (not every category applies; N/A rows allowed with rationale).
- [ ] Three response paths (containment / fix / prevention) clearly distinguished — not bundled.
- [ ] Regression test recommended at a specific layer.
- [ ] Every claim carries an evidence level.
- [ ] Tone is blameless — no individual named as cause.
- [ ] No `Status:` or other tracker-lifecycle field embedded.

## Anti-patterns to reject

See [`anti-patterns.md`](./references/anti-patterns.md). Highlights:

- **Fix without RCA** — straight to "we patched it" without the 5 Whys.
- **Blame culture** — "the developer made a mistake" as a root cause. Never. Systemic factors enabled the mistake.
- **Single-cause assumption** — most non-trivial bugs have multiple contributing factors (Ishikawa multi-category).
- **RCA stopped at the first human in the chain** — keep asking why until you reach the system that allowed the human action.
- **Containment confused with fix** — flipping the flag is containment, not the fix.
- **No prevention path** — leaving prevention for "later" usually means never.
- **Status field in the output** — lifecycle lives in the tracker.

## Communication

- Lead with **symptom + severity**, then **root cause**. Stakeholders need the bottom line first.
- Always include all three response paths — never just the fix.
- Tag evidence levels per claim. Bug analyses without evidence levels read as opinions.
- Blameless tone is non-negotiable: per Allspaw 2012 and Google SRE conventions, the goal is to fix the system, not assign blame.

## Reference index

- [`references/5-whys.md`](./references/5-whys.md) — method, when to stop, anti-patterns (stopping at human error).
- [`references/ishikawa.md`](./references/ishikawa.md) — 6M categories + worked fishbone for a software bug.
- [`references/fta.md`](./references/fta.md) — fault-tree basics + when to use over 5-Whys.
- [`references/blameless-postmortem.md`](./references/blameless-postmortem.md) — Allspaw + Google SRE structure + tone guidance.
- [`references/anti-patterns.md`](./references/anti-patterns.md) — common bad RCAs with the corrections.
