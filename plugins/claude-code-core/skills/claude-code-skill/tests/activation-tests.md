# Activation tests — claude-code-skill

The canonical corpus lives in [activation-evals.json](./activation-evals.json). Treat that file as the source of truth; this document only summarises shape.

## Coverage

- Positive: must activate.
- Negative: must NOT activate (routes to a sibling meta-skill or nothing).
- Edge: ambiguous or cross-domain; expected routing in `notes`.

## How to run

```bash
# Offline corpus validation (shape, counts).
python3 scripts/run_activation_evals.py \
  --skill plugins/claude-code-core/skills/claude-code-skill

# Live evaluation against this machine's `claude` binary.
python3 scripts/run_activation_evals.py \
  --skill plugins/claude-code-core/skills/claude-code-skill --live
```

Live mode invokes `claude --print --output-format json --max-turns 1` per case and uses a heuristic to detect activation. Target accuracy: ≥0.90.

## Editing the corpus

Add cases by editing [activation-evals.json](./activation-evals.json) directly. Each case has `id`, `query`, `should_trigger`, `category`, and optional `notes`. Keep at least 5 positive and 5 negative cases at all times.
