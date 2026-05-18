# bug-analysis — activation tests

Companion corpus to `activation-evals.json`. The skill is **preloaded on `tech-lead`** (used at intake when the work item is a bug) and **runtime-available to `software-developer`** (used when investigating a bug found during execution).

## Scope

Fires when the user asks for post-incident RCA on a bug (after the symptom is at least partially understood). Methodology anchors: 5 Whys (Toyoda / Ohno), Ishikawa 1968, FTA Bell Labs 1962, Allspaw blameless postmortem 2012 + Google SRE 2016, Pareto.

Does NOT fire for in-the-moment debugging (use `debugging-protocol`) or for the fix implementation (use `software-developer`).

## Positive coverage

- Explicit RCA / root-cause / postmortem requests (English + Spanish).
- Named methodology invocations (5 whys, fishbone, Ishikawa, blameless).
- Git introspection requests ("find the introducing commit").
- Production incident analyses.

## Negative coverage

- Implementation of the fix (software-developer).
- Regression test implementation (developer; bug-analysis recommends).
- Architecture redesign for resilience (architect).
- PR review (code-reviewer).
- Live debugging (debugging-protocol).
- Threat-modelling, work-splitting, test-plan authoring.

## Edge cases

- **Non-reproducible bug** — skill fires; output explicitly states reproduction status + recommends instrumentation.
- **Security incident** — skill fires for the technical RCA portion; the broader response is security-engineer's domain.
- **Trivial bug** (typo) — skill fires and pushes back politely on whether full RCA is warranted.

## Notes for the runner

- Preloaded on tech-lead and available via runtime on developer; routing rate from those agents may be high.
- Description is a pure routing trigger.
- Outcome (LLM-as-judge on the analysis quality) is the gate; routing rate is informational.
