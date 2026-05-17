# Activation tests — adr (skill)

Canonical corpus: [activation-evals.json](./activation-evals.json).

## Shape

- **Positive**: explicit ADR requests, "decision record", "registro de decisión", "RFC for [decision]", supersession requests, MADR-format requests.
- **Negative**: open-ended architecture exploration, PRDs, tech-specs, runbooks, code implementation, decision-not-yet-taken requests.
- **Edge**: MADR variant; "one-pager explaining why we picked X" (conceptually an ADR even without the keyword); "architecture proposal" (proposal ≠ decision).

Target accuracy: ≥0.90.
