# Anti-patterns — sub-agent authoring

## Description-as-summary

**Pattern**: `description: Reviews code, identifies bugs, and suggests improvements using static analysis.`

**Why wrong**: Tells Claude what the agent does, not when to invoke it. Implementation detail (static analysis) leaks into the routing field.

**Fix**: `description: Reviews code for quality and security. Use proactively after the user finishes writing or modifying code.`

## Cross-agent references in description

**Pattern**: `description: …Do NOT use for architecture (delegate to software-architect) or test strategy (delegate to quality-engineer).`

**Why wrong**: Couples the agent to specific siblings that may not exist in every installation. Pollutes the routing signal.

**Fix**: Move the negative scope to the body's "Scope & boundaries" section, worded generically: "Decline tasks with no coding component (pure architecture, test strategy at org level, security audits with no implementation step)."

## Tool overreach

**Pattern**: Agent omits `tools:` entirely, inheriting everything from the parent, despite only needing Read and Grep.

**Why wrong**: The agent now has Write, Edit, Bash, all MCP tools — any of which can be invoked on a slip. Least privilege is broken.

**Fix**: Explicitly list `tools: Read, Grep, Glob`. Never default to inheriting everything for a focused agent.

## `bypassPermissions` in distributed agent

**Pattern**: `permissionMode: bypassPermissions` in an agent that ships in a plugin or user-level config.

**Why wrong**: Removes guardrails; can write to `.git`, `.claude`, etc. Anyone who installs the plugin runs an agent with no permission checks.

**Fix**: Use `default` or `acceptEdits`. If automation truly needs `bypassPermissions`, set it at runtime via `--permission-mode`, not in the agent file.

## Bloated system prompt

**Pattern**: 600-line body covering every edge case the author could imagine.

**Why wrong**: Sub-agents start fresh with only their body as system prompt. Bloat hurts attention and inflates per-invocation context.

**Fix**: Body ≤200 lines. Push playbooks into `references/` or into a preloaded skill via the `skills:` field.

## Memory without curation instructions

**Pattern**: `memory: project` set, but the body never tells the agent to read or write `MEMORY.md`.

**Why wrong**: Memory only helps if the agent uses it. Without instructions, it accumulates dead notes or stays empty.

**Fix**: Add explicit "Before starting: read your MEMORY.md. After finishing: update MEMORY.md with new patterns you discovered. Curate aggressively if MEMORY.md exceeds 200 lines."

## Description starts with the agent's name

**Pattern**: `description: code-reviewer is a sub-agent that reviews code…`

**Why wrong**: Wastes the most valuable characters on self-reference. The orchestrator already has the name; it needs the trigger.

**Fix**: Lead with the verb. `description: Reviews code for quality, security, and maintainability. Use proactively after code changes.`

## Negative scope by named external agent

**Pattern**: Body: "If asked about Angular, hand off to angular-developer."

**Why wrong**: Couples this agent to a specific peer. If `angular-developer` isn't installed in the user's environment, the hand-off advice is wrong.

**Fix**: "If the task is deeply framework-specific and a dedicated framework agent is available in the user's environment, suggest it. Never assume one exists."

## Trigger language in body

**Pattern**: Body's first line is "Use this agent when the user wants code reviewed."

**Why wrong**: That sentence belongs in `description`. The body is what the agent sees as its system prompt — it should describe behavior, not invocation conditions.

**Fix**: Move trigger language to `description`. Open the body with the role statement.

## First-person voice

**Pattern**: "I am a code reviewer. I will look at your changes and…"

**Why wrong**: Reads as marketing. Standard pattern is second-person ("You are…") or imperative.

**Fix**: "You are a senior code reviewer ensuring high standards of code quality and security."
