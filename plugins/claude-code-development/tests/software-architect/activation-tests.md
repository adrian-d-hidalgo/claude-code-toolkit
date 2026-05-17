# Activation tests — software-architect (sub-agent)

Canonical corpus: [activation-evals.json](./activation-evals.json).

## Shape

- **Positive**: system-level design, NFR definition, ADR drafting, C4 diagramming, modernization strategy, technology-stack choice. Should delegate to `claude-code-development:software-architect`.
- **Negative**: implementation, code review, test strategy, security-only work (threat modeling), cloud-account or IAM provisioning, CI/CD plumbing, runtime SLO operation, research questions, or Claude Code component edits.
- **Edge**: discovery-shaped prompts that are clearly architecture, AS-IS documentation, or extraction-vs-keep decisions.

## How to run

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/run_activation_evals.py \
  --agent plugins/claude-code-development/agents/software-architect.md          # offline shape check
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/run_activation_evals.py \
  --agent plugins/claude-code-development/agents/software-architect.md --live   # live evaluation
```

When `--all` is passed against the plugin root, the runner also picks up corpora under `tests/<agent-name>/activation-evals.json`.

Target accuracy: ≥0.90.
