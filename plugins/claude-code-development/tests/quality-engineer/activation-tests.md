# Activation tests — quality-engineer (sub-agent)

Canonical corpus: [activation-evals.json](./activation-evals.json).

## Shape

- **Positive**: test strategy, layer selection (pyramid / trophy), E2E planning with Playwright, contract testing with Pact, performance/load planning with k6, chaos plans, quality gates, traceability matrices, mutation-score audits, escaped-defect metrics. Should delegate to `claude-code-development:quality-engineer`.
- **Negative**: routine unit-test implementation for app code, single-test additions, PR review, threat modeling, CI pipeline plumbing, system architecture, runtime SRE work, research questions, or Claude Code component edits.
- **Edge**: strategy + a demonstrative worked example, flakiness-root-cause prompts framed as strategy, coverage strategy with audit motivation.

## How to run

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/run_activation_evals.py \
  --agent plugins/claude-code-development/agents/quality-engineer.md          # offline shape check
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/run_activation_evals.py \
  --agent plugins/claude-code-development/agents/quality-engineer.md --live   # live evaluation
```

Target accuracy: ≥0.90.
