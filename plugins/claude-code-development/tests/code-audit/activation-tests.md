# code-audit — activation tests

Companion corpus to `activation-evals.json`. The skill is **preloaded on `code-reviewer`** alongside `code-review-checklist`.

## Scope

Fires when the user asks for full-codebase or scoped-module audit, tech-debt analysis, refactor prioritization, or SQALE assessment. Methodology: Conventional Comments severity, Impact × Effort 2×2 (Bain), SQALE (Letouzey 2010), Fowler code smells (2018).

Does NOT fire for: per-PR review (→ code-review-checklist), implementation, architecture design (architect), live debugging (debugging-protocol), threat modelling (threat-model), test plan, work-splitting, ADR authoring (adr skill).

## Positive coverage

- Scoped module audit, full codebase audit.
- Tech-debt language, ROI ranking, Fowler smell hunting.
- SQALE-rigorous request.
- Spanish triggers.
- Hotspot analysis (git churn × complexity).

## Negative coverage

- Per-PR review (code-review-checklist).
- Implementation (developer).
- Architecture design (architect).
- Debugging (debugging-protocol).
- Threat model (threat-model).
- Test plan, work-splitting, ADR authoring.

## Edge cases

- **Full SQALE rigour** — fires; emits SQALE section in addition to qualitative quadrant.
- **Light scan** — fires; reduces depth but still produces structured findings.
- **Comparative audit** vs prior baseline — fires; output includes delta vs baseline.

## Notes for the runner

- Preloaded on `code-reviewer` and runtime-available to `software-architect` (for modernization proposals) and `code-planner` (for opportunistic-refactor identification).
- Description is a pure routing trigger.
