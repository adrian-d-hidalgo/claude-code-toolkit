# Activation tests — claude-code-sub-agent

Canonical corpus: [activation-evals.json](./activation-evals.json).

## Coverage

- Positive: must activate.
- Negative: must NOT activate (routes to a sibling meta-skill or nothing).
- Edge: ambiguous cases with expected routing in `notes`.

## How to run

```bash
python3 scripts/run_activation_evals.py \
  --skill plugins/claude-code-core/skills/claude-code-sub-agent          # offline shape check
python3 scripts/run_activation_evals.py \
  --skill plugins/claude-code-core/skills/claude-code-sub-agent --live   # live evaluation
```

Target accuracy: ≥0.90.

## Editing

Edit [activation-evals.json](./activation-evals.json) directly. Maintain ≥5 positive and ≥5 negative cases at all times.
