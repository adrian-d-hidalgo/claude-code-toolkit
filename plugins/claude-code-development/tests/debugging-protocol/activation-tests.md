# debugging-protocol — activation tests

Companion corpus to `activation-evals.json`. The skill is **runtime-available** to `software-developer` (not preloaded — used when an investigation is needed mid-execution).

## Scope

Fires when the user is investigating a live problem and the cause is not yet known. Methodology: hypothesis-driven (Zeller 2009), git bisect, observability-first (Majors 2022), delta debugging (Zeller / Hildebrandt 1999).

Does NOT fire for: post-incident RCA (→ bug-analysis), implementation, code review, threat modelling, architecture design, work-splitting, test plan, documentation.

## Positive coverage

- Performance / intermittent / mystery / regression investigations.
- Explicit methodology requests (hypothesis-driven, git bisect, delta debugging).
- Spanish triggers.

## Negative coverage

- Post-incident RCA (bug-analysis).
- Implementation, review, architecture, threat-model, work-splitting, test plan, documentation.

## Edge cases

- **Root cause found mid-investigation**: skill fires; output instructs handing to bug-analysis.
- **Flaky test**: skill fires; methodology notes flakiness handling per `git-bisect.md`.
- **Non-reproducible customer report**: skill fires; output notes reproduction status and recommends instrumentation actions.

## Notes for the runner

- Runtime-available to `software-developer`; not preloaded (skill loaded only when investigation context is detected).
- Description is a pure routing trigger.
