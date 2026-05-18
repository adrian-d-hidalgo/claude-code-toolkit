# code-review-checklist — activation tests

Companion corpus to `activation-evals.json`. The skill is **preloaded on `code-reviewer`** alongside `code-audit`.

## Scope

Fires when the user asks to review a specific PR / diff / change. Methodology: Google Engineering Practices (2019), Wiegers (2002), OWASP Code Review v2 (2017), SmartBear empirical findings, Conventional Comments severity.

Does NOT fire for: full-codebase audit (→ code-audit), implementation, architecture, threat-model, test-plan, debugging, dev plan, work-splitting.

## Positive coverage

- Per-PR / per-diff review requests in English and Spanish.
- Scoped review (specific categories).
- Both "audit this PR" and "review this PR" phrasings.

## Negative coverage

- Full-codebase audit (code-audit).
- Implementation (developer).
- Architecture / threat-model / test-plan / debugging / dev-plan / work-splitting (per their respective skills).

## Edge cases

- **Draft PR** — fires; tone is formative.
- **High-stakes PR** (payment / auth / external) — fires; security category gets explicit walk; may recommend `threat-model` invocation.
- **Trivial PR** (typo fix) — fires; output is brief; quick approve.

## Notes for the runner

- Preloaded on `code-reviewer` alongside `code-audit`.
- Description is a pure routing trigger.
