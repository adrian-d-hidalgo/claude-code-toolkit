# Activation tests — security-engineer (sub-agent)

Canonical corpus: [activation-evals.json](./activation-evals.json).

## Shape

- **Positive**: STRIDE threat modeling, AuthN/AuthZ design, OWASP review (web / API / LLM / Agentic), encryption + key management, secrets-management strategy, compliance scoping (SOC2 / GDPR / HIPAA / PCI / EU AI Act), vulnerability triage + VEX drafting, security-focused code review, AI/LLM security review, post-quantum migration planning. Should delegate to `claude-code-development:security-engineer`.
- **Negative**: implementing the mitigation, general code-quality review, test strategy, cloud IAM provisioning, runtime SIEM/SOC operation, CI pipeline plumbing, system architecture, research questions, or Claude Code component edits.
- **Edge**: LLM-feature end-to-end security review, incident response guidance, architectural security questions (e.g. token storage location given a threat model).

## How to run

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/run_activation_evals.py \
  --agent plugins/claude-code-development/agents/security-engineer.md          # offline shape check
python3 ${CLAUDE_PLUGIN_ROOT}/scripts/run_activation_evals.py \
  --agent plugins/claude-code-development/agents/security-engineer.md --live   # live evaluation
```

Target accuracy: ≥0.90.
