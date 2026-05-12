# Activation tests — software-developer (sub-agent)

Canonical corpus: [activation-evals.json](./activation-evals.json).

## Shape

- **Positive**: application-code authoring / modification / debug / test prompts. Should delegate to `claude-code-development:software-developer`.
- **Negative**: requests that target Claude Code component files (skills, sub-agents, commands, plugin manifests, hooks) → those route to the corresponding meta-skill in `claude-code-core`. Plus prompts that have no implementation component (architecture-only, PR review, test strategy, ops, research questions).
- **Edge**: ambiguous between application code and component editing, or vague-but-clearly-coding prompts.

## How to run

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/run_activation_evals.py \
  --agent plugins/claude-code-development/agents/software-developer.md         # offline shape check
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/run_activation_evals.py \
  --agent plugins/claude-code-development/agents/software-developer.md --live  # live evaluation
```

When `--all` is passed against the plugin root, the runner also picks up corpora under `tests/<agent-name>/activation-evals.json`.

Target accuracy: ≥0.90.
