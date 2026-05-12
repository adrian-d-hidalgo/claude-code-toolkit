# Activation tests — claude-code-claude-md

Canonical corpus: [activation-evals.json](./activation-evals.json).

## Shape

- **Positive**: prompts about creating, refactoring, validating, optimizing, or scoping CLAUDE.md files.
- **Negative**: prompts that should route to a sibling meta-skill (skill / sub-agent / slash-command / plugin / hook), or to human-facing docs (README, ADR, CONTRIBUTING), or to coding work.
- **Edge**: prompts that describe a symptom (Claude forgetting things, behavioral misalignment) whose natural fix is a CLAUDE.md edit; plus prompts that look CLAUDE.md-adjacent but should redirect (e.g. ADR-content).

## How to run

```bash
python3 scripts/run_activation_evals.py \
  --skill plugins/claude-code-core/skills/claude-code-claude-md          # offline shape check
python3 scripts/run_activation_evals.py \
  --skill plugins/claude-code-core/skills/claude-code-claude-md --live --judge   # live eval
```

Target routing accuracy: ≥0.90. Outcome quality: ≥3.00/4.00 with the judge.

## Editing

Edit [activation-evals.json](./activation-evals.json) directly. Maintain ≥5 positive and ≥5 negative cases at all times.
