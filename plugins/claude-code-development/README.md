# claude-code-development

Opinionated senior software-developer sub-agent for Claude Code. Encodes four core rules, fifteen tech-agnostic engineering practices, and twelve comment-philosophy rules so that every coding task — across any language or framework — is handled with the discipline of a strong staff engineer.

## What it ships

| Component | Type | Auto-trigger |
|---|---|---|
| `software-developer` | sub-agent | Whenever the user asks to write, modify, refactor, debug, implement, or fix code |

## The four core rules

1. **Think Before Coding** — state assumptions, surface tradeoffs, push back when simpler exists.
2. **Simplicity First** — minimum code that solves the problem; no speculative features.
3. **Surgical Changes** — touch only what the task requires; match existing style.
4. **Goal-Driven Execution** — define success criteria; loop until verified.

Each is stated with a *reason* and (where applicable) an *exception* so the model can generalise to edge cases rather than overfit to the rule's wording.

## Engineering rules (tech-agnostic)

Fifteen practices applied uniformly across languages and frameworks. Highlights:

- Read code and tests before editing.
- Estimate blast radius; prefer reversible changes.
- Rule of three (not premature abstraction).
- YAGNI and bounded Boy Scout cleanups.
- Conventional Commits with Problem → Solution → Impact body.
- Enumerate failure modes (empty / huge / malformed / concurrent / partial-failure).
- Idempotency by default for retryable operations.
- Log-level contract (debug / info / warn / error / fatal).
- Config as data; secrets out of source.
- Failing test first.
- Fail-fast in libraries; degrade gracefully in user-facing services.
- Self-review the diff before claiming done.
- Measure before optimising.
- Surface risks at the start, not at the deadline.

Sources cited inline in the agent body: *Software Engineering at Google*, *Site Reliability Engineering*, *The Pragmatic Programmer*, *Code Complete 2*, *Clean Code*, 12factor.net, Conventional Commits 1.0.0, *The Staff Engineer's Path* (Tanya Reilly).

## Comment philosophy

Twelve rules favouring self-documenting code. Highlights:

- Explain *why*, not *what*.
- Prefer a better identifier over a comment.
- Delete commented-out code on sight.
- Skip doc-blocks on trivial internal helpers; require them on public API surface.
- Structured TODOs only (owner + ticket + trigger).
- No tombstone comments (PR numbers, dates, in-source changelogs).
- Inline comments signal a function that should be decomposed.
- Comments must survive a refactor — or do not write them.
- For AI-assisted workflows, comment *invariants* (concurrency, security, performance budgets), not narration.

Sources cited inline: Linux Kernel Coding Style, *Clean Code*, Rust API Guidelines, PEP 257/8, Google Documentation Best Practices, Addy Osmani's 2026 LLM coding workflow.

## Install

```bash
claude plugin marketplace add github:adrian-d-hidalgo/claude-code-toolkit
# Or, from a local checkout:
# claude plugin marketplace add file:///path/to/claude-code-toolkit
claude plugin install claude-code-development@claude-code-toolkit
```

Once installed, the agent appears as `claude-code-development:software-developer` in `/agents` and auto-invokes when the user requests coding work. Explicit invocation also works:

```text
@"software-developer (agent)" implement function X
```

## When NOT to invoke this agent

The agent self-declines work that has no coding component:

- Pure architecture or technology selection with no code change.
- Code review of someone else's pull request when no change is requested.
- Release- or organisation-level test strategy.
- Security audit or threat model with no implementation step.

If a dedicated framework- or language-specific agent is installed alongside this plugin, prefer that for deep framework-specific work — never assume one exists.

## Activation evaluation

A test corpus lives at [`tests/software-developer/activation-evals.json`](./tests/software-developer/activation-evals.json). Run it against your local `claude` binary:

```bash
python3 scripts/run_activation_evals.py \
  --agent agents/software-developer.md --live --judge
```

Sub-agents are evaluated on **outcome quality** (LLM-as-judge), not routing accuracy. Claude rationally chooses not to delegate to a sub-agent for small coding tasks in `--print` mode (it answers directly because the delegation overhead is not worth it). The judge scores `understood_intent`, `action_appropriate`, and `meta_skill_was_correct_route` per case; the pass gate is the aggregate outcome. A separate `delegation_rate` field reports how often Claude did delegate for positive cases (informational).

## Full system prompt

See [`agents/software-developer.md`](./agents/software-developer.md) for the complete rule set, hard rules, anti-patterns, workflow, and reporting format.
