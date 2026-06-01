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

## No tool-surface inventory before opining

**Pattern**: A sub-agent body jumps straight from intake into hypothesis / recommendation / design without surveying the project's available tooling — linter, type-checker, test runner, profiler, code-intelligence MCP (`mcp__codegraph__*`), observability MCPs, project scripts (`make`, `just`, `npm run *`). It then proposes generic strategy, runs ad-hoc greps instead of structural queries, or recommends adopting a tool the project already has installed.

**Why wrong**: A sub-agent that improvises without inventorying produces lower-signal output and frequently fabricates tool names. The repo almost always has more tooling than the agent assumes; missing it duplicates work and misses the project's canonical entry points. May 2026: in the `claude-code-development` plugin, 3 of 8 sub-agents (debugger, code-reviewer, data-engineer) had explicit tool-discovery protocols, 2 had partial guidance, and 3 had none — the absence produced abstract strategy in the latter group. Note: plugin sub-agents cannot access MCP tools as of June 2026 (issue [#13605](https://github.com/anthropics/claude-code/issues/13605)); inventory still documents the MCP surface for the calling agent (which can use MCPs), so the agent surfaces concrete next-step queries instead of fabricating calls.

**Fix**: Every sub-agent that opines, recommends, or designs gets a short `## Tool-surface inventory` section (or equivalent) in its body. The protocol is the same across agents — detect the stack from artefacts, read `CLAUDE.md` / `AGENTS.md`, enumerate `mcp__<server>__*` tool names, verify binaries before invoking. For an engineering-team plugin, extract the protocol to a plugin-root reference (`plugins/<plugin>/references/tool-surface-inventory.md`) and link from each agent body — the discipline-specific tool families live in the agent body, the protocol lives in the reference.

## Fabricating MCP / vendor tool names that are not registered in the session

**Pattern**: A sub-agent body says "call `mcp__sentry__search_issues` to find recent occurrences" without first checking whether `mcp__sentry__*` tools are actually registered in the session, or recommends "use the Datadog MCP to query logs" because the user mentioned Datadog. The agent invents the call instead of confirming presence.

**Why wrong**: Fabrication is the dominant LLM failure mode for tool selection — plausible-but-wrong MCP/vendor names look correct in the body and look correct at invocation time, but produce silent failures or, worse, hallucinated outputs the agent then reasons over. The session's actual tool registry is the only source of truth; "the user probably has X" is not evidence.

**Fix**: Hard rule in the body: *"Verify the MCP / tool is actually registered in the session before invoking. If the user mentioned a vendor but no `mcp__<vendor>__*` is registered, ask one ≤20-word question — never invent the call."* For agents that consult external systems during analysis (debugger, security-engineer, data-engineer, code-planner), this rule belongs in the Hard rules section, not as soft guidance. Consolidate via a plugin-root reference (`tool-surface-inventory.md`) when multiple agents share the rule, so the wording stays consistent and the rule survives copy-paste drift.

## Defaulting `effort` to `max`

**Pattern**: Author writes `effort: max` thinking "more reasoning = better outputs," either as a blanket default for "important" agents or because they didn't know the warning exists.

**Why wrong**: Anthropic docs explicitly warn that `max` "may show diminishing returns and is **prone to overthinking**. Test before adopting broadly." Benchmark data (AIME, SWE-bench) shows the gap between `xhigh` and `max` is much smaller than between `medium` and `high`. `max` also costs 2.5–4× the tokens of `medium` and runs 2–4× slower. Defaulting to `max` wastes budget, increases latency, and can degrade output quality through overthinking.

**Fix**: Use the tier-appropriate default from `references/model-effort-matrix.md` — tier A/B agents go to `xhigh`, tier C to `high`, tier D to `medium`. Reserve `max` for one-shot, high-stakes invocations where your own evals show measurable headroom past `xhigh` on your specific task corpus.

## Pairing `effort: xhigh` with `model: inherit` or `model: sonnet`

**Pattern**: Author sets `effort: xhigh` because the docs recommend it as Opus's default, but leaves `model: inherit` (or pins `model: sonnet`) for portability or because the default was already there.

**Why wrong**: `xhigh` only exists on Opus. It is not a valid effort level on Sonnet. If `model: inherit` and the session runs on Sonnet (Pro tier, non-Max user, or user who switched models), the agent fails. `xhigh` and `model: opus` are coupled — you cannot ship one without the other.

**Fix**: When using `effort: xhigh`, always pin `model: opus` explicitly in the same frontmatter. If portability across model tiers matters more than the `xhigh` ceiling, demote to `model: sonnet, effort: high` (the universally-safe intelligence-sensitive default).

## Demoting intelligence-sensitive execution to `effort: medium`

**Pattern**: Author thinks "this agent just applies rules from the system prompt — it doesn't need to think, so `medium` is fine." Common for code-writing or refactoring agents whose prompts encode strong rule frameworks (engineering rules, style guides, comment philosophy).

**Why wrong**: Anthropic docs frame `high` as the **minimum** for intelligence-sensitive work. Applying a rule framework requires judgment — "is this duplication legitimate or rule-of-three?", "fail-fast or graceful degradation here?", "does this refactor preserve semantics?". These are reasoning decisions, not pattern-matching. Demoting to `medium` trades off intelligence the docs explicitly warn against trading off; the cost saving is modest (~30%), the quality drop on edge cases can be large.

**Fix**: If a senior engineer would have to think — even briefly — to do the task, the agent belongs on `high` (Sonnet) or `xhigh` (Opus). Only demote to `medium` when the work is genuinely mechanical: regex transformations, syntax conversion, formatting. The line is whether judgment is involved, not whether rules are written down.
