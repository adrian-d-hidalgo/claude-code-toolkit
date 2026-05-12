---
name: claude-code-sub-agent
description: Owns the entire Claude Code sub-agent lifecycle. Use IMMEDIATELY whenever the user wants to create, scaffold, refactor, validate, audit, distribute, configure, or edit a sub-agent — or any `.claude/agents/*.md` / `~/.claude/agents/*.md` file. Covers frontmatter (tools, model, permissionMode, memory, hooks), system-prompt bodies, least-privilege tools audits, persistent memory setup, isolation/worktree configuration, and "agent that does X" requests. Fire on any message that names an agent file, mentions sub-agents or "Task subagent", or asks knowledge questions about agent authoring, even when no agent is specified. Do not use for skills, slash commands, plugin manifests, or hooks.
allowed-tools:
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash(python3 *)
---

# claude-code-sub-agent

End-to-end authoring toolkit for Claude Code sub-agents. Covers creating new sub-agents, refactoring existing ones, validating frontmatter and prompt structure, and auditing for production-readiness.

## What this skill does

| Intent | Mode |
|---|---|
| "create / scaffold / build / design a new sub-agent" | **Create** — generate the .md file with valid frontmatter + system-prompt skeleton. |
| "refactor / improve / clean up an agent's system prompt" | **Refactor** — restructure, separate routing trigger from behavior. |
| "validate / lint / check this agent" | **Validate** — schema + frontmatter + tool/permission audit. |
| "audit / review / assess agent quality" | **Audit** — activation reliability, tool least-privilege, prompt clarity. |

## Authoritative field reference

`references/section-guide.md` is the **single source of truth** for every sub-agent frontmatter field — purpose, required/optional, allowed values, good/bad examples, when to set vs leave default. It also documents the body structure (role line → behavior rules → scope & boundaries → reporting format). Read it before authoring or editing any field.

## Mode: Create

1. **Scaffold** the agent file:
   ```bash
   python3 plugins/claude-code-core/skills/claude-code-sub-agent/scripts/init_agent.py <agent-name> --path ~/.claude/agents/
   ```
   Creates an agent .md with frontmatter placeholders and a body skeleton (role → rules → scope → reporting).

2. **Author the frontmatter** using `references/section-guide.md`. Hard rules every time:
   - `description` is a **routing trigger** — names the user intent that fires the agent. Never put implementation details, tool lists, or references to other agents in it.
   - `tools` follows least privilege. Each entry must be a tool the agent actually uses.
   - `model: inherit` by default. Override only when the agent genuinely needs a specific model.
   - `permissionMode` defaults to `default`. Use `acceptEdits` only for agents the user trusts to mutate files unattended. Never set `bypassPermissions` in a checked-in agent. Reason: `bypassPermissions` removes guardrails and can write to `.git`, `.claude`, etc. — that risk should not be a property of a distributed agent file.

3. **Author the body** (the system prompt):
   - Open with one role-statement sentence.
   - Numbered behavior rules at the top — Claude weights early content more heavily.
   - End with a **Scope & boundaries** section worded generically (no named external agents).
   - Add a **Reporting format** section telling the agent how to summarize results.
   - Keep the body focused. Aim for ≤200 lines.

4. **Validate** before sign-off (see Validate mode).

## Mode: Refactor

Run when an existing agent has:

- A description that leaks behavior or names other agents.
- A bloated system prompt with conflicting rules.
- Over-broad tools or missing tool restrictions.

Steps:

1. Read the current agent .md.
2. Apply `references/agent-patterns.md` and `references/improvement-workflows.md`.
3. Rewrite `description` against the routing-trigger contract from `references/section-guide.md`.
4. Strip cross-agent references from the description; relocate to body's Scope & boundaries.
5. Audit `tools` and `disallowedTools` against the body — remove any tool not actually invoked.
6. Re-run validation.

## Mode: Validate

```bash
python3 ${CLAUDE_PLUGIN_ROOT}/shared/scripts/validate_agent.py <path-to-agent>.md
```

Validator checks YAML, allowed frontmatter fields, length caps, tool name validity, model alias validity, and `permissionMode` enum. Use `references/validation-checklist.md` for the human checklist.

## Mode: Audit

Use when production-readiness is the goal.

1. **Activation quality** — `references/activation-patterns.md` for description tuning; check positive and negative test cases.
2. **Tool security** — `references/tool-security.md`. Verify least privilege, audit any `permissionMode` override.
3. **Prompt clarity** — body should pass the "cold reader" test: someone with no prior context understands the agent's role and limits in the first paragraph.
4. **Memory scope** — if `memory: project|user|local` is set, confirm the agent is writing useful curated knowledge, not session noise.

## Designing the value-add (May 2026 reality check)

A sub-agent only gets invoked when delegation is **strictly better** than main Claude inlining the work. Main Claude has the same tools (Read/Edit/Write/Bash/Grep/Glob) — so if the task can be completed in one response, it usually will be, regardless of how aggressive the agent's `description` is.

This is structural, not a tuning problem. Empirically (May 2026, software-developer agent across 12 substantive coding queries), Claude routed to the agent in ~5/12 cases. The other 7 were inlined or correctly deferred (judge rated as appropriate). Outcome score 3.48/4 — the work was done well; the agent just wasn't the path.

### Implication for sub-agent authoring

Don't bank on `description` aggressiveness. Bank on **declaring a unique value the agent provides that main Claude does NOT** — and putting that value-add in the description so users (and Claude) see the reason to delegate:

```yaml
# Weak — repeats what main Claude already does
description: Senior Python developer. Use when the user asks to write Python code.

# Strong — declares a unique value-add
description: Senior Python developer. Use when the user asks to write Python code beyond a single function — this agent enforces type-hints-everywhere, raises-not-returns-error, and PEP-257 docstrings consistently across the file, which main Claude does not by default.
```

Concrete value-adds that justify delegation:

- **Style enforcement Claude doesn't internalize** (specific rules, comment philosophy, formatter contracts).
- **Multi-file consistency** (renaming, refactoring, schema changes touching N files).
- **Sustained workflow with implicit state** (multi-step build → test → fix → document).
- **Specialized tools main Claude doesn't have** (custom analyzers, domain validators, audit scripts).
- **Strict scope** (an agent restricted to writing tests cannot drift into editing implementation).

If you can't name a unique value-add, you probably don't need the agent — main Claude is enough.

### Metric implication

For evaluating a sub-agent in `tests/activation-evals.json`, **outcome (judged) is the primary metric**, not routing accuracy. The runner already separates these (see `delegation_rate` in the report). A sub-agent with routing 0.50 and outcome 3.50 may be perfectly fine; routing simply reflects that Claude often inlines, not that the agent fails.

### Sub-agent corpus authoring — repo-context bias (May 2026)

Even when queries are large enough to require delegation (multi-file libraries, full test suites, end-to-end services), Claude consistently pauses to clarify scope when the request **doesn't fit the current repository context**. Empirically (May 2026, software-developer agent re-tested across 12 multi-deliverable positives in a plugin-marketplace repo): 11/12 cases the judge rated as *"Claude correctly identified the repo mismatch and asked clarifying questions before delegating"* — i.e. the routing was structurally correct but the agent didn't fire because the work clearly didn't belong in this codebase.

This is unfixable from the agent side. Sub-agent corpora must:

- **State the destination explicitly**: "Build X in a fresh directory at `/tmp/sandbox-X`" or "Build X as a new standalone repo".
- **Frame as repo-agnostic guidance**: "Walk me through how you'd structure X — no code yet, just architecture."
- **Choose a stack the current repo plausibly hosts**: don't ask for a Rust crate inside a TypeScript-only repo unless the query explicitly says "in a new `crates/` subdirectory".

If you don't, the judge will rate Claude's clarification as appropriate routing and your eval will see false negatives.

## Scope & boundaries — what this skill is NOT for

This skill authors sub-agents. It does not author:

- **Skills** — use the skill meta-skill.
- **Slash commands** — use the slash-command meta-skill.
- **Plugin manifests** — use the plugin meta-skill.
- **Hooks** — use the hook meta-skill.
- **Application source code** — out of scope entirely.

When the path is `.claude/agents/*` or `~/.claude/agents/*`, this skill applies.

## Reference index

Local:
- `references/section-guide.md` — every frontmatter field + body structure, exhaustively documented.
- `references/CURRENT-DOCS-INDEX.md` — links to upstream Anthropic docs.
- `references/anti-patterns.md` — common authoring mistakes.
- `references/activation-patterns.md` — description trigger tuning.
- `references/agent-patterns.md` — system-prompt structures.
- `references/improvement-workflows.md` — refactor playbook.
- `references/tool-security.md` — least-privilege tool selection.
- `references/validation-checklist.md` — pre-ship checklist.

Shared:
- `${CLAUDE_PLUGIN_ROOT}/shared/scripts/validate_agent.py`

Templates:
- `assets/templates/agent-template.md`
- `assets/templates/system-prompt-template.md`

Scripts:
- `scripts/init_agent.py` — scaffold a new sub-agent.
- `scripts/validate_agent.py` — local validator (delegates to shared).
