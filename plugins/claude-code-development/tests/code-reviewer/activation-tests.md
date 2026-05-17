# Activation tests — code-reviewer (sub-agent)

Canonical corpus: [activation-evals.json](./activation-evals.json).

## Shape

- **Positive**: review, audit, evaluate, or assess existing code or a PR; identify tech debt; check dependency hygiene; scrutinize AI-generated code; pre-merge checks. Should delegate to `claude-code-development:code-reviewer`.
- **Negative**: writing net-new features or refactor implementations, test-strategy design, threat modeling, system architecture, CI/CD plumbing, runtime ops, or Claude Code component edits.
- **Edge**: review-with-small-fix, tooling evaluations adjacent to review, correctness checks on existing logic.

## How to run

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/run_activation_evals.py \
  --agent plugins/claude-code-development/agents/code-reviewer.md          # offline shape check
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/run_activation_evals.py \
  --agent plugins/claude-code-development/agents/code-reviewer.md --live   # live evaluation
```

Target accuracy: ≥0.90.
